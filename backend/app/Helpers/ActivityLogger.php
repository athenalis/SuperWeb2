<?php

namespace App\Helpers;

use App\Models\History;
use Illuminate\Support\Facades\Auth;

class ActivityLogger
{
    public static function log(array $data)
    {
        $user = Auth::user();

        History::create([
            'user_id' => $user?->id,
            'role' => $user?->role,
            'action' => $data['action'],
            'target_type' => $data['target_type'] ?? null,
            'target_name' => $data['target_name'] ?? null,
            'field' => $data['field']  ?? $data['target_type'] ?? '-',
            'old_value' => $data['old_value'] ?? null,
            'new_value' => $data['new_value'] ?? null,
            'meta' => $data['meta'] ?? null,
        ]);
    }
}
