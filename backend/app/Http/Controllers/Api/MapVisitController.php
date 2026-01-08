<?php

namespace App\Http\Controllers\Api;

use App\Models\VisitForm;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class MapVisitController extends Controller
{
    public function mapData(Request $request)
    {
        $visits = VisitForm::select(
            'id',
            'latitude',
            'longitude',
            'nama',
            'alamat',
            'status'
        )
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->where('latitude', '!=', '')
            ->where('longitude', '!=', '')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $visits
        ]);
    }
}
