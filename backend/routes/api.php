<?php

use Illuminate\Http\Request;
use App\Models\ContentStatus;
use App\Exports\RelawanTemplate;
use App\Exports\KoordinatorTemplate;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Analisis;
use App\Http\Controllers\Api\DptController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OrmasController;
use App\Http\Controllers\Api\SuaraController;
use App\Http\Controllers\Api\BudgetController;
use App\Http\Controllers\Api\HistoryController;
use App\Http\Controllers\Api\RelawanController;
use App\Http\Controllers\Api\WilayahController;
use App\Http\Controllers\Api\KunjunganController;
use App\Http\Controllers\Api\PetaSuaraController;
use App\Http\Controllers\Api\EngagementController;
use App\Http\Controllers\Api\InfluencerController;
use App\Http\Controllers\Api\PetaPartaiController;
use App\Http\Controllers\Api\TicketVoteController;
use App\Http\Controllers\Api\ContentPlanController;
use App\Http\Controllers\Api\ContentTypeController;
use App\Http\Controllers\Api\CoordinatorController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\AnalisisPaslonController;
use App\Http\Controllers\Api\RelawanHistoryController;
use App\Http\Controllers\Api\ContentPlatformController;

Route::post('/login', [AuthController::class, 'login'])->name('login');
Route::middleware('auth:sanctum')->get('/me', function (Request $request) {
    return $request->user();
});

Route::middleware(['auth:sanctum', 'role:koordinator'])->get('/me/wilayah', [AuthController::class, 'wilayah']);

Route::prefix('wilayah')->group(function () {
    Route::get('/', [WilayahController::class, 'index']);
    Route::get('cities/{province}', [WilayahController::class, 'cities']);
    Route::get('districts/{city}', [WilayahController::class, 'districts']);
    Route::get('villages/{district}', [WilayahController::class, 'villages']);
    Route::get('pekerjaan', [WilayahController::class, 'pekerjaan']);
});

Route::middleware(['auth:sanctum', 'role:relawan'])->prefix('kunjungan')->group(function () {
    Route::post('/', [KunjunganController::class, 'store']);
    Route::put('/{id}', [KunjunganController::class, 'update']);
    Route::delete('/{id}', [KunjunganController::class, 'destroy']);
    Route::post('/{kunjungan_id}/anggota', [KunjunganController::class, 'tambahAnggota']);
    Route::put('/anggota/{anggota_id}', [KunjunganController::class, 'updateAnggota']);
    Route::delete('/anggota/{anggota_id}', [KunjunganController::class, 'hapusAnggota']);
    Route::post('/{kunjungan_id}/selesai', [KunjunganController::class, 'selesaikanKunjungan']);
    Route::post('/ocr-ktp', [KunjunganController::class, 'ocrKtp']);
});

Route::middleware(['auth:sanctum', 'role:relawan|koordinator'])->prefix('kunjungan')->group(function () {
    Route::get('/', [KunjunganController::class, 'index']);
    Route::get('/{id}', [KunjunganController::class, 'show']);
});

Route::middleware(['auth:sanctum', 'role:koordinator'])->prefix('kunjungan')->group(function () {
    Route::get('/batch/next', [KunjunganController::class, 'getNextBatch']);
    Route::post('/{id}/verifikasi', [KunjunganController::class, 'verifikasi']);
});

// Message routes - Disabled requested by user
// Route::middleware(['auth:sanctum'])->prefix('kunjungan')->group(function () {
//     Route::get('/{id}/messages', [\App\Http\Controllers\Api\VisitMessageController::class, 'index']);
//     Route::post('/{id}/messages', [\App\Http\Controllers\Api\VisitMessageController::class, 'store']);
// });

Route::get('/koordinator/template', function () {
    return Excel::download(
        new KoordinatorTemplate,
        'template_koordinator.xlsx'
    );
});

Route::get('/relawan/template', function () {
    return Excel::download(
        new RelawanTemplate,
        'template_relawan.xlsx'
    );
});

Route::get('/ormas', [OrmasController::class, 'index']);

Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::prefix('koordinator')->name('koordinator.')->group(function () {
        Route::post('/export', [CoordinatorController::class, 'exportAll']);
        Route::get('/', [CoordinatorController::class, 'index']);
        Route::get('/{id}', [CoordinatorController::class, 'show']);
        Route::post('/', [CoordinatorController::class, 'store']);
        Route::put('/{id}', [CoordinatorController::class, 'update']);
        Route::delete('/{id}', [CoordinatorController::class, 'destroy']);
        Route::get('/{id}/history', [CoordinatorController::class, 'history']);
        Route::post('/import', [CoordinatorController::class, 'import']);
        Route::post('/check-nik', [CoordinatorController::class, 'checkNik']);
        Route::post('/restore', [CoordinatorController::class, 'restoreByNik']);
    });
    Route::middleware(['auth:sanctum', 'role:relawan'])->prefix('kunjungan')->group(function () {
        Route::get('/summary-kunjungan', [KunjunganController::class, 'index']);
    });
    Route::prefix('suara')->group(function () {
        Route::get('/paslon', [SuaraController::class, 'paslonCard']);
        Route::get('/diagram-paslon', [SuaraController::class, 'diagramPaslon']);
        Route::get('/diagram-partai', [SuaraController::class, 'diagramPartai']);
    });
    Route::prefix('peta')->group(function () {
        Route::prefix('paslon')->group(function () {
            Route::get('/kota', [PetaSuaraController::class, 'perKota']);
            Route::get('/kecamatan', [PetaSuaraController::class, 'perKecamatan']);
            Route::get('/kelurahan', [PetaSuaraController::class, 'perKelurahan']);
            Route::get('/', [PetaSuaraController::class, 'perKelurahan']); // backward compatibility
        });
        Route::prefix('dpt')->group(function () {
            Route::get('/kota', [DptController::class, 'dptCity']);
            Route::get('/kecamatan', [DptController::class, 'dptDistrict']);
            Route::get('/kelurahan', [DptController::class, 'dptVillage']);
        });
        Route::prefix('partai')->group(function () {
            Route::get('/kota', [PetaPartaiController::class, 'perKota']);
            Route::get('/kecamatan', [PetaPartaiController::class, 'perKecamatan']);
        });
    });
    Route::prefix('analisis')->group(function () {
        Route::get('/straight-ticket/district', [Analisis::class, 'straightTicketByDistrict']);
    });
    Route::get('/activity-logs', [HistoryController::class, 'index']);
    Route::get('/straight/jakarta-utara', [TicketVoteController::class, 'jakartaUtaraPerKecamatan']);

    Route::prefix('content-plans')->group(function () {
        Route::get('/', [ContentPlanController::class, 'index']);
        Route::get('/{id}', [ContentPlanController::class, 'show']);
        Route::post('/', [ContentPlanController::class, 'store']);
        Route::put('/{id}', [ContentPlanController::class, 'update']);
        Route::delete('/{id}', [ContentPlanController::class, 'destroy']);
        Route::post('/{id}/post', [ContentPlanController::class, 'postContent']);
        Route::get('/{id}/analytics', [EngagementController::class, 'analyticContent']);
        Route::post('/{id}/analytics/record', [EngagementController::class, 'store']);
        Route::put('/{id}/analytics/record/{engagementId}', [EngagementController::class, 'update']);

    });

    Route::get('/budget', [BudgetController::class, 'index']);
    Route::get('/platforms', [ContentPlatformController::class, 'index']);
    Route::get('/content-types', [ContentTypeController::class, 'index']);
    Route::get('/influencers', [InfluencerController::class, 'index']);
    Route::get('/content-statuses', function () {return ContentStatus::select('id', 'label')->get();
});
});

Route::middleware(['auth:sanctum', 'role:koordinator'])->group(function () {
    Route::prefix('relawan')->group(function () {
        Route::post('/import', [RelawanController::class, 'import']);
        Route::post('/', [RelawanController::class, 'store']);
        Route::put('/{id}', [RelawanController::class, 'update']);
        Route::delete('/{id}', [RelawanController::class, 'destroy']);
        Route::post('/check-nik', [RelawanController::class, 'checkNik']);
        Route::post('/restore', [RelawanController::class, 'restoreByNik']);
    });
});

Route::middleware(['auth:sanctum'])->group(function () {
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::post('/read-all', [NotificationController::class, 'markAllAsRead']);
        Route::post('/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::delete('/{id}', [NotificationController::class, 'destroy']);
    });

    Route::prefix('relawan')->group(function () {
        Route::post('/export-all', [RelawanController::class, 'export']);
        Route::get('/', [RelawanController::class, 'index']);
        Route::get('/{id}', [RelawanController::class, 'show']);
    });
});
