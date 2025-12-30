import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import api from "../../lib/axios";

export default function KunjunganIndex() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  // === STATS ===
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
  });

  useEffect(() => {
    fetchKunjungan();
  }, []);

  const fetchKunjungan = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/kunjungan?page=${page}`);

      if (res.data.success) {
        const items = res.data.data.data;

        setData(items);

        // === HITUNG STATISTIK ===
        setStats({
          total: res.data.data.total,
          pending: items.filter(i => i.status_verifikasi === "pending").length,
          accepted: items.filter(i => i.status_verifikasi === "accepted").length,
        });

        setPagination({
          current_page: res.data.data.current_page,
          last_page: res.data.data.last_page,
          total: res.data.data.total,
        });
      }
    } catch (err) {
      console.error("Fetch kunjungan failed:", err);
      setError("Gagal mengambil data kunjungan");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data kunjungan ini? Semua data terkait (anggota, jawaban) juga akan dihapus.")) {
      try {
        const res = await api.delete(`/kunjungan/${id}`);
        if (res.data.success) {
          setData(data.filter(item => item.id !== id));
        }
      } catch (err) {
        console.error("Delete failed:", err);
        alert("Gagal menghapus data kunjungan");
      }
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  // === STATUS STYLE ===
  const getStatusColor = (item) => {
    switch (item.status_verifikasi) {
      case "accepted":
        return "border-green-500 text-green-700 bg-green-50";
      case "rejected":
        return "border-red-500 text-red-700 bg-red-50";
      default:
        return "border-amber-500 text-amber-700 bg-amber-50";
    }
  };

  const getStatusLabel = (item) => {
    switch (item.status_verifikasi) {
      case "accepted":
        return "Disetujui";
      case "rejected":
        return "Ditolak";
      default:
        return "Pending";
    }
  };

  return (
    <div className="space-y-6 text-slate-900">

      
      {/* ===== SUMMARY CARDS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Total */}
        <div className="p-6 bg-white border-l-4 border-blue-600 rounded-l shadow-md">
          <h3 className="text-sm text-slate-600">Total Kunjungan</h3>
          <p className="text-3xl font-bold text-blue-900 mt-2">{stats.total}</p>
        </div>

        {/* Pending */}
        <div className="p-6 bg-white border-l-4 border-amber-500 rounded-l shadow-md">
          <h3 className="text-sm text-slate-600">Menunggu Verifikasi</h3>
          <p className="text-3xl font-bold text-amber-700 mt-2">{stats.pending}</p>
        </div>

        {/* Accepted */}
        <div className="p-6 bg-white border-l-4 border-green-600 rounded-l shadow-md">
          <h3 className="text-sm text-slate-600">Disetujui</h3>
          <p className="text-3xl font-bold text-green-700 mt-2">{stats.accepted}</p>
        </div>

      </div>

      {/* HEADER */}
      <div className="bg-white rounded-lg p-7 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-blue-900">Data Kunjungan</h1>
          <p className="text-sm text-slate-500 mt-1">
            Daftar aktivitas kunjungan lapangan Anda
          </p>
        </div>

        {(role === "relawan" || role === "koordinator") && (
          <button
            onClick={() => navigate("/kunjungan/anggota")}
            className="bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-all shadow-md flex items-center gap-2 whitespace-nowrap"
          >
            <Icon icon="mdi:plus" width="22" />
            Buat Kunjungan
          </button>
        )}
      </div>


      {/* CONTENT */}
      {loading ? (
        <div className="bg-white rounded-xl shadow p-20 text-center">
          <div className="animate-spin inline-block w-10 h-10 border-4 border-blue-900 border-t-transparent rounded-full mb-4"></div>
          <p className="text-slate-500">Memuat data kunjungan...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl shadow p-10 text-center border-t-4 border-red-500">
          <Icon icon="mdi:alert-circle-outline" width="48" className="mx-auto text-red-500 mb-2" />
          <h3 className="text-lg font-semibold text-slate-800">{error}</h3>
          <button onClick={() => fetchKunjungan()} className="mt-4 px-4 py-2 bg-blue-100 text-blue-900 rounded-lg hover:bg-blue-200">
            Coba Lagi
          </button>
        </div>

      ) : data.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-10 text-center">
          <Icon icon="mdi:map-marker-path" width="64" className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-lg font-semibold text-slate-700">Belum ada data kunjungan</h2>
          <p className="text-sm text-slate-500 mt-2">
            Silakan buat kunjungan baru untuk mulai mencatat aktivitas lapangan.
          </p>
        </div>

      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">

          {/* DESKTOP TABLE */}
          <div className="hidden md:block overflow-x-auto text-slate-800">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Kepala Keluarga</th>
                  <th className="px-6 py-4">NIK</th>
                  <th className="px-6 py-4">Alamat</th>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-sm">
                {data.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">

                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 text-base">{item.nama}</div>
                      <div className="text-xs text-slate-500 font-medium tracking-tight">
                        {item.family_form?.members_count || 0} Anggota Keluarga
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-600 font-medium">{item.nik}</td>

                    <td className="px-6 py-4 max-w-xs truncate text-slate-600 font-medium" title={item.alamat}>
                      {item.alamat}
                    </td>

                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {formatDate(item.created_at)}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${getStatusColor(item)}`}>
                        {getStatusLabel(item)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">

                        <button
                          onClick={() => navigate(`/kunjungan/${item.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title="Detail"
                        >
                          <Icon icon="mdi:eye" width="20" />
                        </button>

                        <button
                          onClick={() => navigate(`/kunjungan/${item.id}/edit`)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
                          title="Edit"
                        >
                          <Icon icon="mdi:pencil" width="20" />
                        </button>

                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Hapus"
                        >
                          <Icon icon="mdi:trash-can" width="20" />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE LIST */}
          <div className="md:hidden divide-y divide-slate-100">
            {data.map(item => (
              <div key={item.id} className="p-4 space-y-3">

                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900">{item.nama}</h3>
                    <p className="text-xs text-slate-500">{item.nik}</p>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(item)}`}>
                    {getStatusLabel(item)}
                  </span>
                </div>

                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <Icon icon="mdi:map-marker" className="mt-0.5 shrink-0" width="16" />
                  <p className="line-clamp-2">{item.alamat}</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-slate-500 font-medium">
                    {formatDate(item.created_at)} • {item.family_form?.members_count || 0} Anggota
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/kunjungan/${item.id}`)}
                      className="p-2 bg-blue-50 text-blue-600 rounded-lg"
                    >
                      <Icon icon="mdi:eye" width="18" />
                    </button>

                    <button
                      onClick={() => navigate(`/kunjungan/${item.id}/edit`)}
                      className="p-2 bg-amber-50 text-amber-600 rounded-lg"
                    >
                      <Icon icon="mdi:pencil" width="18" />
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 bg-red-50 text-red-600 rounded-lg"
                    >
                      <Icon icon="mdi:trash-can" width="18" />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* PAGINATION */}
          {pagination && pagination.last_page > 1 && (
            <div className="px-6 py-4 bg-slate-50 border-t flex items-center justify-between">

              <span className="hidden sm:inline text-xs text-slate-500 italic">
                Menampilkan {data.length} dari {pagination.total} data
              </span>

              <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end">

                <button
                  disabled={pagination.current_page === 1}
                  onClick={() => fetchKunjungan(pagination.current_page - 1)}
                  className="px-3 py-1 bg-white border border-slate-300 rounded text-xs hover:bg-slate-100 disabled:opacity-50"
                >
                  Prev
                </button>

                <div className="px-3 py-1 bg-blue-900 text-white rounded text-xs font-bold">
                  {pagination.current_page}
                </div>

                <button
                  disabled={pagination.current_page === pagination.last_page}
                  onClick={() => fetchKunjungan(pagination.current_page + 1)}
                  className="px-3 py-1 bg-white border border-slate-300 rounded text-xs hover:bg-slate-100 disabled:opacity-50"
                >
                  Next
                </button>

              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
