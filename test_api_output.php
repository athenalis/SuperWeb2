<?php
require __DIR__ . '/backend/vendor/autoload.php';
$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
// Mock auth for testing if possible, or just check the query logic
use App\Models\VisitForm;
use Illuminate\Support\Facades\DB;

// If we can't easily mock auth, just dump the query structure results manually
$data = VisitForm::with(['familyForm.members', 'relawan', 'campaign', 'task', 'familyForm' => function ($q) {
    $q->withCount('members');
}])->latest()->first();

echo json_encode($data, JSON_PRETTY_PRINT);
