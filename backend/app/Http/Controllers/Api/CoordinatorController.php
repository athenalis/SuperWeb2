<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Coordinator;
use App\Models\User;
use App\Models\History;
use App\Helpers\ActivityLogger;
use App\Helpers\PhoneHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use App\Exports\KoordinatorExport;
use App\Imports\KoordinatorImport;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\SoftDeletes;


class CoordinatorController extends Controller
{
    public function index(Request $request)
    {
        $perPage = (int) ($request->per_page ?? 5);

        $query = Coordinator::with([
            'province:province_code,province',
            'city:city_code,city',
            'district:district_code,district',
            'village:village_code,village',
        ])->withCount('relawans');

        if ($request->filled('search')) {
            $keyword = $request->search;

            $query->where(function ($q) use ($keyword) {
                $q->where('nama', 'like', "%{$keyword}%")
                ->orWhere('nik', 'like', "%{$keyword}%")
                ->orWhere('no_hp', 'like', "%{$keyword}%")
                ->orWhere('tps', 'like', "%{$keyword}%")

                ->orWhereHas('province', function ($qq) use ($keyword) {
                    $qq->where('province', 'like', "%{$keyword}%");
                })
                ->orWhereHas('city', function ($qq) use ($keyword) {
                    $qq->where('city', 'like', "%{$keyword}%");
                })
                ->orWhereHas('district', function ($qq) use ($keyword) {
                    $qq->where('district', 'like', "%{$keyword}%");
                })
                ->orWhereHas('village', function ($qq) use ($keyword) {
                    $qq->where('village', 'like', "%{$keyword}%");
                });
            });
        }

        if ($request->filled('city_code')) {
            $query->where('city_code', $request->city_code);
        }
        if ($request->filled('district_code')) {
            $query->where('district_code', $request->district_code);
        }
        if ($request->filled('village_code')) {
            $query->where('village_code', $request->village_code);
        }

        $data = $query->orderByDesc('id')->paginate($perPage);

        return response()->json([
            'status' => true,
            'data' => $data
        ]);
    }

    public function show($id)
    {
        $koordinator = Coordinator::with(['province', 'city', 'district', 'village', 'user'])->find($id);

        if (!$koordinator) {
            return response()->json([
                'status' => 'error',
                'message' => 'Koordinator tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $koordinator
        ]);
    }

    public function store(Request $request)
    {
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
                    $existsKoordinator = \App\Models\Coordinator::where('nik', $value)->exists();
                    $existsRelawan     = \App\Models\Relawan::where('nik', $value)->exists();

                    if ($existsKoordinator || $existsRelawan) {
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
            'alamat'         => 'required|string|max:255',
            'tps'            => 'required|string|max:3',
            'province_code'  => 'required|exists:provinces,province_code',
            'city_code'      => 'required|exists:cities,city_code',
            'district_code'  => 'required|exists:districts,district_code',
            'village_code'   => 'required|exists:villages,village_code',
        ], [
            'nama.regex' => 'Nama tidak boleh mengandung angka'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $countKoordinator = Coordinator::where('village_code', $request->village_code)->count();
        if ($countKoordinator >= 2) {
            return response()->json([
                'status' => false,
                'message' => 'Kelurahan ini sudah memiliki 2 koordinator'
            ], 422);
        }

        $result = DB::transaction(function () use ($request) {

            $nameClean = strtolower(str_replace(' ', '', $request->nama));
            $email = $nameClean . rand(1000, 9999) . '@gmail.com';
            $passwordPlain = $nameClean . rand(1000, 9999);

            $user = User::create([
                'name'           => $request->nama,
                'nik'            => $request->nik,
                'email'          => $email,
                'password'       => Hash::make($passwordPlain),
                'plain_password' => $passwordPlain,
                'role'           => 'koordinator',
                'status'         => 'inactive',
            ]);

            $koordinator = Coordinator::create([
                'user_id'        => $user->id,
                'province_code'  => $request->province_code,
                'city_code'      => $request->city_code,
                'district_code'  => $request->district_code,
                'village_code'   => $request->village_code,
                'nama'           => $request->nama,
                'nik'            => $request->nik,
                'no_hp'          => $request->no_hp,
                'alamat'         => $request->alamat,
                'tps'            => $request->tps,
                'status'         => 'inactive',
            ]);

            $koordinator->load(['province', 'city', 'district', 'village']);

            ActivityLogger::log([
                'action'      => 'CREATE',
                'target_type' => 'koordinator',
                'target_name' => $koordinator->nama,
                'meta' => [
                    'provinsi'  => $koordinator->province->province ?? null,
                    'kota'      => $koordinator->city->city ?? null,
                    'kecamatan' => $koordinator->district->district ?? null,
                    'kelurahan' => $koordinator->village->village ?? null,
                ]
            ]);

            return [
                'koordinator' => $koordinator,
                'email'       => $email,
                'password'    => $passwordPlain,
            ];
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Koordinator berhasil dibuat',
            'data' => [
                'koordinator' => $result['koordinator'],
                'user' => [
                    'email'    => $result['email'],
                    'password' => $result['password'],
                ]
            ]
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $koordinator = Coordinator::find($id);
        if (!$koordinator) {
            return response()->json([
                'status' => 'error',
                'message' => 'Koordinator tidak ditemukan'
            ], 404);
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
                function ($attribute, $value, $fail) use ($koordinator) {
                    $existsKoordinator = \App\Models\Coordinator::where('nik', $value)
                        ->where('id', '!=', $koordinator->id)
                        ->exists();

                    $existsRelawan = \App\Models\Relawan::where('nik', $value)->exists();

                    if ($existsKoordinator || $existsRelawan) {
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
            'alamat'        => 'required|string|max:255',
            'tps'           => 'required|string|max:3',
            'province_code' => 'required|exists:provinces,province_code',
            'city_code'     => 'required|exists:cities,city_code',
            'district_code' => 'required|exists:districts,district_code',
            'village_code'  => 'required|exists:villages,village_code',
        ], [
            'nama.regex' => 'Nama tidak boleh mengandung angka'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $oldData = $koordinator->only([
            'nama','nik','no_hp','alamat','tps','province_code','city_code','district_code','village_code'
        ]);

        $koordinator->update([
            'province_code' => $request->province_code,
            'city_code'     => $request->city_code,
            'district_code' => $request->district_code,
            'village_code'  => $request->village_code,
            'nama'        => $request->nama,
            'nik'         => $request->nik,
            'no_hp'       => $request->no_hp,
            'alamat'      => $request->alamat,
            'tps'         => $request->tps,
        ]);

        if ($koordinator->user) {

            $nameClean = strtolower(str_replace(' ', '', $request->nama));
            $newEmail = $nameClean . rand(1000, 9999) . '@gmail.com';
            $newPasswordPlain = $nameClean . rand(1000, 9999);

            $koordinator->user->update([
                'name'           => $request->nama,
                'nik'            => $request->nik,
                'email'          => $newEmail,
                'password'       => Hash::make($newPasswordPlain),
                'plain_password' => $newPasswordPlain,
            ]);
        }

        foreach ($oldData as $field => $oldValue) {
            $newValue = $request->$field;

            if ($oldValue != $newValue) {
                ActivityLogger::log([
                    'action'      => 'UPDATE',
                    'target_type' => 'koordinator',
                    'target_name' => $koordinator->nama,
                    'field'       => $field,
                    'old_value'   => $oldValue,
                    'new_value'   => $newValue,
                ]);
            }
        }

        if ($koordinator->user) {
            $koordinator->user->update([
                'name' => $request->nama,
                'nik'  => $request->nik
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Koordinator berhasil diperbarui',
            'data' => [
                'koordinator' => $koordinator,
                'user' => [
                    'email'    => $newEmail,
                    'password' => $newPasswordPlain,
                ]
            ]
        ]);        
    }

public function destroy($id)
{
    $koordinator = Coordinator::with(['village','district','city','user'])
        ->withCount('relawans')
        ->find($id);

    if (!$koordinator) {
        return response()->json([
            'status' => false,
            'message' => 'Koordinator tidak ditemukan'
        ], 404);
    }

    if ($koordinator->relawans_count > 0) {
        return response()->json([
            'status' => false,
            'message' => "Koordinator ini masih mempunyai {$koordinator->relawans_count} relawan, tolong hapus relawan terlebih dahulu",
            'relawan_count' => $koordinator->relawans_count
        ], 422);
    }

    ActivityLogger::log([
        'action'      => 'DELETE',
        'target_type' => 'koordinator',
        'target_name' => $koordinator->nama,
        'meta'        => [
            'kelurahan' => $koordinator->village->nama ?? null,
            'kecamatan' => $koordinator->district->nama ?? null,
            'kota'      => $koordinator->city->nama ?? null,
        ],
    ]);

    DB::transaction(function () use ($koordinator) {
        $koordinator->delete();
        $koordinator->user?->delete();
    });

    return response()->json([
        'status' => true,
        'message' => 'Koordinator berhasil dihapus'
    ]);
}

public function exportAll(Request $request)
{
    $user = Auth::user();

    if (!$user) {
        return response()->json(['message' => 'Unauthorized'], 401);
    }

    $inputPassword = $request->input('password');
    if (!$inputPassword || !Hash::check($inputPassword, $user->password)) {
        return response()->json(['message' => 'Password salah'], 403);
    }

    ActivityLogger::log([
        'action'      => 'EXPORT',
        'target_type' => 'koordinator',
    ]);

    return Excel::download(
        new KoordinatorExport,
        'data-koordinator.xlsx'
    );
}


public function import(Request $request)
{
    $request->validate([
        'file' => 'required|file|mimes:xls,xlsx'
    ]);

    $import = new KoordinatorImport;

    try {
        Excel::import($import, $request->file('file'));

        return response()->json([
            'status' => true,
            'message' => 'Import selesai',
            'data' => [
                'successCount' => $import->successCount,
                'failed_rows' => $import->failedRows,
                'created_accounts' => $import->createdAccounts,
            ]
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'status' => false,
            'message' => 'Gagal import: ' . $e->getMessage()
        ], 500);
    }
}

public function checkNik(Request $request)
{
    $request->validate([
        'nik' => 'required|digits:16'
    ]);

    $koordinator = Coordinator::withTrashed()
        ->with('user')
        ->where('nik', $request->nik)
        ->first();

    if (!$koordinator) {
        return response()->json([
            'exists' => false,
        ], 200);
    }

    if ($koordinator->trashed()) {
        return response()->json([
            'exists'  => true,
            'deleted' => true,
            'message' => 'NIK pernah terdaftar dan saat ini nonaktif',
        ], 200);
    }

    return response()->json([
        'exists'  => true,
        'deleted' => false,
        'message' => 'NIK sudah terdaftar dan aktif',
    ], 200);
}

public function restoreByNik(Request $request)
{
    $request->validate([
        'nik' => 'required|digits:16'
    ]);

    $koordinator = Coordinator::withTrashed()
        ->with(['user' => fn ($q) => $q->withTrashed()])
        ->where('nik', $request->nik)
        ->firstOrFail();

    DB::transaction(function () use ($koordinator) {

        if ($koordinator->trashed()) {
            $koordinator->restore();
        }

        if ($koordinator->user && $koordinator->user->trashed()) {
            $koordinator->user->restore();
        }
    });

    $actor = Auth::user();

    History::create([
        'user_id'     => $actor->id,
        'role'        => $actor->role, // admin
        'action'      => 'RESTORE',
        'target_type' => 'koordinator',
        'target_name' => $koordinator->nama,
        'field'       => 'activate_nik',
        'old_value'   => 'deleted',
        'new_value'   => 'active',
    ]);

    return response()->json([
        'status' => true,
        'message' => 'Koordinator berhasil diaktifkan kembali',
        'data' => [
            'koordinator' => $koordinator,
            'user' => $koordinator->user ? [
                'email'    => $koordinator->user->email,
                'password' => $koordinator->user->plain_password,
            ] : null
        ]
    ]);
}

}
