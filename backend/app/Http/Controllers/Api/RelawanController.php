<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Models\Relawan;
use App\Models\VisitForm;
use App\Models\Coordinator;
use Illuminate\Support\Str;
use App\Helpers\PhoneHelper;
use Illuminate\Http\Request;
use App\Exports\RelawanExport;
use App\Imports\RelawanImport;
use App\Helpers\ActivityLogger;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Validator;

class RelawanController extends Controller
{

    public function index(Request $request)
    {
        $user = Auth::user();

        $query = Relawan::with([
            'province:province_code,province',
            'city:city_code,city',
            'district:district_code,district',
            'village:village_code,village',
            'koordinator:id,nama'
        ])->withCount('visitForms');;

        if ($user->role === 'koordinator') {
            if (!$user->koordinator) {
                return response()->json([
                    'status' => false,
                    'message' => 'Akun koordinator belum terdaftar'
                ], 403);
            }

            $query->where('koordinator_id', $user->koordinator->id);
        }

        if ($request->city_code) {
            $query->where('city_code', $request->city_code);
        }

        if ($request->district_code) {
            $query->where('district_code', $request->district_code);
        }

        if ($request->village_code) {
            $query->where('village_code', $request->village_code);
        }

        if ($request->nama) {
            $query->where('nama', 'like', '%' . $request->nama . '%');
        }

        if ($request->nik) {
            $query->where('nik', 'like', '%' . $request->nik . '%');
        }

        if ($request->tps) {
            $query->where('tps', $request->tps);
        }

        $relawans = $query->get();

        if ($relawans->isEmpty()) {
            return response()->json([
                'status'  => true,
                'message' => 'Belum ada data relawan',
                'data'    => []
            ]);
        }

        return response()->json([
            'status' => true,
            'data'   => $relawans
        ]);
    }

    public function show($id)
    {
        $user = Auth::user();

        $relawan = Relawan::with([
            'province:province_code,province',
            'city:city_code,city',
            'district:district_code,district',
            'village:village_code,village',
            'ormas',
            'user',
            'koordinator:id,nama'
        ])->find($id);

        if (!$relawan) {
            return response()->json([
                'status' => false,
                'message' => 'Relawan tidak ditemukan'
            ], 404);
        }

        if ($user->role === 'koordinator') {
            if (!$user->koordinator || $relawan->koordinator_id !== $user->koordinator->id) {
                return response()->json([
                    'status' => false,
                    'message' => 'Anda tidak berhak melihat relawan ini'
                ], 403);
            }
        }

        return response()->json([
            'status' => true,
            'data' => $relawan
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $koordinator = $user->koordinator;

        if (!$koordinator) {
            return response()->json([
                'status' => false,
                'message' => 'Akun koordinator tidak valid'
            ], 403);
        }

        if (Relawan::where('koordinator_id', $koordinator->id)->count() >= 20) {
            return response()->json([
                'status' => false,
                'message' => 'Maksimal 20 relawan untuk setiap koordinator'
            ], 422);
        }

        $request->merge([
            'no_hp' => PhoneHelper::normalize($request->no_hp),
        ]);

        $validator = Validator::make($request->all(), [
            'nama' => [
                'required',
                'string',
                'max:255',
                'regex:/^[^0-9]+$/'
            ],
            'nik' => [
                'required',
                'digits:16',
                function ($attribute, $value, $fail) {
                    $existsRelawan     = \App\Models\Relawan::where('nik', $value)->exists();
                    $existsKoordinator = \App\Models\Coordinator::where('nik', $value)->exists();

                    if ($existsRelawan || $existsKoordinator) {
                        $fail('NIK sudah terdaftar sebagai relawan atau koordinator');
                    }
                }
            ],
            'no_hp' => [
                'required',
                'digits_between:10,13',
                function ($attribute, $value, $fail) {
                    if (str_starts_with($value, '021')) {
                        $fail('Nomor telepon rumah (021) tidak diperbolehkan');
                    }
                }
            ],
            'alamat'   => 'required|string|max:255',
            'tps'      => 'required|string|max:3',
            'ormas_id' => 'nullable|exists:ormas,id',
        ], [
            'nama.regex' => 'Nama tidak boleh mengandung angka'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $result = DB::transaction(function () use ($request, $koordinator) {

            $nameClean = strtolower(str_replace(' ', '', $request->nama));
            $email = $nameClean . rand(1000, 9999) . '@gmail.com';
            $passwordPlain = $nameClean . rand(1000, 9999);

            $userRelawan = User::create([
                'name'           => $request->nama,
                'nik'            => $request->nik,
                'email'          => $email,
                'password'       => Hash::make($passwordPlain),
                'plain_password' => $passwordPlain,
                'role'           => 'relawan',
                'status'         => 'inactive',
            ]);

            $relawan = Relawan::create([
                'user_id'        => $userRelawan->id,
                'koordinator_id' => $koordinator->id,
                'ormas_id'       => $request->ormas_id,
                'province_code'  => $koordinator->province_code,
                'city_code'      => $koordinator->city_code,
                'district_code'  => $koordinator->district_code,
                'village_code'   => $koordinator->village_code,
                'nama'           => $request->nama,
                'nik'            => $request->nik,
                'no_hp'          => $request->no_hp,
                'alamat'         => $request->alamat,
                'tps'            => $request->tps,
                'status'         => 'inactive',
            ]);

            $relawan->load(['province', 'city', 'district', 'village']);

            ActivityLogger::log([
                'action'      => 'CREATE',
                'target_type' => 'relawan',
                'target_name' => $relawan->nama,
                'meta' => [
                    'provinsi'  => $relawan->province->province ?? null,
                    'kota'      => $relawan->city->city ?? null,
                    'kecamatan' => $relawan->district->district ?? null,
                    'kelurahan' => $relawan->village->village ?? null,
                ]
            ]);

            return [
                'relawan'  => $relawan,
                'email'    => $email,
                'password' => $passwordPlain,
            ];
        });

        return response()->json([
            'status' => true,
            'message' => 'Relawan berhasil ditambahkan',
            'data' => [
                'relawan' => $result['relawan'],
                'user' => [
                    'email'    => $result['email'],
                    'password' => $result['password'],
                ]
            ]
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = Auth::user();

        $relawan = Relawan::with(['koordinator'])->find($id);
        if (!$relawan) {
            return response()->json([
                'status' => false,
                'message' => 'Relawan tidak ditemukan'
            ], 404);
        }

        if ($user->role === 'koordinator') {
            if (!$user->koordinator || $relawan->koordinator_id !== $user->koordinator->id) {
                return response()->json([
                    'status' => false,
                    'message' => 'Anda tidak berhak mengubah relawan ini'
                ], 403);
            }
        }

        $validator = Validator::make($request->all(), [
            'nama' => [
                'required',
                'string',
                'max:255',
                'regex:/^[^0-9]+$/'
            ],
            'nik' => [
                'required',
                'digits:16',
                function ($attribute, $value, $fail) use ($relawan) {
                    $existsRelawan = \App\Models\Relawan::where('nik', $value)
                        ->where('id', '!=', $relawan->id)
                        ->exists();

                    $existsKoordinator = \App\Models\Coordinator::where('nik', $value)->exists();

                    if ($existsRelawan || $existsKoordinator) {
                        $fail('NIK sudah terdaftar sebagai relawan atau koordinator');
                    }
                }
            ],
            'no_hp' => [
                'required',
                'digits_between:10,13',
                function ($attribute, $value, $fail) {
                    if (str_starts_with($value, '021')) {
                        $fail('Nomor telepon rumah (021) tidak diperbolehkan');
                    }
                }
            ],
            'alamat'   => 'required|string|max:255',
            'tps'      => 'required|string|max:3',
            'ormas_id' => 'nullable|exists:ormas,id',
        ], [
            'nama.regex' => 'Nama tidak boleh mengandung angka'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $newEmail = null;
        $newPasswordPlain = null;

        $oldData = $relawan->only([
            'nama',
            'no_hp',
            'alamat',
            'tps',
            'ormas_id',
        ]);

        $relawan->update([
            'nama'     => $request->nama,
            'no_hp'    => $request->no_hp,
            'alamat'   => $request->alamat,
            'tps'      => $request->tps,
            'ormas_id' => $request->ormas_id,
        ]);

        if ($relawan->user) {

            $nameClean = strtolower(str_replace(' ', '', $request->nama));
            $newEmail = $nameClean . rand(1000, 9999) . '@gmail.com';
            $newPasswordPlain = $nameClean . rand(1000, 9999);

            $relawan->user->update([
                'name'           => $request->nama,
                'email'          => $newEmail,
                'password'       => Hash::make($newPasswordPlain),
                'plain_password' => $newPasswordPlain,
            ]);
        }

        foreach ($oldData as $field => $oldValue) {
            $newValue = $relawan->$field;

            if ($oldValue != $newValue) {
                ActivityLogger::log([
                    'action'      => 'UPDATE',
                    'target_type' => 'relawan',
                    'target_name' => $relawan->nama,
                    'field'       => $field,
                    'old_value'   => $oldValue,
                    'new_value'   => $newValue,
                ]);
            }
        }

        if ($relawan->user) {
            $relawan->user->update([
                'name' => $request->nama
            ]);
        }

        return response()->json([
            'status'  => true,
            'message' => 'Relawan berhasil diperbarui',
            'data'    => $relawan->load('ormas')
        ]);
    }

public function destroy($id)
{
    $user = Auth::user();

    $relawan = Relawan::with([
        'village',
        'district',
        'city',
        'koordinator',
        'user'
    ])->find($id);

    if (!$relawan) {
        return response()->json([
            'status' => false,
            'message' => 'Relawan tidak ditemukan'
        ], 404);
    }

    // 🔐 CEK HAK AKSES KOORDINATOR
    if ($user->role === 'koordinator') {
        if (
            !$user->koordinator ||
            $relawan->koordinator_id !== $user->koordinator->id
        ) {
            return response()->json([
                'status' => false,
                'message' => 'Anda tidak berhak menghapus relawan ini'
            ], 403);
        }
    }

    // ❗ CEK APAKAH RELAWAN MASIH PUNYA KUNJUNGAN
    $visitCount = VisitForm::where('relawan_id', $relawan->id)->count();

    if ($visitCount > 0) {
        return response()->json([
            'status' => false,
            'message' => "Relawan ini masih mempunyai {$visitCount} data kunjungan"
        ], 422);
    }

    // 🧾 LOG AKTIVITAS
    $nama = $relawan->nama;
    $wilayah = [
        'kelurahan' => $relawan->village->village ?? null,
        'kecamatan' => $relawan->district->district ?? null,
        'kota'      => $relawan->city->city ?? null,
    ];

    ActivityLogger::log([
        'action'      => 'DELETE',
        'target_type' => 'relawan',
        'target_name' => $nama,
        'meta'        => $wilayah,
    ]);

    // 🧨 SOFT DELETE (AMAN)
    DB::transaction(function () use ($relawan) {

        // 1️⃣ Soft delete relawan
        $relawan->delete();

        // 2️⃣ Soft delete user (akun)
        if ($relawan->user) {
            $relawan->user->delete();
        }
    });

    return response()->json([
        'status'  => true,
        'message' => 'Relawan berhasil dihapus'
    ]);
}

public function export(Request $request)
{
    $user = Auth::user();
    $password = $request->password;

    // cek password
    if (!password_verify($password, $user->password)) {
        return response()->json([
            'message' => 'Password salah'
        ], 422);
    }

    if ($user->role === 'koordinator') {
        $nama = str_replace(' ', '_', strtolower($user->koordinator->nama));

        $response = Excel::download(
            new RelawanExport('koordinator', $user->koordinator->id),
            "relawan_{$nama}.xlsx"
        );

        $response->headers->set('Cache-Control', 'no-store, no-cache');
        $response->headers->set('Access-Control-Expose-Headers', 'Content-Disposition');

        return $response;
    }

    $response = Excel::download(
        new RelawanExport('admin'),
        'relawan_all.xlsx'
    );

    $response->headers->set('Cache-Control', 'no-store, no-cache');
    $response->headers->set('Access-Control-Expose-Headers', 'Content-Disposition');

    return $response;
}

    public function import(Request $request)
    {
        $user = Auth::user();

        if ($user->role !== 'koordinator' || !$user->koordinator) {
            return response()->json([
                'status' => false,
                'message' => 'Hanya koordinator yang dapat mengimpor relawan'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xls,xlsx|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => false,
                'message' => 'File tidak valid',
                'errors' => $validator->errors(),
            ], 422);
        }

        $import = new RelawanImport($user->koordinator->id);

        try {
            Excel::import($import, $request->file('file'));

            ActivityLogger::log([
                'action'      => 'IMPORT',
                'target_type' => 'relawan',
                'meta' => [
                    'koordinator_nama' => $user->koordinator->nama,
                    'jumlah_data'      => $import->successCount,
                ]
            ]);

            return response()->json([
                'status' => true,
                'message' => 'Import relawan selesai',
                'data' => [
                    'success_count'   => $import->successCount,
                    'failed_count'    => count($import->failedRows),
                    'failed_rows'     => $import->failedRows,
                    'created_accounts' => $import->createdAccounts,
                ]
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'status' => false,
                'message' => 'Gagal import relawan',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
