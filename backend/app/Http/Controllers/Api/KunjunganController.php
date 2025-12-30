<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VisitForm;
use App\Models\FamilyForm;
use App\Models\FamilyMember;
use App\Models\KepuasanAnswer;
use App\Models\Relawan;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Exception;

class KunjunganController extends Controller
{
    /**
     * CREATE KUNJUNGAN (STEP 1)
     * Alamat didapat dari reverse geocoding koordinat GPS
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'nama'         => 'required|string|max:255',
                'nik'          => [
                    'required',
                    'digits:16',
                    'unique:kunjungan_forms,nik',
                    function ($attribute, $value, $fail) {
                        if (DB::table('keluarga_members')->where('nik', $value)->exists()) {
                            $fail('NIK sudah terdaftar sebagai anggota keluarga.');
                        }
                    },
                ],
                'tanggal' => [
                    'required',
                    'date',
                    'before_or_equal:' . Carbon::now()->subYears(17)->format('Y-m-d'),
                ],
                'pendidikan'   => 'required|in:SD,SMP,SMA/SMK,D3,S1,S2+',
                'pekerjaan'    => 'required|string|max:255',
                'penghasilan'  => 'required|string|max:100',
                'foto_ktp'     => 'required|image|mimes:jpg,jpeg,png|max:5120',
                'alamat'       => 'required|string|min:10',
                'latitude'     => 'required|numeric|between:-90,90',
                'longitude'    => 'required|numeric|between:-180,180',
                'offline_id'   => 'nullable|string|unique:kunjungan_forms,offline_id',
            ], [
                'nik.unique' => 'NIK sudah terdaftar dalam sistem',
                'nik.digits' => 'NIK harus 16 digit',
                'nik.required' => 'NIK wajib diisi',
                'tanggal.before_or_equal' => 'Umur minimal harus 17 tahun',
                'alamat.min' => 'Alamat minimal 10 karakter',
                'latitude.required' => 'Koordinat GPS diperlukan',
                'longitude.required' => 'Koordinat GPS diperlukan',
                'foto_ktp.required' => 'Foto KTP wajib dilampirkan',
                'foto_ktp.image' => 'File harus berupa gambar',
                'foto_ktp.mimes' => 'Format foto harus JPG, JPEG, atau PNG',
                'foto_ktp.max' => 'Ukuran foto maksimal 5MB',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validasi gagal',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();
            try {
                $file = $request->file('foto_ktp');

                if (!$file || !$file->isValid()) {
                    throw new Exception('File foto KTP tidak valid');
                }

                // Simpan foto KTP dengan nama unik
                $fileName = 'ktp_' . $request->nik . '_' . time() . '.' . $file->extension();
                $fotoPath = $file->storeAs('ktp', $fileName, 'public');

                if (!$fotoPath) {
                    throw new Exception('Gagal menyimpan foto KTP');
                }

                $user = auth()->user();
                $relawan = $user->relawan;

                $relawan_id = null;
                $task_id = null;
                $campaign_id = null;

                if ($relawan) {
                    $relawan_id = $relawan->id;
                    // Coba cari tugas yang sedang berjalan untuk relawan ini
                    $activeTask = Task::where('relawan_id', $relawan_id)
                        ->where('status', '!=', 'completed')
                        ->latest()
                        ->first();

                    if ($activeTask) {
                        $task_id = $activeTask->id;
                        $campaign_id = $activeTask->campaign_id;
                    } else {
                        // Fallback: cari campaign dari campaign_relawans
                        $campaignRelawan = \App\Models\CampaignRelawan::where('relawan_id', $relawan_id)->first();
                        if ($campaignRelawan) {
                            $campaign_id = $campaignRelawan->campaign_id;
                        }
                    }
                }

                // Simpan data kunjungan
                $kunjungan = VisitForm::create([
                    'task_id'     => $task_id,
                    'relawan_id'  => $relawan_id,
                    'campaign_id' => $campaign_id,
                    'nama'        => $request->nama,
                    'nik'         => $request->nik,
                    'tanggal'     => $request->tanggal,
                    'umur'        => \Carbon\Carbon::parse($request->tanggal)->age,
                    'pendidikan'  => $request->pendidikan,
                    'pekerjaan'   => $request->pekerjaan,
                    'penghasilan' => $request->penghasilan,
                    'foto_ktp'    => $fotoPath,
                    'alamat'      => $request->alamat,
                    'latitude'    => $request->latitude,
                    'longitude'   => $request->longitude,
                    'offline_id'  => $request->offline_id,
                    'status'      => 'draft',
                    'status_verifikasi' => 'pending',
                    'created_by'  => $user->id,
                ]);

                // Otomatis buat record FamilyForm
                $familyForm = FamilyForm::create([
                    'kunjungan_id' => $kunjungan->id,
                    'alamat_keluarga' => $request->alamat,
                    'jumlah_anggota_memiliki_ktp' => 0
                ]);

                DB::commit();

                Log::info('Kunjungan created successfully', [
                    'id' => $kunjungan->id,
                    'nik' => $kunjungan->nik,
                    'user_id' => auth()->id(),
                    'gps' => ['lat' => $request->latitude, 'lon' => $request->longitude]
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Data kunjungan berhasil disimpan',
                    'data' => $kunjungan->load('familyForm')
                ], 201);
            } catch (Exception $e) {
                DB::rollBack();

                // Hapus foto jika ada error
                if (isset($fotoPath) && Storage::disk('public')->exists($fotoPath)) {
                    Storage::disk('public')->delete($fotoPath);
                }

                Log::error('Create kunjungan failed', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'user_id' => auth()->id(),
                    'data' => $request->except('foto_ktp')
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Gagal menyimpan data kunjungan: ' . $e->getMessage(),
                    'error' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan server'
                ], 500);
            }
        } catch (Exception $e) {
            Log::error('Store kunjungan outer catch', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * TAMBAH ANGGOTA KELUARGA (STEP 2)
     */
    public function tambahAnggota(Request $request, $kunjungan_id)
    {
        Log::info('tambahAnggota called', ['kunjungan_id' => $kunjungan_id, 'data' => $request->except('foto_ktp')]);
        try {
            $kunjungan = VisitForm::find($kunjungan_id);

            if (!$kunjungan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data kunjungan tidak ditemukan'
                ], 404);
            }

            if ($kunjungan->status === 'completed') {
                // Allow editing even if already completed
                Log::info('Adding member to already completed visit', ['kunjungan_id' => $kunjungan_id]);
            }

            $validator = Validator::make($request->all(), [
                'nama' => 'required|string|max:255',
                'nik' => [
                    'required',
                    'digits:16',
                    function ($attribute, $value, $fail) {
                        if (DB::table('kunjungan_forms')->where('nik', $value)->exists()) {
                            $fail('NIK identik dengan kepala keluarga yang sudah terdaftar.');
                        }
                        if (DB::table('keluarga_members')->where('nik', $value)->exists()) {
                            $fail('NIK sudah terdaftar sebagai anggota keluarga lain.');
                        }
                    },
                ],
                'tanggal_lahir' => [
                    'required',
                    'date',
                    'before_or_equal:' . Carbon::now()->subYears(17)->format('Y-m-d'),
                ],
                'hubungan' => 'required|in:ayah,ibu,anak,lainnya',
                'pekerjaan' => 'nullable|string|max:255',
                'pendidikan' => 'required|string',
                'penghasilan' => 'required|string',
                'foto_ktp' => 'nullable|file|mimes:jpg,jpeg,png,webp|max:5120'
            ], [
                'nama.required' => 'Nama anggota keluarga wajib diisi',
                'tanggal_lahir.required' => 'Tanggal lahir wajib diisi',
                'tanggal_lahir.date' => 'Format tanggal lahir tidak valid',
                'hubungan.required' => 'Hubungan keluarga wajib dipilih',
                'hubungan.in' => 'Hubungan keluarga tidak valid',
                'pendidikan.required' => 'Pendidikan wajib diisi',
                'penghasilan.required' => 'Penghasilan wajib diisi',
                'foto_ktp.required' => 'Foto KTP anggota keluarga wajib dilampirkan',
                'foto_ktp.image' => 'File harus berupa gambar',
                'foto_ktp.max' => 'Ukuran foto maksimal 5MB'
            ]);

            if ($validator->fails()) {
                Log::warning('Validation failed for tambahAnggota', [
                    'kunjungan_id' => $kunjungan_id,
                    'errors' => $validator->errors()->toArray()
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Validasi gagal',
                    'errors' => $validator->errors()
                ], 422);
            }

            $familyForm = FamilyForm::where('kunjungan_id', $kunjungan_id)->first();

            if (!$familyForm) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data keluarga tidak ditemukan'
                ], 404);
            }

            DB::beginTransaction();

            $fotoPath = null;
            if ($request->hasFile('foto_ktp')) {
                $file = $request->file('foto_ktp');
                $fileName = 'ktp_anggota_' . time() . '_' . uniqid() . '.' . $file->extension();
                $fotoPath = $file->storeAs('ktp', $fileName, 'public');
            }

            $anggota = $familyForm->members()->create([
                'nama' => $request->nama,
                'nik' => $request->nik,
                'tanggal_lahir' => $request->tanggal_lahir,
                'umur' => \Carbon\Carbon::parse($request->tanggal_lahir)->age,
                'hubungan' => $request->hubungan,
                'pekerjaan' => $request->pekerjaan,
                'pendidikan' => $request->pendidikan,
                'penghasilan' => $request->penghasilan,
                'foto_ktp' => $fotoPath
            ]);

            DB::commit();

            Log::info('Anggota keluarga added', [
                'kunjungan_id' => $kunjungan_id,
                'anggota_id' => $anggota->id,
                'nama' => $anggota->nama
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Anggota keluarga berhasil ditambahkan',
                'data' => $anggota
            ], 201);
        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Add anggota failed', [
                'kunjungan_id' => $kunjungan_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal menambahkan anggota keluarga',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * SELESAIKAN KUNJUNGAN (STEP 3)
     */
    public function selesaikanKunjungan(Request $request, $kunjungan_id)
    {
        DB::beginTransaction();
        try {
            $kunjungan = VisitForm::with('familyForm.members')->find($kunjungan_id);

            if (!$kunjungan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data kunjungan tidak ditemukan'
                ], 404);
            }

            $updateData = [
                'status' => 'pending',
                'status_verifikasi' => 'pending',
                'completed_by' => auth()->id(),
            ];

            if (!$kunjungan->completed_at) {
                $updateData['completed_at'] = now();
            }

            if ($request->has('score')) {
                $updateData['score'] = $request->score;
            }

            $kunjungan->update($updateData);

            $request->validate([
                'harapan' => 'nullable|string',
            ]);

            // Save survey answers
            $kunjungan->kepuasan()->updateOrCreate(
                ['kunjungan_id' => $kunjungan->id],
                $request->only([
                    'tau_paslon',
                    'tau_informasi',
                    'tau_visi_misi',
                    'tau_program_kerja',
                    'tau_rekam_jejak',
                    'pernah_dikunjungi',
                    'percaya',
                    'harapan',
                    'pertimbangan',
                    'ingin_memilih'
                ])
            );

            DB::commit();

            Log::info('Kunjungan completed successfully', [
                'id' => $kunjungan_id,
                'score' => $request->score,
                'jumlah_anggota' => $kunjungan->familyForm->members()->count(),
                'completed_by' => auth()->id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Kunjungan berhasil diselesaikan',
                'data' => $kunjungan->fresh(['familyForm.members'])
            ]);
        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Complete kunjungan failed', [
                'id' => $kunjungan_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal menyelesaikan kunjungan',
                'error' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan server'
            ], 500);
        }
    }

    /**
     * GET DETAIL KUNJUNGAN (Opsional - untuk review sebelum submit)
     */
    public function show($kunjungan_id)
    {
        try {
            $kunjungan = VisitForm::with(['familyForm.members', 'relawan', 'campaign', 'task', 'kepuasan'])->find($kunjungan_id);

            if (!$kunjungan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data kunjungan tidak ditemukan'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $kunjungan
            ]);
        } catch (Exception $e) {
            Log::error('Get kunjungan detail failed', [
                'id' => $kunjungan_id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data kunjungan',
                'error' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan server'
            ], 500);
        }
    }

    /**
     * LIST KUNJUNGAN (Opsional)
     */
    public function index(Request $request)
    {
        try {
            $query = VisitForm::with(['relawan', 'campaign', 'task', 'kepuasan', 'familyForm' => function ($q) {
                $q->withCount('members');
            }])
                ->where('created_by', auth()->id());

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Search
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('nama', 'like', "%{$search}%")
                        ->orWhere('nik', 'like', "%{$search}%");
                });
            }

            $kunjungan = $query->orderBy('created_at', 'desc')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'success' => true,
                'data'    => $kunjungan
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $kunjungan = VisitForm::find($id);

            if (!$kunjungan) {
                return response()->json(['success' => false, 'message' => 'Data tidak ditemukan'], 404);
            }

            $validator = Validator::make($request->all(), [
                'nama'         => 'required|string|max:255',
                'nik'          => [
                    'required',
                    'digits:16',
                    function ($attribute, $value, $fail) use ($id) {
                        if (DB::table('kunjungan_forms')->where('nik', $value)->where('id', '!=', $id)->exists()) {
                            $fail('NIK sudah terdaftar sebagai kepala keluarga lain.');
                        }
                        if (DB::table('keluarga_members')->where('nik', $value)->exists()) {
                            $fail('NIK sudah terdaftar sebagai anggota keluarga.');
                        }
                    },
                ],
                'tanggal' => [
                    'required',
                    'date',
                    'before_or_equal:' . Carbon::now()->subYears(17)->format('Y-m-d'),
                ],
                'pendidikan'   => 'required|in:SD,SMP,SMA/SMK,D3,S1,S2+',
                'pekerjaan'    => 'required|string|max:255',
                'penghasilan'  => 'required|string|max:255',
                'alamat'       => 'required|string',
                'latitude'     => 'nullable',
                'longitude'    => 'nullable',
                'foto_ktp'     => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
            ]);

            if ($validator->fails()) {
                return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
            }

            $data = $request->only(['nama', 'nik', 'tanggal', 'pendidikan', 'pekerjaan', 'penghasilan', 'alamat', 'latitude', 'longitude']);
            $data['umur'] = \Carbon\Carbon::parse($request->tanggal)->age;

            if ($request->hasFile('foto_ktp')) {
                if ($kunjungan->foto_ktp) {
                    Storage::disk('public')->delete($kunjungan->foto_ktp);
                }
                $path = $request->file('foto_ktp')->store('kunjungan/ktp', 'public');
                $data['foto_ktp'] = $path;
            }

            $kunjungan->update($data);

            return response()->json([
                'success' => true,
                'message' => 'Data kepala keluarga berhasil diperbarui',
                'data' => $kunjungan
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $kunjungan = VisitForm::find($id);

            if (!$kunjungan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data tidak ditemukan'
                ], 404);
            }

            // Hapus foto KTP jika ada
            if ($kunjungan->foto_ktp) {
                Storage::disk('public')->delete($kunjungan->foto_ktp);
            }

            // Hapus anggota keluarga (otomatis terhapus jika di db pakai cascade, tapi manual lebih aman)
            if ($kunjungan->familyForm) {
                foreach ($kunjungan->familyForm->members as $member) {
                    if ($member->foto_ktp) {
                        Storage::disk('public')->delete($member->foto_ktp);
                    }
                }
                $kunjungan->familyForm->delete();
            }

            // Hapus jawaban kuisioner
            if ($kunjungan->kepuasan) {
                $kunjungan->kepuasan->delete();
            }

            $kunjungan->delete();

            return response()->json([
                'success' => true,
                'message' => 'Data kunjungan berhasil dihapus'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function updateAnggota(Request $request, $id)
    {
        try {
            $anggota = FamilyMember::find($id);
            if (!$anggota) {
                return response()->json(['success' => false, 'message' => 'Anggota tidak ditemukan'], 404);
            }

            $validator = Validator::make($request->all(), [
                'nama' => 'required|string|max:255',
                'nik' => [
                    'required',
                    'digits:16',
                    function ($attribute, $value, $fail) use ($id) {
                        if (DB::table('kunjungan_forms')->where('nik', $value)->exists()) {
                            $fail('NIK identik dengan kepala keluarga.');
                        }
                        if (DB::table('keluarga_members')->where('nik', $value)->where('id', '!=', $id)->exists()) {
                            $fail('NIK sudah terdaftar sebagai anggota keluarga lain.');
                        }
                    },
                ],
                'tanggal_lahir' => [
                    'required',
                    'date',
                    'before_or_equal:' . Carbon::now()->subYears(17)->format('Y-m-d'),
                ],
                'hubungan' => 'required|in:ayah,ibu,anak,lainnya',
                'pekerjaan' => 'nullable|string|max:255',
                'pendidikan' => 'required|string',
                'penghasilan' => 'required|string',
                'foto_ktp' => 'nullable|file|mimes:jpg,jpeg,png,webp|max:5120'
            ]);

            if ($validator->fails()) {
                return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
            }

            $data = $request->except(['foto_ktp']);
            $data['umur'] = \Carbon\Carbon::parse($request->tanggal_lahir)->age;

            if ($request->hasFile('foto_ktp')) {
                if ($anggota->foto_ktp) {
                    Storage::disk('public')->delete($anggota->foto_ktp);
                }
                $path = $request->file('foto_ktp')->store('kunjungan/anggota', 'public');
                $data['foto_ktp'] = $path;
            }

            $anggota->update($data);

            return response()->json([
                'success' => true,
                'message' => 'Data anggota berhasil diperbarui',
                'data' => $anggota
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function hapusAnggota($id)
    {
        try {
            $anggota = FamilyMember::find($id);
            if (!$anggota) {
                return response()->json(['success' => false, 'message' => 'Anggota tidak ditemukan'], 404);
            }

            if ($anggota->foto_ktp) {
                Storage::disk('public')->delete($anggota->foto_ktp);
            }

            $anggota->delete();

            return response()->json([
                'success' => true,
                'message' => 'Anggota berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
