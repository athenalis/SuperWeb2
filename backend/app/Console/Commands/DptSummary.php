<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DptSummary extends Command
{
    protected $signature = 'dpt:summary {level=city}';
    protected $description = 'Generate DPT summary table (city | district | village)';

    public function handle()
    {
        $level = strtoupper($this->argument('level'));

        match ($level) {
            'CITY'     => $this->summaryCity(),
            'DISTRICT' => $this->summaryDistrict(),
            'VILLAGE'  => $this->summaryVillage(),
            default    => $this->error('Level harus city | district | village'),
        };

        $this->info("DPT summary {$level} selesai");
    }

    private function summaryCity()
    {
        DB::table('dpt_summary_cities')->truncate();

        DB::insert("
            INSERT INTO dpt_summary_cities
            SELECT
                c.province_code,
                c.id AS city_code,
                r.area_km2,
                COUNT(d.id) AS total_dpt,
                IF(r.area_km2 > 0, ROUND(COUNT(d.id)/r.area_km2, 2), 0),
                NOW()
            FROM cities c
            JOIN provinces p ON p.id = c.province_code
            JOIN regions r
            ON r.level = 'CITY'
            AND r.city = c.city
            LEFT JOIN dpt d
            ON d.city_code = c.id
            GROUP BY c.province_code, c.id, r.area_km2
        ");
    }

    private function summaryDistrict()
    {
        DB::table('dpt_summary_districts')->truncate();

        DB::insert("
            INSERT INTO dpt_summary_districts
            SELECT
                dct.province_code,
                dct.city_code,
                dct.id AS district_code,
                r.area_km2,
                COUNT(d.id) AS total_dpt,
                IF(r.area_km2 > 0, ROUND(COUNT(d.id)/r.area_km2, 2), 0),
                NOW()
            FROM districts dct
            JOIN provinces p ON p.id = dct.province_code
            JOIN cities c ON c.id = dct.city_code
            JOIN regions r
            ON r.level = 'DISTRICT'
            AND r.city = c.city
            AND r.district = dct.district
            LEFT JOIN dpt d
            ON d.district_code = dct.id
            GROUP BY dct.province_code, dct.city_code, dct.id, r.area_km2
        ");
    }

    private function summaryVillage()
    {
        DB::table('dpt_summary_villages')->truncate();

        DB::insert("
            INSERT INTO dpt_summary_villages
            SELECT
                v.province_code,
                v.city_code,
                v.district_code,
                v.id AS village_code,
                r.area_km2,
                COUNT(d.id) AS total_dpt,
                IF(r.area_km2 > 0, ROUND(COUNT(d.id)/r.area_km2, 2), 0),
                NOW()
            FROM villages v
            JOIN provinces p ON p.id = v.province_code
            JOIN cities c ON c.id = v.city_code
            JOIN districts dct ON dct.id = v.district_code
            JOIN regions r
            ON r.level = 'VILLAGE'
            AND r.city = c.city
            AND r.district = dct.district
            AND r.village = v.village
            LEFT JOIN dpt d
            ON d.village_code = v.id
            GROUP BY
                v.province_code, v.city_code, v.district_code, v.id, r.area_km2
        ");
    }
}
