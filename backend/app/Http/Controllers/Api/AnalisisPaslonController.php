<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\VoteCount;
use App\Models\PartyVote;
use Illuminate\Support\Facades\DB;

class AnalisisPaslonController extends Controller
{
    public function straightTicketByDistrict()
    {
        /**
         * Mapping partai pengusung paslon
         */
        $coalitions = [
            '01' => [100001, 100004], // contoh: Golkar, PKS
            '02' => [],              // isi kalau ada
            '03' => [100003],        
        ];

        /**
         * 1️⃣ Ambil pemenang paslon per kecamatan
         */
        $paslonWinners = VoteCount::select(
                'district',
                'district_code',
                DB::raw('SUM(suara_paslon_01) as paslon_01'),
                DB::raw('SUM(suara_paslon_02) as paslon_02'),
                DB::raw('SUM(suara_paslon_03) as paslon_03')
            )
            ->groupBy('district', 'district_code')
            ->get()
            ->map(function ($row) {
                $votes = [
                    '01' => $row->paslon_01,
                    '02' => $row->paslon_02,
                    '03' => $row->paslon_03,
                ];

                arsort($votes);

                $winnerPaslon = array_key_first($votes);
                $totalVotes = $row->paslon_01 + $row->paslon_02 + $row->paslon_03;

                return [
                    'district' => $row->district,
                    'district_code' => $row->district_code,
                    'winner_paslon' => $winnerPaslon,
                    'winner_votes' => $votes[$winnerPaslon],
                    'total_votes' => $totalVotes,
                    'votes_paslon_01' => $row->paslon_01,
                    'votes_paslon_02' => $row->paslon_02,
                    'votes_paslon_03' => $row->paslon_03,
                ];
            });

        /**
         * 2️⃣ Ambil partai dominan per kecamatan
         */
        $partyWinners = PartyVote::select(
                'district',
                'district_code',
                'party_code',
                DB::raw('SUM(jumlah) as total_party_vote')
            )
            ->groupBy('district', 'district_code', 'party_code')
            ->orderByDesc('total_party_vote')
            ->get()
            ->groupBy('district_code')
            ->map(function ($items) {
                return $items->first(); // partai suara tertinggi
            });

        /**
         * 3️⃣ Tentukan kategori straight / split
         */
        $result = $paslonWinners->map(function ($district) use ($partyWinners, $coalitions) {
            $partyWinner = $partyWinners[$district['district_code']] ?? null;

            if (!$partyWinner) {
                return array_merge($district, [
                    'category' => 'Non-Partisan'
                ]);
            }

            $paslon = $district['winner_paslon'];
            $partyCode = $partyWinner->party_code;

            if (in_array($partyCode, $coalitions[$paslon] ?? [])) {
                $category = 'Straight Ticket';
            } else {
                $category = 'Split Ticket';
            }

            return array_merge($district, [
                'party_winner' => $partyWinner->party_code,
                'party_votes' => $partyWinner->total_party_vote,
                'category' => $category
            ]);
        });

        return response()->json($result->values());
    }
}
