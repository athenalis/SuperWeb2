<?php
require __DIR__ . '/backend/vendor/autoload.php';
$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->handle(Illuminate\Http\Request::capture());

use Illuminate\Support\Facades\DB;

$results = DB::select("
    SELECT 
        TABLE_NAME, 
        COLUMN_NAME, 
        CONSTRAINT_NAME, 
        REFERENCED_TABLE_NAME, 
        REFERENCED_COLUMN_NAME
    FROM
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE
        REFERENCED_TABLE_SCHEMA = 'relawan_db' AND
        TABLE_NAME = 'keluarga_members';
");

foreach ($results as $r) {
    echo "{$r->COLUMN_NAME} -> {$r->REFERENCED_TABLE_NAME}.{$r->REFERENCED_COLUMN_NAME} ({$r->CONSTRAINT_NAME})\n";
}
