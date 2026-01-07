<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Engagement extends Model
{
    protected $table = 'engagements';
    protected $fillable = [
        'content_platform_id',
        'likes',
        'views',
        'recorded_at',
    ];

    protected $casts = [
        'recorded_at' => 'date',
    ];

    public function contentPlatform()
    {
        return $this->belongsTo(ContentPlatform::class);
    }
}
