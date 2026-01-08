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

class ContentPlanController extends Controller
{
    /* ======================
        INDEX
    ====================== */
    public function index()
    {
        $data = ContentPlan::with([
            'status',
            'budgetWithTrashed',
            'contentPlatforms.platform',
            'contentPlatforms.contentType',
            'contentPlatforms.ads' => fn($q) => $q->withTrashed(),
            'influencers',
        ])
            ->orderBy('posting_date', 'desc')
            ->get();

        return response()->json($data);
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
            'content_type_ids' => 'required|array|min:1',
            'budget_content' => 'required|numeric|min:0',
            'is_ads' => 'boolean',
            'ads_by_platform' => 'nullable|array',
            'description' => 'nullable|string',
            'influencer_ids' => 'nullable|array',
        ]);

        // ======================
        // VALIDASI TANGGAL ADS per platform
        // ======================
        if ($request->boolean('is_ads') && $request->filled('ads_by_platform')) {
            foreach ($request->ads_by_platform as $pid => $ads) {
                $validator = Validator::make($ads, [
                    'start_date' => 'required|date',
                    'end_date' => 'required|date|after_or_equal:start_date',
                    'budget_ads' => 'required|numeric|min:0',
                ], [
                    'end_date.after_or_equal' => "Tanggal selesai ads tidak boleh kurang dari tanggal mulai untuk platform $pid",
                ]);

                if ($validator->fails()) {
                    return response()->json([
                        'message' => 'Validasi ads gagal',
                        'errors' => $validator->errors(),
                    ], 422);
                }
            }
        }

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
            foreach ($request->content_type_ids as $platformId => $contentTypeId) {
                $isValid = ContentTypePlatform::where('platform_id', $platformId)
                    ->where('content_type_id', $contentTypeId)
                    ->exists();

                if (!$isValid) {
                    throw new \Exception(
                        "Content type tidak valid untuk platform yang dipilih"
                    );
                }

                ContentPlatform::create([
                    'content_plan_id' => $contentPlan->id,
                    'platform_id' => $platformId,
                    'content_type_id' => $contentTypeId,
                ]);
            }

            // CONTENT BUDGET
            ContentBudget::create([
                'content_plan_id' => $contentPlan->id,
                'budget_content' => $request->budget_content,
            ]);

            // ADS (jika aktif)
            if ($request->boolean('is_ads') && $request->filled('ads_by_platform')) {
                foreach ($request->ads_by_platform as $platformId => $ads) {
                    $cp = $contentPlan->contentPlatforms->firstWhere('platform_id', $platformId);
                    if (!$cp) continue;

                    ContentPlatformAd::create([
                        'content_platform_id' => $cp->id,
                        'is_ads' => true,
                        'start_date' => $ads['start_date'],
                        'end_date' => $ads['end_date'],
                        'budget_ads' => $ads['budget_ads'],
                    ]);
                }
            }

            // INFLUENCERS (jika ada)
            if ($request->filled('influencer_ids')) {
                $contentPlan->influencers()->attach($request->influencer_ids);
            }

            DB::commit();

            return response()->json([
                'message' => 'Content plan berhasil dibuat',
                'data' => $contentPlan->load('budget', 'contentPlatforms.ads', 'influencers'),
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
        $contentPlan = ContentPlan::with(['contentPlatforms.ads', 'budget', 'influencers'])
            ->findOrFail($id);

        $request->validate([
            'title' => 'required|string',
            'posting_date' => 'required|date',
            'status_id' => 'required|exists:content_statuses,id',
            'content_type_ids' => 'required|array|min:1',
            'budget_content' => 'required|numeric|min:0',
            'is_ads' => 'boolean',
            'ads_by_platform' => 'nullable|array',
            'refund_budget' => 'boolean',
            'influencer_ids' => 'nullable|array',
        ]);

        // VALIDASI ADS END_DATE >= START_DATE
        if ($request->boolean('is_ads') && $request->filled('ads_by_platform')) {
            foreach ($request->ads_by_platform as $pid => $ads) {
                $validator = Validator::make($ads, [
                    'start_date' => 'required|date',
                    'end_date' => 'required|date|after_or_equal:start_date',
                    'budget_ads' => 'required|numeric|min:0',
                ], [
                    'end_date.after_or_equal' => "Tanggal selesai ads tidak boleh kurang dari tanggal mulai untuk platform $pid",
                ]);

                if ($validator->fails()) {
                    return response()->json([
                        'message' => 'Validasi ads gagal',
                        'errors' => $validator->errors(),
                    ], 422);
                }
            }
        }

        DB::beginTransaction();
        try {
            // UPDATE BASIC INFO
            $contentPlan->update([
                'title' => $request->title,
                'posting_date' => $request->posting_date,
                'status_id' => $request->status_id,
                'description' => $request->description ?? $contentPlan->description,
            ]);

            // DELETE OLD PLATFORM + ADD NEW
            ContentPlatform::where('content_plan_id', $id)->delete();
            foreach ($request->content_type_ids as $platformId => $contentTypeId) {
                $isValid = ContentTypePlatform::where('platform_id', $platformId)
                    ->where('content_type_id', $contentTypeId)
                    ->exists();

                if (!$isValid) {
                    throw new \Exception("Content type tidak valid untuk platform yang dipilih");
                }

                ContentPlatform::create([
                    'content_plan_id' => $id,
                    'platform_id' => $platformId,
                    'content_type_id' => $contentTypeId,
                ]);
            }

            $contentPlan->load('contentPlatforms');

            // UPDATE CONTENT BUDGET
            if ($contentPlan->budget) {
                $contentPlan->budget->update([
                    'budget_content' => $request->budget_content,
                ]);
            } else {
                ContentBudget::create([
                    'content_plan_id' => $id,
                    'budget_content' => $request->budget_content,
                ]);
            }

            // UPDATE ADS
            if ($request->boolean('is_ads') && $request->filled('ads_by_platform')) {
                foreach ($contentPlan->contentPlatforms as $cp) {
                    $ads = $request->ads_by_platform[$cp->platform_id] ?? null;
                    if (!$ads) continue;

                    ContentPlatformAd::updateOrCreate(
                        ['content_platform_id' => $cp->id],
                        [
                            'is_ads' => true,
                            'start_date' => $ads['start_date'],
                            'end_date' => $ads['end_date'],
                            'budget_ads' => $ads['budget_ads'],
                        ]
                    );
                }
            } else {
                // Hapus semua ads jika tidak aktif
                ContentPlatformAd::whereIn(
                    'content_platform_id',
                    $contentPlan->contentPlatforms->pluck('id')
                )->delete();
            }

            // REFUND BUDGET jika status = 5 & refund_budget = true
            if ($request->status_id == 5 && $request->boolean('refund_budget') && !$contentPlan->refund_budget) {
                $contentPlan->budget()?->delete();
                foreach ($contentPlan->contentPlatforms as $cp) {
                    $cp->ads()?->delete();
                }
                $contentPlan->update(['refund_budget' => true]);
            }

            // SYNC INFLUENCERS
            if ($request->filled('influencer_ids')) {
                $contentPlan->influencers()->sync($request->influencer_ids);
            } else {
                $contentPlan->influencers()->detach();
            }

            DB::commit();

            return response()->json([
                'message' => 'Content plan berhasil diupdate',
                'data' => $contentPlan->load('budget', 'contentPlatforms.ads', 'influencers'),
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
