<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Paslon extends Model
{
    protected $table = 'master_paslon';

    protected $casts = [
        'party_code' => 'array',
        'party' => 'array',
    ];
}
