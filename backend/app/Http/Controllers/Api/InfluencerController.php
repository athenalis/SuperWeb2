<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Influencer;
use Illuminate\Http\Request;

class InfluencerController extends Controller
{
    /**
     * GET /api/influencers
     * Optional query param: platform_ids[]=1&platform_ids[]=2
     */
    public function index(Request $request)
    {
        $platformIds = $request->input('platform_ids', []);

        $query = Influencer::query()->with(['platforms.platform']);

        if (!empty($platformIds)) {
            $query->whereHas('platforms', function ($q) use ($platformIds) {
                $q->whereIn('platform_id', $platformIds);
            });
        }

        $influencers = $query->get()->map(function ($influencer) {
            return [
                'id' => $influencer->id,
                'name' => $influencer->name,
                'email' => $influencer->email,
                'contacts' => $influencer->contacts, // JSON array
                'platforms' => $influencer->platforms->map(function ($p) {
                    return [
                        'id' => $p->platform_id,
                        'name' => $p->platform->name,
                        'username' => $p->username,
                        'followers' => $p->followers,
                    ];
                }),
                // opsional: display label siap dropdown
                'display_name' => $this->makeDisplayName($influencer),
            ];
        });

        return response()->json($influencers);
    }

    /**
     * Optional helper buat label dropdown
     */
    protected function makeDisplayName($influencer)
    {
        if ($influencer->platforms->isEmpty()) {
            return $influencer->name;
        }

        $platformInfo = $influencer->platforms->map(function ($p) {
            return "{$p->username} ({$p->platform->name})";
        })->implode(', ');

        return "{$influencer->name} — {$platformInfo}";
    }
}
