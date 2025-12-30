import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../../lib/axios";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";

export default function Koordinator() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [openImport, setOpenImport] = useState(false);
  const [file, setFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [openExportModal, setOpenExportModal] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deleteError, setDeleteError] = useState(null);


  // ================= PAGINATION (TAMBAHAN) =================
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);

  // ================= WILAYAH =================
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [villages, setVillages] = useState([]);

  // ================= FILTER =================
  const [filters, setFilters] = useState({
    nik: "",
    nama: "",
    city_code: "",
    district_code: "",
    village_code: "",
    tps: "",
  });

  const [activeFilters, setActiveFilters] = useState({});

  // Load Cities
  useEffect(() => {
    api.get("/wilayah/cities/31").then((res) => setCities(res.data));
  }, []);

  const loadDistricts = async (cityCode) => {
    if (!cityCode) {
      setDistricts([]);
      return;
    }
    const res = await api.get(`/wilayah/districts/${cityCode}`);
    setDistricts(res.data.data ?? res.data);
  };

  const loadVillages = async (districtCode) => {
    if (!districtCode) {
      setVillages([]);
      return;
    }
    const res = await api.get(`/wilayah/villages/${districtCode}`);
    setVillages(res.data.data ?? res.data);
  };

  // ================= FETCH =================
  const fetchKoordinators = async () => {
    const res = await api.get("/koordinator", {
      params: activeFilters,
    });
    return res.data.data;
  };

  const {
    data: koordinators = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["koordinators", activeFilters],
    queryFn: fetchKoordinators,
  });

  // reset page saat data berubah
  useEffect(() => {
    setPage(1);
  }, [perPage, koordinators, filters.nama, filters.nik, filters.tps]);

  const matchNama = (nama, keyword) => {
    if (!keyword) return true;
    return nama.toLowerCase().includes(keyword.toLowerCase().trim());
  };

  const matchNik = (nik, keyword) => {
    if (!keyword) return true;
    return String(nik).includes(keyword.trim());
  };

  const matchTps = (tps, keyword) => {
    if (!keyword) return true;
    const normalize = (val) => String(val).replace(/^0+/, "");
    return normalize(tps) === normalize(keyword);
  };

  const semanticFiltered = koordinators.filter((item) => {
    return (
      matchNama(item.nama ?? "", filters.nama) &&
      matchNik(item.nik ?? "", filters.nik) &&
      matchTps(item.tps ?? "", filters.tps)
    );
  });

  const totalPage = Math.ceil(semanticFiltered.length / perPage);

  const paginatedData = semanticFiltered.slice(
    (page - 1) * perPage,
    page * perPage
  );

  const pages = Array.from({ length: totalPage }, (_, i) => i + 1);

  // ================= FILTER ACTION =================
  const applyFilter = () => {
    setActiveFilters(filters);
  };

  const resetFilter = () => {
    setFilters({
      nik: "",
      nama: "",
      city_code: "",
      district_code: "",
      village_code: "",
      tps: "",
    });
    setActiveFilters({});
    setDistricts([]);
    setVillages([]);
  };

  // ================= EXPORT =================
  const exportAllKoordinators = async () => {
    if (!exportPassword) {
      toast.error("Masukkan password terlebih dahulu");
      return;
    }

    const toastId = "export-koordinator";
    try {
      setExporting(true);
      toast.loading("Menyiapkan file Excel...", { id: toastId });

      const res = await api.post(
        "/koordinator/export",
        { password: exportPassword },
        { responseType: "blob" } // penting untuk file
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "koordinator_all.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Export akun berhasil", { id: toastId });
    } catch (err) {
      toast.error("Gagal export akun", { id: toastId });
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  // ================= IMPORT =================
  const importKoordinator = async () => {
    if (!file) {
      alert("Pilih file terlebih dahulu");
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/koordinator/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setImportResult(res.data.data);
      refetch();

      const successCount = res.data.data?.successCount ?? 0;
      if (successCount > 0) {
        alert(`Berhasil menambahkan ${successCount} koordinator!`);
        closeImportModal();
      }
    } catch {
      alert("Gagal import data");
    } finally {
      setImporting(false);
    }
  };

  const closeImportModal = () => {
    setOpenImport(false);
    setFile(null);
    setImportResult(null);
  };

  // ================= DELETE =================
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/koordinator/${id}`),

    onMutate: () => {
      setDeleteError(null);
      toast.loading("Menghapus koordinator...", { id: "delete-koor" });
    },

    onSuccess: () => {
      queryClient.invalidateQueries(["koordinators"]);
      toast.success("Koordinator berhasil dihapus", { id: "delete-koor" });
      setDeleteTarget(null);
    },

    onError: (err) => {
      toast.dismiss("delete-koor");

      if (err.response?.status === 422) {
        setDeleteError(err.response.data.message);
      } else {
        toast.error("Gagal menghapus koordinator");
      }
    },
  });

  return (
    <div className="space-y-6">

      {/* ================= HEADER ================= */}
      <div className="bg-white rounded-lg p-7 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-blue-900">Data Koordinator</h1>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setOpenImport(true)}
            className="bg-blue-500/15 text-blue-800 border border-blue-200/40 px-4 py-2 rounded-lg hover:bg-blue-500/25"
          >
            Import Data Koordinator
          </button>

          <button
            onClick={() => navigate("/koordinator/create")}
            className="bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800"
          >
            Tambah Koordinator +
          </button>
        </div>
      </div>

      {/* ================= FILTER ================= */}
      <div className="bg-white rounded-xl shadow p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Icon icon="mdi:filter-variant" className="text-blue-700" width="28" />
          <div>
            <div className="text-lg font-semibold">Filter Data</div>
            <div className="text-sm text-slate-400">
              Cari data berdasarkan kriteria
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <input
            className="border border-gray-400 px-5 py-3 rounded-lg"
            placeholder="Cari NIK..."
            value={filters.nik}
            onChange={(e) => setFilters({ ...filters, nik: e.target.value })}
          />

          <input
            className="border border-gray-400 px-5 py-3 rounded-lg"
            placeholder="Cari Nama..."
            value={filters.nama}
            onChange={(e) => setFilters({ ...filters, nama: e.target.value })}
          />

          <div className="relative">
            <Icon
              icon="mdi:chevron-down"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              width="22"
            />
            <select
              className={`w-full appearance-none border border-gray-400 pl-5 pr-12 py-3 rounded-lg ${filters.city_code ? "text-slate-800" : "text-slate-400"
                }`}
              value={filters.city_code}
              onChange={(e) => {
                const val = e.target.value;
                setFilters({
                  ...filters,
                  city_code: val,
                  district_code: "",
                  village_code: "",
                });
                loadDistricts(val);
              }}
            >
              <option value="">Pilih Kota/Kabupaten</option>
              {cities.map((c) => (
                <option key={c.city_code} value={c.city_code}>
                  {c.city}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Icon
              icon="mdi:chevron-down"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              width="22"
            />
            <select
              className={`w-full appearance-none border border-gray-400 pl-5 pr-12 py-3 rounded-lg ${filters.district_code ? "text-slate-800" : "text-slate-400"
                }`}
              value={filters.district_code}
              disabled={!filters.city_code}
              onChange={(e) => {
                const val = e.target.value;
                setFilters({
                  ...filters,
                  district_code: val,
                  village_code: "",
                });
                loadVillages(val);
              }}
            >
              <option value="">Pilih Kecamatan</option>
              {districts.map((d) => (
                <option key={d.district_code} value={d.district_code}>
                  {d.district}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Icon
              icon="mdi:chevron-down"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              width="22"
            />
            <select
              className={`w-full appearance-none border border-gray-400 pl-5 pr-12 py-3 rounded-lg ${filters.village_code ? "text-slate-800" : "text-slate-400"
                }`}
              value={filters.village_code}
              disabled={!filters.district_code}
              onChange={(e) =>
                setFilters({ ...filters, village_code: e.target.value })
              }
            >
              <option value="">Pilih Kelurahan</option>
              {villages.map((v) => (
                <option key={v.village_code} value={v.village_code}>
                  {v.village}
                </option>
              ))}
            </select>
          </div>

          <input
            className="border border-gray-400 px-5 py-3 rounded-lg"
            placeholder="Cari TPS..."
            value={filters.tps}
            onChange={(e) => setFilters({ ...filters, tps: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800"
            onClick={applyFilter}
          >
            <Icon icon="mdi:filter-variant" width={20} />
          </button>

          <button
            className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-500/25"
            onClick={resetFilter}
          >
            <Icon icon="mdi:refresh" width={20} />
          </button>

          <button
            onClick={() => setOpenExportModal(true)}
            disabled={exporting}
            className={`bg-blue-100 text-blue-800 px-6 py-3 rounded-lg ${exporting ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-500/25"
              }`}
          >
            {exporting ? "Mengunduh..." : "Export Akun"}
          </button>
        </div>
      </div>

      {/* PER PAGE */}
      <div className="flex items-center gap-2 text-sm">
        <span>Tampilkan</span>
        <select
          value={perPage}
          onChange={(e) => setPerPage(Number(e.target.value))}
          className="border rounded-lg px-3 py-1"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
        <span>data</span>
      </div>

      {/* ================= TABLE ================= */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-base">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-5 py-4 text-left">Nama</th>
              <th className="px-5 py-4 text-left hidden md:table-cell">NIK</th>
              <th className="px-5 py-4 text-left hidden md:table-cell">Wilayah</th>
              <th className="px-5 py-4 text-left hidden md:table-cell">No. HP</th>
              <th className="px-5 py-4 text-left hidden md:table-cell">TPS</th>
              <th className="px-5 py-4 text-left hidden md:table-cell">Status</th>
              <th className="px-5 py-4 text-left">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {isLoading && (
              <tr>
                <td colSpan="7" className="py-6 text-center">Loading...</td>
              </tr>
            )}

            {isError && (
              <tr>
                <td colSpan="7" className="py-6 text-center text-red-600">
                  Gagal memuat data
                </td>
              </tr>
            )}

            {paginatedData.map((item) => (
              <tr key={item.id} className="border-t hover:bg-slate-50">
                <td className="px-5 py-4 font-medium">{item.nama}</td>
                <td className="px-5 py-4 hidden md:table-cell">{item.nik}</td>
                <td className="px-5 py-4 hidden md:table-cell">
                  {item.village?.village || "-"}
                </td>
                <td className="px-5 py-4 hidden md:table-cell">{item.no_hp}</td>
                <td className="px-5 py-4 hidden md:table-cell">{item.tps}</td>
                <td className="px-5 py-4 hidden md:table-cell">
                  <span
                    className={`px-4 py-1.5 rounded-full text-sm ${item.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                      }`}
                  >
                    {item.status === "active" ? "Aktif" : "Tidak Aktif"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="w-9 h-9 flex items-center justify-center
                                rounded-lg text-red-600 border border-red-600
                                hover:bg-red-600 hover:text-white transition"
                    >
                      <Icon icon="solar:trash-bin-trash-outline" width={20} />
                    </button>

                    <button
                      onClick={() => navigate(`/koordinator/${item.id}`)}
                      className="h-9 px-4 flex items-center justify-center
                                text-blue-900 border border-blue-900
                                rounded-lg hover:bg-blue-800 hover:text-white transition"
                    >
                      Detail
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ================= PAGINATION ================= */}
        <div className="flex justify-between items-center px-6 py-4">
          {/* KIRI: INFO HALAMAN */}
          <div className="text-sm text-slate-500">
            Halaman {page} dari {totalPage}
          </div>

          {/* KANAN: KONTROL PAGINATION */}
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 border rounded-lg disabled:opacity-50"
            >
              Prev
            </button>

            {pages.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1 rounded-lg border
                  ${p === page
                    ? "bg-blue-900 text-white border-blue-900"
                    : "hover:bg-slate-100"
                  }`}
              >
                {p}
              </button>
            ))}

            <button
              disabled={page === totalPage}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 border rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ================= MODAL DELETE ================= */}
      {deleteTarget &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* BACKDROP */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setDeleteTarget(null)}
            />

            {/* MODAL */}
            <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 z-10">
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                Hapus Koordinator
              </h2>

              {/* ===== JIKA MASIH PUNYA RELAWAN ===== */}
              {deleteTarget.relawans_count > 0 ? (
                <div className="text-slate-700">
                  <p className="mb-4">
                    Koordinator
                    <span className="font-semibold">
                      {" "}“{deleteTarget.nama}”{" "}
                    </span>
                    masih mempunyai
                    <span className="font-semibold text-red-600">
                      {" "}{deleteTarget.relawans_count}{" "}
                    </span>
                    relawan.
                  </p>

                  <p className="text-sm text-slate-500">
                    Tolong hapus relawan terlebih dahulu sebelum menghapus koordinator.
                  </p>

                  <div className="flex justify-end mt-6">
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className="px-4 py-2 rounded-lg border border-slate-300
                           text-slate-600 hover:bg-slate-100 transition"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              ) : (
                /* ===== JIKA TIDAK PUNYA RELAWAN ===== */
                <>
                  <p className="text-slate-600 mb-6">
                    Yakin ingin menghapus koordinator
                    <span className="font-semibold text-slate-800">
                      {" "}“{deleteTarget.nama}”
                    </span>
                    ?
                  </p>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className="px-4 py-2 rounded-lg border border-slate-300
                           text-slate-600 hover:bg-slate-100 transition"
                    >
                      Batal
                    </button>

                    <button
                      onClick={() => {
                        deleteMutation.mutate(deleteTarget.id);
                        setDeleteTarget(null);
                      }}
                      className="px-5 py-2 rounded-lg bg-red-600 text-white
                           hover:bg-red-700 transition"
                    >
                      Hapus
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.getElementById("modal-root")
        )
      }
      
      {/* ================= MODAL IMPORT ================= */}
      {openImport &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeImportModal}
            />

            <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 z-10">
              <button
                onClick={closeImportModal}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <Icon icon="mdi:close" width="22" />
              </button>

              <h2 className="text-3xl text-blue-900 font-semibold mb-2">
                Import Data Koordinator
              </h2>

              <ol className="list-decimal list-inside text-md text-slate-600 space-y-1 mb-5">
                <li>Download template Excel</li>
                <li>Isi data sesuai format</li>
                <li>Upload file lalu klik Import</li>
              </ol>

              <button
                className="w-full border border-blue-600 text-blue-600
                           py-2.5 rounded-lg mb-7 hover:bg-blue-50"
                onClick={() =>
                  window.open("http://192.168.1.7:9000/api/koordinator/template")
                }
              >
                Download Template Excel
              </button>

              <label className="text-md font-medium mb-2 block">
                Upload File Excel
              </label>

              <input
                type="file"
                accept=".xls,.xlsx"
                className="w-full border rounded-lg px-4 py-2 text-sm mb-4"
                onChange={(e) => setFile(e.target.files[0])}
              />

              <button
                onClick={importKoordinator}
                className="w-full bg-blue-900 text-white py-3 rounded-lg hover:bg-blue-800"
              >
                Import Data
              </button>

              {importResult && importResult.failed_rows.length > 0 && (
                <div className="mt-6 max-h-64 overflow-y-auto border rounded-lg p-4 bg-red-50">
                  <h3 className="font-semibold text-red-700 mb-3">
                    Gagal Import ({importResult.failed_rows.length})
                  </h3>

                  <ul className="space-y-3 text-sm">
                    {importResult.failed_rows.map((row, i) => (
                      <li key={i} className="border-b pb-2">
                        <div className="font-medium text-red-800">
                          Baris {row.row} — {row.nama}
                        </div>
                        <ul className="list-disc ml-5 text-red-600">
                          {row.errors.map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>,
          document.getElementById("modal-root")
        )}

      {/* MODAL EXPORT PASSWORD */}
      {openExportModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setOpenExportModal(false);
                setExportPassword("");
              }}
            />

            <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 z-10">
              <h2 className="text-xl font-semibold mb-4">Masukkan Password Akun</h2>

              {/* FAKE USERNAME → cegat autofill */}
              <input type="text" name="username" autoComplete="username" className="hidden" />

              {/* STATE untuk toggle show/hide */}
              {/** Tambahkan di atas return: const [showPassword, setShowPassword] = useState(false); **/}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={exportPassword}
                  onChange={(e) => setExportPassword(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 mb-4"
                  placeholder="Password akun..."
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setOpenExportModal(false);
                    setExportPassword("");
                  }}
                  className="px-4 py-2 border rounded-lg"
                >
                  Batal
                </button>

                <button
                  onClick={() => {
                    exportAllKoordinators();
                    setOpenExportModal(false);
                    setExportPassword("");
                  }}
                  className="px-4 py-2 bg-blue-900 text-white rounded-lg"
                >
                  Export
                </button>
              </div>
            </div>
          </div>,
          document.getElementById("modal-root")
        )}


    </div>
  );
}
