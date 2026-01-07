<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InfluencerPlatform extends Model
{
    protected $table = 'influencer_platforms';

    protected $fillable = [
        'influencer_id',
        'platform_id',
        'username',
        'followers',
    ];

    // RELASI: platform
    public function platform()
    {
        return $this->belongsTo(Platform::class, 'platform_id');
    }

    // RELASI: influencer
    public function influencer()
    {
        return $this->belongsTo(Influencer::class, 'influencer_id');
    }
}
