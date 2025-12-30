<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\VisitForm;

class Relawan extends Model
{
    protected $table = 'relawans';
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'koordinator_id',
        'ormas_id',
        'province_code',
        'city_code',
        'district_code',
        'village_code',
        'nama',
        'nik',
        'no_hp',
        'alamat',
        'tps',
        'status'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function koordinator()
    {
        return $this->belongsTo(Coordinator::class);
    }

    public function ormas()
    {
        return $this->belongsTo(Ormas::class);
    }

    public function province()
    {
        return $this->belongsTo(Province::class, 'province_code', 'province_code');
    }

    public function city()
    {
        return $this->belongsTo(City::class, 'city_code', 'city_code');
    }

    public function district()
    {
        return $this->belongsTo(District::class, 'district_code', 'district_code');
    }

    public function village()
    {
        return $this->belongsTo(Village::class, 'village_code', 'village_code');
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function campaignRelawans()
    {
        return $this->hasMany(CampaignRelawan::class);
    }

    public function visitForms()
    {
        return $this->hasMany(VisitForm::class, 'relawan_id');
    }
}
