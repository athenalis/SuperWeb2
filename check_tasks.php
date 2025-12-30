<?php
require __DIR__ . '/backend/vendor/autoload.php';
$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->handle(Illuminate\Http\Request::capture());

use Illuminate\Support\Facades\DB;

$count = DB::table('tasks')->count();
$statuses = DB::table('tasks')->select('status')->distinct()->get();
echo "Total tasks: $count\nStatuses found: " . json_encode($statuses) . "\n";
