<?php

namespace App\Exports;

use App\Models\Relawan;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class RelawanDetailExport implements FromCollection, WithHeadings
{
    protected $id;

    public function __construct($id)
    {
        $this->id = $id;
    }

    public function collection()
    {
        $relawan = Relawan::with('user')->find($this->id);

        // Jika relawan tidak ditemukan, buat baris kosong
        if (!$relawan) {
            return collect([[
                'Email' => '',
                'Password' => ''
            ]]);
        }

        return collect([[
            'Email' => $relawan->user->email ?? '',
            'Password' => $relawan->user->plain_password ?? '',
        ]]);
    }

    public function headings(): array
    {
        return ['Email', 'Password'];
    }
}
