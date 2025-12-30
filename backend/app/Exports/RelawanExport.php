<?php

namespace App\Exports;

use App\Models\Relawan;
use App\Models\Coordinator;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;

class RelawanExport implements
    FromCollection,
    WithHeadings,
    ShouldAutoSize,
    WithCustomStartCell,
    WithEvents
{
    protected string $mode; // admin | koordinator
    protected ?int $koordinatorId;
    protected ?string $namaKoordinator;

    public function __construct(string $mode = 'admin', int $koordinatorId = null)
    {
        $this->mode = $mode;
        $this->koordinatorId = $koordinatorId;

        if ($mode === 'koordinator' && $koordinatorId) {
            $this->namaKoordinator = Coordinator::where('id', $koordinatorId)
                ->value('nama');
        }
    }

    /* =======================
        START CELL
    ======================= */
    public function startCell(): string
    {
        return $this->mode === 'koordinator' ? 'A3' : 'A1';
    }

    /* =======================
        DATA
    ======================= */
    public function collection()
    {
        $query = Relawan::with(['user', 'village', 'koordinator']);

        if ($this->mode === 'koordinator') {
            $query->where('koordinator_id', $this->koordinatorId);
        }

        return $query->get()->map(function ($relawan) {
            // ================= ADMIN =================
            if ($this->mode === 'admin') {
                return [
                    $relawan->koordinator->nama ?? '-',
                    $relawan->nama,
                    $relawan->user->email ?? '-',
                    $relawan->user->plain_password ?? '-',
                    $relawan->village->village ?? '-',
                ];
            }

            // ================= KOORDINATOR =================
            return [
                $relawan->nama,
                $relawan->user->email ?? '-',
                $relawan->user->plain_password ?? '-',
                $relawan->village->village ?? '-',
            ];
        });
    }

    /* =======================
        HEADINGS
    ======================= */
    public function headings(): array
    {
        if ($this->mode === 'admin') {
            return [
                'Nama Koordinator',
                'Nama Relawan',
                'Email',
                'Password',
                'Kelurahan',
            ];
        }

        return [
            'Nama Relawan',
            'Email',
            'Password',
            'Kelurahan',
        ];
    }

    /* =======================
        EVENTS
    ======================= */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {

                // HEADER BOLD
                $headerRow = $this->mode === 'koordinator' ? 3 : 1;
                $lastCol   = $this->mode === 'admin' ? 'E' : 'D';

                $event->sheet
                    ->getStyle("A{$headerRow}:{$lastCol}{$headerRow}")
                    ->getFont()
                    ->setBold(true);

                // INFO KOORDINATOR (KHUSUS KOORDINATOR)
                if ($this->mode === 'koordinator') {
                    $event->sheet->setCellValue('A1', 'Koordinator');
                    $event->sheet->setCellValue('B1', $this->namaKoordinator);

                    $event->sheet
                        ->getStyle('A1:B1')
                        ->getFont()
                        ->setBold(true);
                }
            },
        ];
    }
}
