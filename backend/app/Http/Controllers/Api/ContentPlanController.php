<?php

namespace App\Http\Controllers\Api;


use App\Models\ContentPlan;
use Illuminate\Http\Request;
use App\Models\ContentBudget;
use App\Models\ContentPlatform;
use App\Models\ContentPlatformAd;
use Illuminate\Support\Facades\DB;
use App\Models\ContentTypePlatform;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class ContentPlanController extends Controller
{
                /* ======================
                INDEX (VERSI SERVER SIDE FILTER)
            ====================== */
            public function index(Request $request) // <-- Jangan lupa tambah Request $request
            {
                $today = Carbon::today()->toDateString();
                $statusFilter = $request->query('status'); // Menangkap statusFilter dari React

                $query = ContentPlan::with([
                    'status',
                    'budgetWithTrashed',
                    'contentPlatforms.platform',
                    'contentPlatforms.contentType',
                    'contentPlatforms.ads' => fn($q) => $q->withTrashed(),
                    'influencers',
                    'ads',
                ])
                ->select('*')
                ->selectRaw("
                    CASE
                        WHEN posting_date < ? AND status_id != (
                            SELECT id FROM content_statuses WHERE label = 'Diposting' LIMIT 1
                        )
                        THEN 1 ELSE 0
                    END AS is_late
                ", [$today]);


    // --- LOGIKA FILTER STATUS (DROPDOWN) ---
    if (!empty($statusFilter)) {
        $query->whereHas('status', function($q) use ($statusFilter) {
            $q->where('label', $statusFilter);
        });
    }

    $query->orderByDesc('is_late')
          ->orderBy('posting_date', 'asc');

    $data = $query->get();
    $lateCount = $data->where('is_late', 1)->count();

    return response()->json([
        'data' => $data,
        'meta' => [
            'late_count' => $lateCount,
        ],
    ]);
}
    /* ======================
        DETAIL
    ====================== */
    public function show($id)
    {
        $data = ContentPlan::with([
            'status',
            'budgetWithTrashed',
            'contentPlatforms.platform',
            'contentPlatforms.contentType',
            'contentPlatforms.ads' => fn($q) => $q->withTrashed(),
            'influencers.platforms.platform', // ✅ FOLLOWERS MASUK
            'ads',
        ])->findOrFail($id);

        return response()->json($data);
    }

    public function store(Request $request)
    {
        // ======================
        // VALIDASI UTAMA
        // ======================
        $request->validate([
            'title' => 'required|string',
            'posting_date' => 'required|date',
            'content_types' => 'required|array|min:1',
            'budget_content' => 'required|numeric|min:0',
            'is_ads' => 'boolean',
            'ads_by_platform' => 'nullable|array',
            'description' => 'nullable|string',
            'influencer_ids' => 'nullable|array',
            'links' => 'nullable|array',
        ]);

        // ======================
        // TRANSAKSI DB
        // ======================
        DB::beginTransaction();
        try {
            // CREATE CONTENT PLAN
            $contentPlan = ContentPlan::create([
                'title' => $request->title,
                'posting_date' => $request->posting_date,
                'status_id' => 1, // default status
                'description' => $request->description,
                'refund_budget' => false,
            ]);

            // PLATFORM & CONTENT TYPE
            foreach ($request->content_types as $platformId => $contentTypes) {
                foreach ($contentTypes as $contentTypeId => $data) {

                    $isValid = ContentTypePlatform::where('platform_id', $platformId)
                        ->where('content_type_id', $contentTypeId)
                        ->exists();

                    if (!$isValid) {
                        throw new \Exception("Content type tidak valid");
                    }

                    ContentPlatform::create([
                        'content_plan_id' => $contentPlan->id,
                        'platform_id' => $platformId,
                        'content_type_id' => $contentTypeId,
                        'is_collaborator' => $data['is_collaborator'] ?? false,
                        'link' => $data['link'] ?? null,
                    ]);
                }
            }

            // CONTENT BUDGET
            ContentBudget::create([
                'content_plan_id' => $contentPlan->id,
                'budget_content' => $request->budget_content,
            ]);

            // ADS (jika aktif)
            if ($request->boolean('is_ads') && $request->filled('ads_by_platform')) {

                foreach ($request->ads_by_platform as $platformId => $ads) {

                    ContentPlatformAd::updateOrCreate(
                        [
                            'content_plan_id' => $contentPlan->id,
                            'platform_id' => $platformId,
                        ],
                        [
                            'is_ads' => true,
                            'start_date' => $ads['start_date'],
                            'end_date' => $ads['end_date'],
                            'budget_ads' => $ads['budget_ads'],
                        ]
                    );
                }
            }

            // INFLUENCERS (jika ada)
            if ($request->filled('influencer_ids')) {
                $contentPlan->influencers()->attach($request->influencer_ids);
            }

            DB::commit();

            return response()->json([
                'message' => 'Content plan berhasil dibuat',
                'data' => $contentPlan->load([
                    'status',
                    'budget',
                    'contentPlatforms.platform',
                    'contentPlatforms.contentType',
                    'contentPlatforms.ads',
                    'influencers.platforms.platform',
                ]),
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Gagal membuat content plan',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /* ======================
        UPDATE
    ====================== */
    public function update(Request $request, $id)
    {
        $request->validate([
            'title' => 'required|string',
            'posting_date' => 'required|date',
            'status_id' => 'required|exists:content_statuses,id',
            'content_types' => 'required|array|min:1',
            'budget_content' => 'required|numeric|min:0',
            'is_ads' => 'boolean',
            'ads_by_platform' => 'nullable|array',
            'refund_budget' => 'boolean',
            'influencer_ids' => 'nullable|array',
        ]);

        DB::beginTransaction();

        try {
            $contentPlan = ContentPlan::findOrFail($id);

            /* ===============================
         * UPDATE BASIC INFO
         * =============================== */
            $contentPlan->update([
                'title' => $request->title,
                'posting_date' => $request->posting_date,
                'status_id' => $request->status_id,
                'description' => $request->description,
            ]);

            /* ===============================
         * RESET CONTENT PLATFORM
         * =============================== */
            ContentPlatform::where('content_plan_id', $id)->delete();

            foreach ($request->content_types as $platformId => $contentTypes) {
                foreach ($contentTypes as $contentTypeId => $data) {

                    $valid = ContentTypePlatform::where([
                        'platform_id' => $platformId,
                        'content_type_id' => $contentTypeId,
                    ])->exists();

                    if (!$valid) {
                        throw new \Exception('Content type tidak valid');
                    }

                    ContentPlatform::create([
                        'content_plan_id' => $id,
                        'platform_id' => $platformId,
                        'content_type_id' => $contentTypeId,
                        'is_collaborator' => $data['is_collaborator'] ?? false,
                        'link' => $data['link'] ?? null,
                    ]);
                }
            }

            /* ===============================
         * UPDATE BUDGET
         * =============================== */
            ContentBudget::updateOrCreate(
                ['content_plan_id' => $id],
                ['budget_content' => $request->budget_content]
            );

            /* ===============================
 * UPDATE ADS
 * =============================== */
            if ($request->boolean('is_ads') && $request->filled('ads_by_platform')) {

                // HARD DELETE ads yg tidak dipakai lagi
                ContentPlatformAd::where('content_plan_id', $id)
                    ->whereNotIn('platform_id', array_keys($request->ads_by_platform))
                    ->forceDelete();

                foreach ($request->ads_by_platform as $platformId => $ads) {

                    if ($ads['end_date'] < $ads['start_date']) {
                        throw new \Exception('End date ads harus >= start date');
                    }

                    ContentPlatformAd::withTrashed()->updateOrCreate(
                        [
                            'content_plan_id' => $id,
                            'platform_id' => $platformId,
                        ],
                        [
                            'is_ads' => true,
                            'start_date' => $ads['start_date'],
                            'end_date' => $ads['end_date'],
                            'budget_ads' => $ads['budget_ads'],
                            'deleted_at' => null, // ⬅️ PENTING
                        ]
                    );
                }
            } else {
                // ADS DIMATIKAN → HAPUS FISIK
                ContentPlatformAd::where('content_plan_id', $id)->forceDelete();
            }

            /* ===============================
         * REFUND BUDGET
         * =============================== */
            if (
                $request->status_id == 5 &&
                $request->boolean('refund_budget') &&
                !$contentPlan->refund_budget
            ) {
                ContentBudget::where('content_plan_id', $id)->delete();
                ContentPlatformAd::where('content_plan_id', $id)->delete();

                $contentPlan->update(['refund_budget' => true]);
            }

            /* ===============================
         * SYNC INFLUENCER
         * =============================== */
            $contentPlan->influencers()->sync($request->influencer_ids ?? []);

            DB::commit();

            return response()->json([
                'message' => 'Content plan berhasil diupdate',
                'data' => ContentPlan::with([
                    'status',
                    'budget',
                    'contentPlatforms.platform',
                    'contentPlatforms.contentType',
                    'contentPlatforms.ads',
                    'influencers.platforms.platform',
                ])->find($id),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Gagal update content plan',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
