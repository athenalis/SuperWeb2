<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContentPlatform;
use App\Models\Engagement;
use App\Models\ContentPlan;
use Illuminate\Http\Request;

class EngagementController extends Controller
{
    public function analyticContent($contentPlanId)
    {
        $contentPlan = ContentPlan::with([
            'status',
            'contentPlatforms.platform',
            'contentPlatforms.engagements' => fn($q) => $q->orderBy('recorded_at')
        ])->findOrFail($contentPlanId);

        $chartMeta = [
            'status' => 'ready',
            'message' => null,
        ];

        if ($contentPlan->status->label !== 'Diposting') {
            return response()->json([
                'content' => [
                    'id' => $contentPlan->id,
                    'title' => $contentPlan->title,
                    'status_label' => $contentPlan->status->label,
                ],
                'chart_meta' => [
                    'status' => 'not_posted',
                    'message' => 'Konten ini belum diposting',
                ],
                'platforms_available' => [],
                'reports' => [],
                'chart' => [],
            ]);
        }

        $reports = [];
        $chart = [];
        $platformsAvailable = [];

        foreach ($contentPlan->contentPlatforms as $cp) {
            $platformId = $cp->platform->id;
            $platformName = $cp->platform->name;
            $engagements = $cp->engagements;

            $platformsAvailable[] = [
                'platform_id' => $platformId,
                'platform_name' => $platformName,
            ];

            $reports[$platformId] = [
                'platform_id' => $platformId,
                'platform_name' => $platformName,
                'data' => $engagements->map(fn($e) => [
                    'record_id' => $e->id,
                    'date'  => $e->recorded_at->format('Y-m-d'),
                    'likes' => $e->likes,
                    'views' => $e->views,
                ])->values()
            ];

            $chart[$platformId] = [
                'platform_id' => $platformId,
                'platform_name' => $platformName,
                'data' => []
            ];

            $prev = null;

            foreach ($engagements as $index => $e) {
                $currentViews = (int) $e->views;
                $currentLikes = (int) $e->likes;

                if ($index === 0) {
                    $chartViews = $currentViews;
                    $chartLikes = $currentLikes;

                    $tooltipViewsLabel = number_format($currentViews);
                    $tooltipLikesLabel = number_format($currentLikes);

                    $viewsTrend = 'base';
                    $likesTrend = 'base';
                    $desc = 'Nilai awal';
                } else {
                    $deltaViews = $currentViews - (int) $prev->views;
                    $deltaLikes = $currentLikes - (int) $prev->likes;

                    $chartViews = $deltaViews;
                    $chartLikes = $deltaLikes;

                    $tooltipViewsLabel = number_format($deltaViews);
                    $tooltipLikesLabel = number_format($deltaLikes);

                    $viewsTrend = $deltaViews >= 0 ? 'up' : 'down';
                    $likesTrend = $deltaLikes >= 0 ? 'up' : 'down';

                    $desc =
                        $e->recorded_at->format('d M') .
                        ' - ' .
                        $prev->recorded_at->format('d M');
                }

                $chart[$platformId]['data'][] = [
                    'date' => $e->recorded_at->format('Y-m-d'),
                    'views' => $chartViews,
                    'likes' => $chartLikes,
                    'tooltip' => [
                        'views_label' => $tooltipViewsLabel,
                        'likes_label' => $tooltipLikesLabel,
                        'views_trend' => $viewsTrend,
                        'likes_trend' => $likesTrend,
                        'desc' => $desc,
                    ],
                ];

                $prev = $e;
            }
        }

        if (collect($chart)->every(fn($c) => empty($c['data']))) {
            $chartMeta['status'] = 'empty';
            $chartMeta['message'] = 'Data belum tersedia';
        }

        return response()->json([
            'content' => [
                'id' => $contentPlan->id,
                'title' => $contentPlan->title,
                'status_label' => $contentPlan->status->label,
            ],
            'chart_meta' => $chartMeta,
            'platforms_available' => $platformsAvailable,
            'reports' => $reports,
            'chart' => $chart,
        ]);
    }

    public function store(Request $request, $contentPlanId)
    {
        $request->validate([
            'platform_id' => 'required|exists:platforms,id',
            'recorded_at' => 'required|date',
            'likes' => 'required|integer|min:0',
            'views' => 'required|integer|min:0',
        ]);

        $contentPlan = ContentPlan::with('status')->findOrFail($contentPlanId);

        if ($contentPlan->status->label !== 'Diposting') {
            return response()->json([
                'message' => 'Konten belum diposting, tidak bisa menambahkan informasi like dan view'
            ], 422);
        }

        $contentPlatform = ContentPlatform::where('content_plan_id', $contentPlanId)
            ->where('platform_id', $request->platform_id)
            ->first();

        if (! $contentPlatform) {
            return response()->json([
                'message' => 'Platform tidak tersedia pada konten ini, tidak bisa menambahkan like dan view'
            ], 422);
        }

        // cegah duplikasi tanggal
        $exists = Engagement::where('content_platform_id', $contentPlatform->id)
            ->where('recorded_at', $request->recorded_at)
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Informasi like dan view di tanggal ini sudah ada'
            ], 422);
        }

        $engagement = Engagement::create([
            'content_platform_id' => $contentPlatform->id,
            'recorded_at' => $request->recorded_at,
            'likes' => $request->likes,
            'views' => $request->views,
        ]);

        return response()->json([
            'message' => 'Engagement berhasil ditambahkan',
            'data' => $engagement
        ], 201);
    }

    public function update(Request $request, $contentPlanId, $engagementId)
    {
        $request->validate([
            'recorded_at' => 'required|date',
            'likes' => 'required|integer|min:0',
            'views' => 'required|integer|min:0',
        ]);

        $contentPlan = ContentPlan::with('status')->findOrFail($contentPlanId);

        if ($contentPlan->status->label !== 'Diposting') {
            return response()->json([
                'message' => 'Konten belum diposting, tidak bisa mengubah data engagement'
            ], 422);
        }

        $engagement = Engagement::with('contentPlatform')
            ->where('id', $engagementId)
            ->firstOrFail();

        // pastikan engagement milik content plan ini
        if ($engagement->contentPlatform->content_plan_id != $contentPlanId) {
            return response()->json([
                'message' => 'Engagement tidak valid untuk konten ini'
            ], 403);
        }

        // cegah duplikasi tanggal (kecuali data ini sendiri)
        $exists = Engagement::where('content_platform_id', $engagement->content_platform_id)
            ->where('recorded_at', $request->recorded_at)
            ->where('id', '!=', $engagementId)
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Data pada tanggal tersebut sudah ada'
            ], 422);
        }

        $engagement->update([
            'recorded_at' => $request->recorded_at,
            'likes' => $request->likes,
            'views' => $request->views,
        ]);

        return response()->json([
            'message' => 'Engagement berhasil diperbarui',
            'data' => $engagement
        ]);
    }
}
