<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class UsedBudget extends Model
{
    use SoftDeletes;

    protected $table = 'used_budget';
    protected $fillable = [
        'content_plan_id',
        'budget_content',
        'budget_ads'
    ];

    public function contentPlan()
    {
        return $this->belongsTo(ContentPlan::class);
    }
}
