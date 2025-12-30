<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\VoteCount;
use Illuminate\Support\Facades\DB;

class PetaSuaraController extends Controller
{
    public function perKelurahan()
    {
        $rows = VoteCount::select(
                'village',
                'village_code',
                'district',
                'district_code',
                DB::raw('SUM(suara_paslon_01) as p1'),
                DB::raw('SUM(suara_paslon_02) as p2'),
                DB::raw('SUM(suara_paslon_03) as p3')
            )
            ->groupBy(
                'village',
                'village_code',
                'district',
                'district_code'
            )
            ->get();

        $paslonColors = [
            'paslon_01' => '#FFD100',
            'paslon_02' => '#16a34a',
            'paslon_03' => '#C40000',
        ];

        $result = $rows->map(function ($row) use ($paslonColors) {

            $suara = [
                'paslon_01' => (int) $row->p1,
                'paslon_02' => (int) $row->p2,
                'paslon_03' => (int) $row->p3,
            ];

            $max = max($suara);
            $winners = array_keys($suara, $max);

            if (count($winners) > 1) {
                return [
                    'village'        => $row->village,
                    'village_code'   => 'id'.$row->village_code,
                    'district'       => $row->district,
                    'district_code'  => $row->district_code,
                    'winner_paslon'  => 'tie',
                    'winner_color'   => '#9ca3af',
                    'suara'          => $suara,
                ];
            }

            $winner = $winners[0];

            return [
                'village'        => $row->village,
                'village_code'   => 'id'.$row->village_code,
                'district'       => $row->district,
                'district_code'  => $row->district_code,
                'winner_paslon'  => $winner,
                'winner_color'   => $paslonColors[$winner],
                'suara'          => $suara,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data'   => $result
        ]);
    }
}
