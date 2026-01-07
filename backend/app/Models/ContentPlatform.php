<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContentPlatform extends Model
{
    protected $table = 'content_platforms';
    protected $fillable = [
        'content_plan_id',
        'platform_id',
        'content_type_id',
        'link'
    ];

    public $timestamps = false;

    public function engagements()
    {
        return $this->hasMany(Engagement::class);
    }

    public function contentPlan()
    {
        return $this->belongsTo(ContentPlan::class);
    }

    public function platform()
    {
        return $this->belongsTo(Platform::class);
    }
}
