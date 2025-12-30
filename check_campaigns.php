<?php
require __DIR__ . '/backend/vendor/autoload.php';
$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->handle(Illuminate\Http\Request::capture());

use Illuminate\Support\Facades\DB;

$count = DB::table('campaigns')->count();
$list = DB::table('campaigns')->get();
echo "Total campaigns: $count\n" . json_encode($list) . "\n";
