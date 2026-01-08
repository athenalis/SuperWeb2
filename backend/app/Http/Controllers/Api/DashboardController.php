<?php

namespace App\Http\Controllers\Api;

use App\Models\Relawan;
use App\Models\Coordinator;
use Illuminate\Http\Request;use App\Http\Controllers\Controller;

class DashboardController extends Controller
{
    public function index()
    {
        // Hitung semua koordinator
        $totalCoordinators = Coordinator::count();

        // Hitung semua relawan
        $totalRelawans = Relawan::count();

        // Kembalikan data sebagai JSON
        return response()->json([
            'success' => true,
            'data' => [
                'koordinator_total' => $totalCoordinators,
                'relawan_total' => $totalRelawans,
            ],
        ]);
    }
}
