<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TotalBudget;
use App\Models\UsedBudget;

class BudgetController extends Controller
{
    public function index()
    {
        $totalBudget = TotalBudget::first()?->amount ?? 0;

        $usedContent = UsedBudget::whereNull('deleted_at')->sum('budget_content');
        $usedAds = UsedBudget::whereNull('deleted_at')->sum('budget_ads');


        return response()->json([
            'total_budget' => $totalBudget,
            'used_budget' => [
                'content' => $usedContent,
                'ads' => $usedAds,
                'total' => $usedContent + $usedAds,
            ],
            'remaining_budget' => $totalBudget - ($usedContent + $usedAds),
        ]);
    }
}
