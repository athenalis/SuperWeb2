<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VoteCount;
use App\Models\PartyVote;

class TicketVoteController extends Controller
{
    public function jakartaUtaraPerKecamatan()
    {
        $jakutDistricts = [
            '317.101' => 'PENJARINGAN',
            '317.102' => 'PADEMANGAN',
            '317.103' => 'TANJUNG PRIOK',
            '317.104' => 'KOJA',
            '317.105' => 'KELAPA GADING',
            '317.106' => 'CILINCING',
        ];

        $mappingUsungan = [
            '01' => ['100.001', '100.002'],
            '02' => ['100.003'],
            '03' => ['100.004'],
        ];

        $result = [];

        foreach ($jakutDistricts as $districtCode => $districtName) {

            /**
             * ===============================
             * PASLON MENANG PER KECAMATAN
             * ===============================
             */
            $paslon = VoteCount::whereHas('village.district', function ($q) use ($districtCode) {
                    $q->where('district_code', $districtCode);
                })
                ->selectRaw('
                    SUM(suara_paslon_01) as p01,
                    SUM(suara_paslon_02) as p02,
                    SUM(suara_paslon_03) as p03
                ')
                ->first();

            if (!$paslon) {
                continue;
            }

            $paslonResult = [
                '01' => $paslon->p01,
                '02' => $paslon->p02,
                '03' => $paslon->p03,
            ];

            arsort($paslonResult);
            $paslonMenang = array_key_first($paslonResult);

            /**
             * ===============================
             * PARTAI MENANG PER KECAMATAN
             * ===============================
             */
            $partaiMenang = PartyVote::where('district_code', $districtCode)
                ->selectRaw('party, party_code, SUM(jumlah) as total')
                ->groupBy('party', 'party_code')
                ->orderByDesc('total')
                ->first();

            if (!$partaiMenang) {
                continue;
            }

            /**
             * ===============================
             * STRAIGHT / SPLIT
             * ===============================
             */
            $isStraight = in_array(
                $partaiMenang->party_code,
                $mappingUsungan[$paslonMenang] ?? []
            );

            $result[] = [
                'district' => $districtName,
                'district_code' => $districtCode,
                'paslon_menang' => $paslonMenang,
                'partai_menang' => $partaiMenang->party,
                'party_code' => $partaiMenang->party_code,
                'tipe_vote' => $isStraight ? 'straight' : 'split'
            ];
        }

        return response()->json([
            'wilayah' => 'Jakarta Utara',
            'data' => $result
        ]);
    }
}
