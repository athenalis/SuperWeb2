<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContentPlatform;
use App\Models\Engagement;
use App\Models\ContentPlan;
use Illuminate\Http\Request;

class EngagementController extends Controller
{
    /* =====================================================
     * ANALYTIC CONTENT (PER PLATFORM → PER CONTENT TYPE)
     * ===================================================== */
    public function analyticContent($contentPlanId)
    {
        $contentPlan = ContentPlan::with([
            'status',
            'contentPlatforms.platform',
            'contentPlatforms.contentType',
            'contentPlatforms.engagements' => fn ($q) => $q->orderBy('start_date'),
        ])->findOrFail($contentPlanId);

        // ❌ Belum diposting
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

        $platformsAvailable = [];
        $reports = [];
        $chart = [];

        foreach ($contentPlan->contentPlatforms as $cp) {
            $platformId = $cp->platform->id;
            $engagements = $cp->engagements;

            /* =========================
             * PLATFORMS AVAILABLE
             * ========================= */
            if (!isset($platformsAvailable[$platformId])) {
                $platformsAvailable[$platformId] = [
                    'platform_id' => $platformId,
                    'platform_name' => $cp->platform->name,
                ];
            }

            /* =========================
             * REPORTS
             * ========================= */
            if (!isset($reports[$platformId])) {
                $reports[$platformId] = [
                    'platform_id' => $platformId,
                    'platform_name' => $cp->platform->name,
                    'content_types' => [],
                ];
            }

            $reports[$platformId]['content_types'][$cp->id] = [
                'content_platform_id' => $cp->id,
                'content_type_id' => $cp->content_type_id,
                'content_type_name' => $cp->contentType->name,
                'link' => $cp->link,
                'data' => $engagements->map(fn ($e) => [
                    'record_id' => $e->id,
                    'start_date' => $e->start_date->format('Y-m-d'),
                    'end_date' => $e->end_date->format('Y-m-d'),
                    'likes' => (int) $e->likes,
                    'views' => (int) $e->views,
                ])->values(),
            ];

            /* =========================
             * CHART
             * ========================= */
            foreach ($engagements as $e) {
                $chart[] = [
                    'platform_id' => $platformId,
                    'platform_name' => $cp->platform->name,
                    'content_platform_id' => $cp->id,
                    'content_type' => $cp->contentType->name,
                    'start_date' => $e->start_date->format('Y-m-d'),
                    'end_date' => $e->end_date->format('Y-m-d'),
                    'views' => (int) $e->views,
                    'likes' => (int) $e->likes,
                ];
            }
        }

        return response()->json([
            'content' => [
                'id' => $contentPlan->id,
                'title' => $contentPlan->title,
                'status_label' => $contentPlan->status->label,
            ],
            'chart_meta' => [
                'status' => empty($chart) ? 'empty' : 'ready',
                'message' => empty($chart) ? 'Data belum tersedia' : null,
            ],
            'platforms_available' => array_values($platformsAvailable),
            'reports' => $reports,
            'chart' => $chart,
        ]);
    }

    /* =====================================================
     * STORE ENGAGEMENT
     * ===================================================== */
    public function store(Request $request, $contentPlanId)
    {
        $request->validate([
            'content_platform_id' => 'required|exists:content_platforms,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'likes' => 'required|integer|min:0',
            'views' => 'required|integer|min:0',
        ]);

        $cp = ContentPlatform::where('id', $request->content_platform_id)
            ->where('content_plan_id', $contentPlanId)
            ->firstOrFail();

        // 🔒 VALIDASI PERIODE CONTENT TYPE
        $error = $this->validateContentTypePeriod(
            $cp->id,
            $request->start_date,
            $request->end_date
        );

        if ($error) {
            return response()->json(['message' => $error], 422);
        }

        $engagement = Engagement::create([
            'content_platform_id' => $cp->id,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'likes' => $request->likes,
            'views' => $request->views,
        ]);

        return response()->json([
            'message' => 'Engagement berhasil ditambahkan',
            'data' => $engagement,
        ], 201);
    }

    /* =====================================================
     * UPDATE ENGAGEMENT
     * ===================================================== */
    public function update(Request $request, $contentPlanId, $engagementId)
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'likes' => 'required|integer|min:0',
            'views' => 'required|integer|min:0',
        ]);

        $engagement = Engagement::with('contentPlatform')
            ->findOrFail($engagementId);

        $cp = $engagement->contentPlatform;

        if ($cp->content_plan_id !== (int) $contentPlanId) {
            abort(404);
        }

        // 🔒 VALIDASI PERIODE CONTENT TYPE (exclude diri sendiri)
        $error = $this->validateContentTypePeriod(
            $cp->id,
            $request->start_date,
            $request->end_date,
            $engagement->id
        );

        if ($error) {
            return response()->json(['message' => $error], 422);
        }

        $engagement->update([
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'likes' => $request->likes,
            'views' => $request->views,
        ]);

        return response()->json([
            'message' => 'Engagement berhasil diperbarui',
            'data' => $engagement,
        ]);
    }

    /* =====================================================
     * VALIDASI OVERLAP PER CONTENT TYPE
     * ===================================================== */
    private function validateContentTypePeriod(
        int $contentPlatformId,
        string $startDate,
        string $endDate,
        ?int $excludeEngagementId = null
    ) {
        $query = Engagement::where('content_platform_id', $contentPlatformId);

        if ($excludeEngagementId) {
            $query->where('id', '!=', $excludeEngagementId);
        }

        $periods = $query
            ->orderBy('start_date')
            ->get(['start_date', 'end_date']);

        foreach ($periods as $p) {
            if (
                !($endDate < $p->start_date || $startDate > $p->end_date)
            ) {
                return
                    "Periode tanggal bertabrakan dengan data yang sudah ada (" .
                    $p->start_date->translatedFormat('d M Y') .
                    " – " .
                    $p->end_date->translatedFormat('d M Y') .
                    ")";
            }
        }

        return null;
    }
}
