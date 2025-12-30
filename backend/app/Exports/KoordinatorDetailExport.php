<?php

namespace App\Exports;

use App\Models\Coordinator;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class KoordinatorDetailExport implements FromCollection, WithHeadings
{
    protected $id;

    public function __construct($id)
    {
        $this->id = $id;
    }

    public function collection()
    {
        $koordinator = Coordinator::with('user')->findOrFail($this->id);

        return collect([
            [
                'Email' => $koordinator->user->email ?? '',
                'Password' => $koordinator->user->plain_password ?? '',
            ]
        ]);
    }

    public function headings(): array
    {
        return ['Email', 'Password'];
    }
}
