<?php

namespace App\Exports;

use App\Models\Coordinator;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;

class KoordinatorExport implements FromCollection, WithHeadings, ShouldAutoSize, WithEvents
{
    public function collection()
    {
        return Coordinator::with(['user', 'village'])
            ->whereHas('user')
            ->get()
            ->map(function ($koor) {
                return [
                    'nama_koordinator' => $koor->nama,
                    'email' => $koor->user->email,
                    'password' => $koor->user->plain_password,
                    'kelurahan' => $koor->village?->village,
                ];
            })
            ->values();
    }

    public function headings(): array
    {
        return ['Nama', 'Email', 'Password', 'Kelurahan'];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                // HEADER BOLD
                $event->sheet->getStyle('A1:D1')->getFont()->setBold(true);
                
                // Optional: wrap text
                $event->sheet->getStyle('A:D')->getAlignment()->setWrapText(true);
            },
        ];
    }
}
