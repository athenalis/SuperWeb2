<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VoteCount;
use Illuminate\Support\Facades\DB;

class PetaSuaraController extends Controller
{
    private function hitungPemenang($rows, $level)
    {
        $paslonColors = [
            'paslon_01' => '#FFD100',
            'paslon_02' => '#16a34a',
            'paslon_03' => '#C40000',
        ];

        return $rows->map(function ($row) use ($paslonColors, $level) {

            $suara = [
                'paslon_01' => (int) $row->p1,
                'paslon_02' => (int) $row->p2,
                'paslon_03' => (int) $row->p3,
            ];

            $max = max($suara);
            $winners = array_keys($suara, $max);

            $base = [
                'winner_paslon' => count($winners) > 1 ? 'tie' : $winners[0],
                'winner_color'  => count($winners) > 1
                    ? '#9ca3af'
                    : $paslonColors[$winners[0]],
                'suara'         => $suara,
            ];

            // Kelurahan
            if ($level === 'village') {
                return array_merge($base, [
                    'village'       => $row->village,
                    'village_code'  => 'id' . $row->village_code,
                    'district'      => $row->district,
                    'district_code' => $row->district_code,
                ]);
            }

            // Kecamatan
            if ($level === 'district') {
                return array_merge($base, [
                    'district'      => $row->district,
                    'district_code' => 'id' . $row->district_code,
                    'city'          => $row->city,
                    'city_code'     => $row->city_code,
                ]);
            }

            // Kota
            return array_merge($base, [
                'city'      => $row->city,
                'city_code' => 'id' . $row->city_code,
            ]);
        });
    }

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

        return response()->json([
            'status' => 'success',
            'data'   => $this->hitungPemenang($rows, 'village')
        ]);
    }

    public function perKecamatan()
    {
        $rows = VoteCount::select(
                'district',
                'district_code',
                'city',
                'city_code',
                DB::raw('SUM(suara_paslon_01) as p1'),
                DB::raw('SUM(suara_paslon_02) as p2'),
                DB::raw('SUM(suara_paslon_03) as p3')
            )
            ->groupBy(
                'district',
                'district_code',
                'city',
                'city_code'
            )
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $this->hitungPemenang($rows, 'district')
        ]);
    }

    public function perKota()
    {
        $rows = VoteCount::select(
                'city',
                'city_code',
                DB::raw('SUM(suara_paslon_01) as p1'),
                DB::raw('SUM(suara_paslon_02) as p2'),
                DB::raw('SUM(suara_paslon_03) as p3')
            )
            ->groupBy(
                'city',
                'city_code'
            )
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $this->hitungPemenang($rows, 'city')
        ]);
    }
}
