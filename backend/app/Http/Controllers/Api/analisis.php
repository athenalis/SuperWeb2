<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VoteCount;
use App\Models\PartyVote;
use Illuminate\Support\Facades\DB;

class Analisis extends Controller
{
    public function straightTicketByDistrict()
    {
        $coalitions = [
            '01' => [100004, 100008],
            '02' => [],
            '03' => [100003],
        ];

        // 1️⃣ PASLON PER KECAMATAN + SUARA
        $paslonWinners = VoteCount::select(
                'district',
                'district_code',
                DB::raw('SUM(suara_paslon_01) as votes_01'),
                DB::raw('SUM(suara_paslon_02) as votes_02'),
                DB::raw('SUM(suara_paslon_03) as votes_03')
            )
            ->groupBy('district', 'district_code')
            ->get()
            ->map(function ($row) {
                $votes = [
                    '01' => $row->votes_01,
                    '02' => $row->votes_02,
                    '03' => $row->votes_03,
                ];

                arsort($votes);
                $winner = array_key_first($votes);

                return [
                    'district' => $row->district,
                    'district_code' => $row->district_code,
                    'winner_paslon' => $winner,
                    'votes_paslon_01' => (int) $row->votes_01,
                    'votes_paslon_02' => (int) $row->votes_02,
                    'votes_paslon_03' => (int) $row->votes_03,
                ];
            });

        // 2️⃣ PARTAI DOMINAN + SUARA
        $partyWinners = PartyVote::select(
                'district_code',
                'party_code',
                DB::raw('SUM(jumlah) as party_votes')
            )
            ->groupBy('district_code', 'party_code')
            ->orderByDesc('party_votes')
            ->get()
            ->groupBy('district_code')
            ->map(fn ($items) => $items->first());

        // 3️⃣ MERGE + KATEGORI
        $result = $paslonWinners->map(function ($d) use ($partyWinners, $coalitions) {
            $party = $partyWinners[$d['district_code']] ?? null;

            if (!$party) {
                return array_merge($d, [
                    'category' => 'Non-Partisan',
                ]);
            }

            $category = in_array(
                $party->party_code,
                $coalitions[$d['winner_paslon']] ?? []
            )
                ? 'Straight Ticket'
                : 'Split Ticket';

            return array_merge($d, [
                'party_winner' => $party->party_code,
                'party_votes' => (int) $party->party_votes,
                'category' => $category,
            ]);
        });

        return response()->json($result->values());
    }
}
