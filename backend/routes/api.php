<?php

use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Route;
use App\Exports\KoordinatorTemplate;
use App\Exports\RelawanTemplate;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RelawanController;
use App\Http\Controllers\Api\WilayahController;
use App\Http\Controllers\Api\KunjunganController;
use App\Http\Controllers\Api\CoordinatorController;
use App\Http\Controllers\Api\RelawanHistoryController;
use App\Http\Controllers\Api\PetaSuaraController;
use App\Http\Controllers\Api\OrmasController;
use App\Http\Controllers\Api\SuaraController;
use App\Http\Controllers\Api\PetaPartaiController;
use App\Http\Controllers\Api\DptController;
use App\Http\Controllers\Api\AnalisisPaslonController;
use App\Http\Controllers\Api\Analisis;
use App\Http\Controllers\Api\HistoryController;
use App\Http\Controllers\Api\TicketVoteController;


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
    Route::get('/', [KunjunganController::class, 'index']);
    Route::get('/{id}', [KunjunganController::class, 'show']);
    Route::put('/{id}', [KunjunganController::class, 'update']);
    Route::delete('/{id}', [KunjunganController::class, 'destroy']);
    Route::post('/{kunjungan_id}/anggota', [KunjunganController::class, 'tambahAnggota']);
    Route::put('/anggota/{anggota_id}', [KunjunganController::class, 'updateAnggota']);
    Route::delete('/anggota/{anggota_id}', [KunjunganController::class, 'hapusAnggota']);
    Route::post('/{kunjungan_id}/selesai', [KunjunganController::class, 'selesaikanKunjungan']);
    Route::post('/ocr-ktp', [KunjunganController::class, 'ocrKtp']);
});

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
    });
    Route::prefix('suara')->group(function () {
        Route::get('/paslon', [SuaraController::class, 'paslonCard']);
        Route::get('/diagram-paslon', [SuaraController::class, 'diagramPaslon']);
        Route::get('/diagram-partai', [SuaraController::class, 'diagramPartai']);
    });
    Route::prefix('peta')->group(function () {
        Route::get('/paslon', [PetaSuaraController::class, 'perKelurahan']);
        Route::get('/dpt-villages', [DptController::class, 'dptVillage']);
        Route::get('/dpt-district', [DptController::class, 'dptDistrict']);
        Route::get('/partai/kecamatan', [PetaPartaiController::class, 'perKecamatan']);
    });
    Route::prefix('analisis')->group(function () {
        Route::get('/straight-ticket/district', [Analisis::class, 'straightTicketByDistrict']);
    });
    Route::get('/activity-logs', [HistoryController::class, 'index']);
    Route::get('/straight/jakarta-utara', [TicketVoteController::class, 'jakartaUtaraPerKecamatan']);
});

Route::middleware(['auth:sanctum', 'role:koordinator'])->group(function () {
    Route::prefix('relawan')->group(function () {
        Route::post('/import', [RelawanController::class, 'import']);
        Route::post('/', [RelawanController::class, 'store']);
        Route::put('/{id}', [RelawanController::class, 'update']);
        Route::delete('/{id}', [RelawanController::class, 'destroy']);
    });
});

Route::middleware(['auth:sanctum'])->group(function () {
    Route::prefix('relawan')->group(function () {
        Route::post('/export-all', [RelawanController::class, 'export']);
        Route::get('/', [RelawanController::class, 'index']);
        Route::get('/{id}', [RelawanController::class, 'show']);
    });
});