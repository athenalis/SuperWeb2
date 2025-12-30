<?php
require __DIR__ . '/backend/vendor/autoload.php';
$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->handle(Illuminate\Http\Request::capture());

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$table = 'kunjungan_forms';
$output = "--- TABLE: $table ---\n";
if (Schema::hasTable($table)) {
    $columns = DB::select("DESCRIBE $table");
    foreach ($columns as $c) {
        $output .= sprintf(
            "%-20s | %-20s | Null: %-3s | Key: %-3s | Default: %s\n",
            $c->Field,
            $c->Type,
            $c->Null,
            $c->Key,
            $c->Default
        );
    }
}

file_put_contents('schema_kunjungan.txt', $output);
echo "Schema dumped to schema_kunjungan.txt\n";
