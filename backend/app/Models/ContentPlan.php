<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContentPlan extends Model
{
    protected $fillable = [
        'title',
        'content_type_id',
        'status_id',
        'refund_budget',
        'description',
        'posting_date',
        'is_ads',
        'ads_start_date',
        'ads_end_date',
    ];

    public function usedBudget()
    {
        return $this->hasOne(UsedBudget::class);
    }

    public function usedBudgetWithTrashed()
    {
        return $this->hasOne(UsedBudget::class)->withTrashed();
    }

    public function contentType()
    {
        return $this->belongsTo(ContentType::class);
    }

    public function status()
    {
        return $this->belongsTo(ContentStatus::class);
    }

    public function platforms()
    {
        return $this->belongsToMany(
            Platform::class,
            'content_platforms',
            'content_plan_id',
            'platform_id'
        )->withPivot('content_type_id', 'link');
    }

    public function contentPlatforms()
    {
        return $this->hasMany(ContentPlatform::class, 'content_plan_id');
    }

    public function influencers()
    {
        return $this->belongsToMany(
            Influencer::class,
            'content_plan_influencers',
            'content_plan_id',
            'influencer_id'
        ); // hapus ->withTimestamps()
    }

    // optional helper untuk nama content type
    public function platformWithContentType()
    {
        return $this->platforms()->with('contentTypes');
    }
}
