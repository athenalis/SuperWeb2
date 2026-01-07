<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContentPlan;
use App\Models\UsedBudget;
use App\Models\Influencer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ContentPlanController extends Controller
{
    public function index()
    {
        $data = ContentPlan::with([
            'status',
            'platforms' => function ($q) {
                $q->withPivot('content_type_id')
                    ->with(['contentTypes']);
            },
            'usedBudgetWithTrashed',
            'influencers.platforms.platform'
        ])->orderBy('posting_date', 'desc')->get();

        $data = $data->map(function ($plan) {
            $plan->platforms = $plan->platforms->map(function ($platform) use ($plan) {
                $contentType = $platform->contentTypes->firstWhere('id', $platform->pivot->content_type_id);
                return [
                    'id' => $platform->id,
                    'name' => $platform->name,
                    'content_type' => $contentType ? $contentType->name : null,
                    'pivot' => [
                        'content_type_id' => $platform->pivot->content_type_id
                    ]
                ];
            });
            return $plan;
        });

        return response()->json($data);
    }

    public function show($id)
    {
        $data = ContentPlan::with([
            'status',
            'platforms' => function ($q) {
                $q->withPivot('content_type_id')
                ->with(['contentTypes']);
            },
            'contentPlatforms',
            'usedBudgetWithTrashed',
            'influencers.platforms.platform'
        ])->findOrFail($id);

        $data->platforms = $data->platforms->map(function ($platform) use ($data) {
            $contentType = $platform->contentTypes
                ->firstWhere('id', $platform->pivot->content_type_id);

            $cp = $data->contentPlatforms
                ->firstWhere('platform_id', $platform->id);

            return [
                'id' => $platform->id,
                'name' => $platform->name,
                'content_type' => $contentType ? $contentType->name : null,
                'pivot' => [
                    'content_type_id' => $platform->pivot->content_type_id,
                    'link' => $cp?->link
                ]
            ];
        });

        return response()->json($data);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string',
            'posting_date' => 'required|date',
            'content_type_ids' => 'required|array|min:1',
            'budget_content' => 'required|numeric|min:0',
            'budget_ads' => 'nullable|numeric|min:0',
            'is_ads' => 'boolean',
            'ads_start_date' => 'nullable|date',
            'ads_end_date' => 'nullable|date|after_or_equal:ads_start_date',
            'description' => 'nullable|string',
            'influencer_ids' => 'nullable|array'
        ]);

        DB::beginTransaction();
        try {
            $contentPlan = ContentPlan::create([
                'title' => $request->title,
                'posting_date' => $request->posting_date,
                'status_id' => 1, // Terjadwal
                'description' => $request->description,
                'is_ads' => $request->is_ads ?? 0,
                'ads_start_date' => $request->ads_start_date,
                'ads_end_date' => $request->ads_end_date,
            ]);

            foreach ($request->content_type_ids as $platformId => $contentTypeId) {
                $valid = DB::table('content_type_platform')
                    ->where('platform_id', $platformId)
                    ->where('content_type_id', $contentTypeId)
                    ->exists();

                if (! $valid) {
                    throw new \Exception("Content type tidak valid untuk platform ID {$platformId}");
                }

                $contentPlan->platforms()->attach($platformId, [
                    'content_type_id' => $contentTypeId
                ]);
            }

            UsedBudget::create([
                'content_plan_id' => $contentPlan->id,
                'budget_content' => $request->budget_content,
                'budget_ads' => $request->is_ads ? $request->budget_ads : null,
            ]);

            if ($request->filled('influencer_ids')) {
                $contentPlan->influencers()->attach($request->influencer_ids);
            }

            DB::commit();
            return response()->json([
                'message' => 'Content plan berhasil dibuat',
                'data' => $contentPlan->load(['platforms', 'influencers.platforms.platform'])
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Gagal membuat content plan',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $contentPlan = ContentPlan::with('usedBudget', 'influencers')->findOrFail($id);

        $request->validate([
            'title' => 'required|string',
            'posting_date' => 'required|date',
            'status_id' => 'required|exists:content_statuses,id',
            'content_type_ids' => 'required|array|min:1',
            'refund_budget' => 'nullable|boolean',
            'budget_content' => 'required|numeric|min:0',
            'budget_ads' => 'nullable|numeric|min:0',
            'influencer_ids' => 'nullable|array',
            'links' => 'nullable|array',
        ]);

        DB::beginTransaction();
        try {
            $updateData = [
                'title' => $request->title,
                'posting_date' => $request->posting_date,
                'status_id' => $request->status_id,
            ];
            
            if ((int) $request->status_id === 5) {
                $updateData['refund_budget'] = $request->refund_budget ?? 0;
            }

            if ($request->has('is_ads')) {
                $updateData['is_ads'] = $request->is_ads;
            }

            if ($request->has('ads_start_date')) {
                $updateData['ads_start_date'] = $request->ads_start_date;
            }

            if ($request->has('ads_end_date')) {
                $updateData['ads_end_date'] = $request->ads_end_date;
            }
            
            $contentPlan->update($updateData);            

            $contentPlan->platforms()->detach();
            foreach ($request->content_type_ids as $platformId => $contentTypeId) {
                $valid = DB::table('content_type_platform')
                    ->where('platform_id', $platformId)
                    ->where('content_type_id', $contentTypeId)
                    ->exists();

                if (! $valid) {
                    throw new \Exception("Content type tidak valid untuk platform ID {$platformId}");
                }

                $contentPlan->platforms()->attach($platformId, [
                    'content_type_id' => $contentTypeId
                ]);

                if ($request->filled("links.$platformId")) {
                    DB::table('content_platforms')
                        ->where('content_plan_id', $id)
                        ->where('platform_id', $platformId)
                        ->update([
                            'link' => $request->links[$platformId]
                        ]
                    );
                }
            }

            if ($request->filled('influencer_ids')) {
                $contentPlan->influencers()->sync($request->influencer_ids);
            } else {
                $contentPlan->influencers()->detach();
            }

            if ($request->status_id == 5) {
                if ($request->refund_budget && $contentPlan->usedBudget) {
                    $contentPlan->usedBudget->delete();
                }
            } else {
                if ($contentPlan->usedBudget) {
                    $contentPlan->usedBudget->update([
                        'budget_content' => $request->budget_content,
                        'budget_ads' => $request->budget_ads,
                    ]);
                }
            }

            DB::commit();
            return response()->json([
                'message' => 'Content plan berhasil diupdate',
                'data' => $contentPlan->load(['platforms', 'influencers.platforms.platform'])
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Gagal update content plan',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
