<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\History;
use Illuminate\Http\Request;

class HistoryController extends Controller
{
    public function index(Request $request)
    {
        $query = History::with('user:id,name,role')
            ->orderBy('created_at', 'desc');

        if ($request->target_type) {
            $query->where('target_type', $request->target_type);
        }

        if ($request->action) {
            $query->where('action', $request->action);
        }

        $histories = $query->paginate($request->per_page ?? 10);

        $histories->getCollection()->transform(function ($item) {
            $item->message = $this->buildMessage($item);
            return $item;
        });

        return response()->json([
            'status' => true,
            'data' => $histories
        ]);
    }

    private function buildMessage(History $h)
    {
        $actor = $h->user?->name ?? 'Sistem';
        $role  = $h->role;

        if ($h->target_type === 'koordinator') {

            if ($h->action === 'CREATE') {
                return "({$role}) {$actor} menambahkan koordinator {$h->target_name} wilayah "
                    . "{$h->meta['kelurahan']}, {$h->meta['kecamatan']}, {$h->meta['kota']}";
            }

            if ($h->action === 'UPDATE') {
                return "({$role}) {$actor} mengubah koordinator {$h->target_name} "
                    . "{$h->field} dari '{$h->old_value}' menjadi '{$h->new_value}'";
            }

            if ($h->action === 'DELETE') {
                return "({$role}) {$actor} menghapus koordinator {$h->target_name} wilayah "
                    . "{$h->meta['kelurahan']}, {$h->meta['kecamatan']}, {$h->meta['kota']}";
            }

            if ($h->action === 'EXPORT') {
                return "({$role}) {$actor} mengekspor data koordinator";
            }

            if ($h->action === 'IMPORT') {
                return "({$role}) {$actor} mengimpor data koordinator sebanyak "
                    . ($h->meta['jumlah_data'] ?? 0) . " data";
            }
        }

        if ($h->target_type === 'relawan') {

            if ($h->action === 'CREATE') {
                return "koordinator {$actor} menambahkan relawan {$h->target_name} wilayah "
                    . "{$h->meta['kelurahan']}, {$h->meta['kecamatan']}, {$h->meta['kota']}";
            }

            if ($h->action === 'UPDATE') {
                return "koordinator {$actor} mengubah relawan {$h->target_name} "
                    . "{$h->field} dari '{$h->old_value}' menjadi '{$h->new_value}'";
            }

            if ($h->action === 'DELETE') {
                return "koordinator {$actor} menghapus relawan {$h->target_name} wilayah "
                    . "{$h->meta['kelurahan']}, {$h->meta['kecamatan']}, {$h->meta['kota']}";
            }

            if ($h->action === 'EXPORT') {
                return "koordinator {$actor} mengekspor data relawan";
            }

            if ($h->action === 'IMPORT') {
                return "koordinator {$actor} mengimpor data relawan sebanyak "
                    . ($h->meta['jumlah_data'] ?? 0) . " data";
            }
        }

        return "{$actor} melakukan aksi {$h->action}";
    }
}
