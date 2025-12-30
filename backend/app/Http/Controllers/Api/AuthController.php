<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'message' => 'Email atau password salah'
            ], 401);
        }

        $user = Auth::user();
    


// BUAT TOKEN BARU
$token = $user->createToken('api-token')->plainTextToken;

// Kirim data aman
return response()->json([
    'status' => true,
    'token' => $token,
    'user' => [
        'id' => $user->id,
        'name' => $user->name,
        'email' => $user->email,
        'role' => $user->role,
        'status' => $user->status
    ]
]);

    }

      public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'status' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status
            ]
        ]);
    }

    public function wilayah(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'koordinator') {
            return response()->json([
                'status' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $koordinator = $user->koordinator;

        if (!$koordinator) {
            return response()->json([
                'status' => false,
                'message' => 'Akun koordinator tidak valid'
            ], 404);
        }

        return response()->json([
            'status' => true,
            'data' => [
                'province' => $koordinator->province,
                'city'     => $koordinator->city,
                'district' => $koordinator->district,
                'village'  => $koordinator->village,
            ]
        ]);
    }
}
