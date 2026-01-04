import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../../lib/axios";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";

export default function Relawan() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = localStorage.getItem("role"); // ⬅️ PENTING

  const [openImport, setOpenImport] = useState(false);
  const [file, setFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [notif, setNotif] = useState(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [showExportPassword, setShowExportPassword] = useState(false);

  // ================= DATATABLE =================
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);

  // =====================
  // WILAYAH
  // =====================
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [villages, setVillages] = useState([]);

  // =====================
  // FILTER INPUT
  // =====================
  const [filters, setFilters] = useState({
    nik: "",
    nama: "",
    city_code: "",
    district_code: "",
    village_code: "",
    tps: "",
  });

  const [search, setSearch] = useState("");

  // FILTER YANG DIKIRIM KE API
  const [activeFilters, setActiveFilters] = useState({});

  // =====================
  // LOAD CITIES
  // =====================
  useEffect(() => {
    api.get("/wilayah/cities/31").then((res) => setCities(res.data));
  }, []);

  const loadDistricts = async (cityCode) => {
    if (!cityCode) return setDistricts([]);
    const res = await api.get(`/wilayah/districts/${cityCode}`);
    setDistricts(res.data);
  };

  const loadVillages = async (districtCode) => {
    if (!districtCode) return setVillages([]);
    const res = await api.get(`/wilayah/villages/${districtCode}`);
    setVillages(res.data);
  };

  // =====================
  // FETCH RELAWAN
  // =====================
const fetchRelawan = async () => {
  const res = await api.get("/relawan", {
    params: {
      page,
      per_page: perPage,
      search: search || undefined,
      city_code: filters.city_code || undefined,
      district_code: filters.district_code || undefined,
      village_code: filters.village_code || undefined,
    },
  });

  return res.data.data;
};

const { data, isLoading, isError } = useQuery({
  queryKey: ["relawan", page, perPage, search, filters],
  queryFn: fetchRelawan,
  keepPreviousData: true,
});


useEffect(() => {
  setPage(1);
}, [perPage, search, filters.city_code, filters.district_code, filters.village_code]);

  const paginatedData = data?.data ?? [];
  const totalPage = data?.last_page ?? 1;

  const pages = Array.from({ length: totalPage }, (_, i) => i + 1);

  // =====================
  // FILTER ACTION
  // =====================
  const applyFilter = () => {
    setActiveFilters(filters);
  };

  const resetFilter = () => {
    setSearch("");
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

  // =====================
  // EXPORT
  // =====================

  const handleConfirmExport = async () => {
    if (!exportPassword) {
      toast.error("Masukkan password terlebih dahulu");
      return;
    }

    const toastId = "export-relawan";

    try {
      setExporting(true);
      toast.loading("Menyiapkan file Excel...", { id: toastId });

      const res = await api.post(
        "/relawan/export-all",
        { password: exportPassword },
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;

      const disposition = res.headers["content-disposition"];
      const filename =
        disposition?.split("filename=")[1]?.replace(/"/g, "") ||
        "relawan.xlsx";

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Export berhasil", { id: toastId });

      // ✅ TUTUP MODAL HANYA JIKA SUKSES
      setShowPasswordModal(false);
      setExportPassword("");
      setShowExportPassword(false);
    } catch (err) {
      toast.error(
        err.response?.status === 422
          ? err.response?.data?.message || "Password salah"
          : "Gagal export",
        { id: toastId }
      );
    } finally {
      setExporting(false);
    }
  };

  const closeExportModal = () => {
    setShowPasswordModal(false);
    setExportPassword("");
    setShowExportPassword(false);
    setExporting(false);
  };

  const importRelawan = async () => {
    if (!file) {
      alert("Pilih file terlebih dahulu");
      return;
    }

    setImporting(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post(
        "/relawan/import",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setImportResult(res.data.data);

      if (res.data.data.success_count > 0) {
        setSuccessMessage(
          `${res.data.data.success_count} relawan berhasil ditambahkan!`
        );

        // 🔄 refresh data tabel
        queryClient.invalidateQueries(["relawan"]);

        // ⏱ auto close modal + reset
        setTimeout(() => {
          setSuccessMessage("");
          closeImportModal(); // tutup modal
        }, 2000);
      }

    } catch (error) {
      console.error(error);
      alert("Gagal import data");
    } finally {
      setImporting(false);
    }
  };


  const resetImportState = () => {
    setFile(null);
    setImportResult(null);
    setImporting(false);
  };

  const closeImportModal = () => {
    setOpenImport(false);
    setFile(null);
    setImportResult(null);
    setImporting(false);
  };

  //HAPUS
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/relawan/${id}`),

    onMutate: () => {
      toast.loading("Menghapus relawan...", { id: "delete-relawan" });
    },

    onSuccess: () => {
      queryClient.invalidateQueries(["relawan"]);
      toast.success("Relawan berhasil dihapus", {
        id: "delete-relawan",
      });
    },

    onError: () => {
      toast.error("Gagal menghapus relawan", {
        id: "delete-relawan",
      });
    },
  });

  return (
    <div className="space-y-6">

      {/* ================= HEADER ================= */}
      <div className="bg-white rounded-lg p-7 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-blue-900">Data Relawan</h1>

        {/* ADMIN TIDAK BOLEH TAMBAH / IMPORT */}
        {role !== "admin" && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setOpenImport(true)}
              className="bg-blue-500/15 text-blue-800 border border-blue-200/40 px-4 py-2 rounded-lg hover:bg-blue-500/25"
            >
              Import Data Relawan
            </button>

            <button
              onClick={() => navigate("/relawan/create")}
              className="bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800"
            >
              Tambah Relawan +
            </button>
          </div>
        )}
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

        {/* FILTER INPUT — ADMIN BOLEH */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <input
            className="border px-5 py-3 rounded-lg md:col-span-2"
            placeholder="Cari nama / NIK / no HP / TPS / wilayah"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* KOTA */}
          <div className="relative">
            <Icon icon="mdi:chevron-down"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              width="22" />
            <select
              className={`w-full appearance-none border border-gray-400 pl-5 pr-12 py-3 rounded-lg
                          ${filters.city_code ? "text-slate-800" : "text-slate-400"}`}
              value={filters.city_code}
              onChange={(e) => {
                const val = e.target.value;
                setFilters({ ...filters, city_code: val, district_code: "", village_code: "" });
                loadDistricts(val);
              }}
            >
              <option value="">Pilih Kota/Kabupaten</option>
              {cities.map((c) => (
                <option key={c.city_code} value={c.city_code}>{c.city}</option>
              ))}
            </select>
          </div>

          {/* KECAMATAN */}
          <div className="relative">
            <Icon icon="mdi:chevron-down" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" width="22" />
            <select
              className="w-full appearance-none border border-gray-400 pl-5 pr-12 py-3 rounded-lg"
              value={filters.district_code}
              disabled={!filters.city_code}
              onChange={(e) => {
                const val = e.target.value;
                setFilters({ ...filters, district_code: val, village_code: "" });
                loadVillages(val);
              }}
            >
              <option value="">Pilih Kecamatan</option>
              {districts.map((d) => (
                <option key={d.district_code} value={d.district_code}>{d.district}</option>
              ))}
            </select>
          </div>

          {/* KELURAHAN */}
          <div className="relative">
            <Icon icon="mdi:chevron-down" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" width="22" />
            <select
              className="w-full appearance-none border border-gray-400 pl-5 pr-12 py-3 rounded-lg"
              value={filters.village_code}
              disabled={!filters.district_code}
              onChange={(e) =>
                setFilters({ ...filters, village_code: e.target.value })
              }
            >
              <option value="">Pilih Kelurahan</option>
              {villages.map((v) => (
                <option key={v.village_code} value={v.village_code}>{v.village}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={applyFilter} className="bg-blue-900 text-white px-4 py-2 rounded-lg">
            <Icon icon="mdi:filter-variant" width={20} />
          </button>

          <button onClick={resetFilter} className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
            <Icon icon="mdi:refresh" width={20} />
          </button>

          <button
            onClick={() => setShowPasswordModal(true)}
            className="bg-blue-100 text-blue-800 px-6 py-3 rounded-lg hover:bg-blue-500/25"
          >
            Export Akun
          </button>
        </div>
      </div>

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
              <tr><td colSpan="7" className="py-6 text-center">Loading...</td></tr>
            )}

            {isError && (
              <tr><td colSpan="7" className="py-6 text-center text-red-600">Gagal memuat data</td></tr>
            )}

            {paginatedData.map((item) => (
              <tr key={item.id} className="border-t hover:bg-slate-50">
                <td className="px-5 py-4 font-medium">{item.nama}</td>
                <td className="px-5 py-4 hidden md:table-cell">{item.nik}</td>
                <td className="px-5 py-4 hidden md:table-cell">{item.village?.village || "-"}</td>
                <td className="px-5 py-4 hidden md:table-cell">{item.no_hp}</td>
                <td className="px-5 py-4 hidden md:table-cell">{item.tps}</td>
                <td className="px-5 py-4 hidden md:table-cell">
                  <span className={`px-4 py-1.5 rounded-full text-sm ${item.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {item.status === "active" ? "Aktif" : "Tidak Aktif"}
                  </span>
                </td>

                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {role !== "admin" && (
                      <>
                        {/* HAPUS */}
                        <button
                          onClick={() => setDeleteTarget(item)}
                          title="Hapus"
                          className="w-9 h-9 flex items-center justify-center
                                rounded-lg text-red-600 border border-red-600
                                hover:bg-red-600 hover:text-white transition"
                        >
                          <Icon icon="solar:trash-bin-trash-outline" width={20} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => navigate(`/relawan/${item.id}`)}
                      className="text-blue-900 border border-blue-900 px-4 py-2 rounded-lg hover:bg-blue-800 hover:text-white"
                    >
                      Detail
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-center px-6 py-4">
          <div className="text-sm text-slate-500">
            Halaman {page} dari {totalPage}
          </div>

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

      {deleteTarget &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setDeleteTarget(null)}
            />

            <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 z-10">
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                Hapus Relawan
              </h2>

              {/* ===== JIKA PUNYA KUNJUNGAN ===== */}
              {deleteTarget.visit_forms_count > 0 ? (
                <div className="text-slate-700">
                  <p className="mb-4">
                    Relawan
                    <span className="font-semibold"> “{deleteTarget.nama}” </span>
                    masih mempunyai
                    <span className="font-semibold text-red-600">
                      {" "}{deleteTarget.visit_forms_count}{" "}
                    </span>
                    data kunjungan.
                  </p>

                  <p className="text-sm text-slate-500">
                    Tolong hapus data kunjungan terlebih dahulu sebelum menghapus relawan.
                  </p>

                  <div className="flex justify-end mt-6">
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className="px-4 py-2 rounded-lg border border-slate-300
                           text-slate-600 hover:bg-slate-100"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              ) : (
                /* ===== JIKA TIDAK ADA KUNJUNGAN ===== */
                <>
                  <p className="text-slate-600 mb-6">
                    Yakin ingin menghapus relawan
                    <span className="font-semibold text-slate-800">
                      {" "}“{deleteTarget.nama}”
                    </span>
                    ?
                  </p>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className="px-4 py-2 rounded-lg border border-slate-300
                           text-slate-600 hover:bg-slate-100"
                    >
                      Batal
                    </button>

                    <button
                      onClick={() => {
                        deleteMutation.mutate(deleteTarget.id);
                        setDeleteTarget(null);
                      }}
                      className="px-5 py-2 rounded-lg bg-red-600 text-white
                           hover:bg-red-700"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center">

            {/* BACKDROP */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeImportModal}
            />

            {/* MODAL */}
            <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 z-10">

              {/* CLOSE BUTTON */}
              <button
                onClick={closeImportModal}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <Icon icon="mdi:close" width="22" />
              </button>

              {/* TITLE */}
              <h2 className="text-3xl text-blue-900 font-semibold mb-2">
                Import Data Relawan
              </h2>

              {/* STEP */}
              <ol className="list-decimal list-inside text-md text-slate-600 space-y-1 mb-5">
                <li>Download template Excel</li>
                <li>Isi data sesuai format</li>
                <li>Upload file lalu klik Import</li>
              </ol>

              {/* DOWNLOAD TEMPLATE */}
              <button
                className="w-full border border-blue-600 text-blue-600
                     py-2.5 rounded-lg mb-7 hover:bg-blue-50"
                onClick={() =>
                  window.open("http://192.168.1.7:9000/api/relawan/template")
                }
              >
                Download Template Excel
              </button>

              {/* FILE INPUT */}
              <div className="mb-1">
                <label className="text-md font-medium mb-2 block">
                  Upload File Excel
                </label>
                <input
                  type="file"
                  accept=".xls,.xlsx"
                  className="w-full border rounded-lg px-4 py-2 text-sm mb-4"
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </div>

              {/* IMPORT BUTTON */}
              <button
                onClick={importRelawan}
                disabled={importing}
                className={`w-full py-3 rounded-lg text-white
            ${importing
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-blue-900 hover:bg-blue-800"
                  }`}
              >
                {importing ? "Mengimpor..." : "Import Data"}
              </button>

              {/* HASIL GAGAL IMPORT */}
              {importResult && importResult.failed_rows.length > 0 && (
                <div className="mt-6 max-h-64 overflow-y-auto border rounded-lg p-4 bg-red-50">
                  <h3 className="font-semibold text-red-700 mb-3">
                    Gagal Import ({importResult.failed_rows.length})
                  </h3>

                  <ul className="space-y-3 text-sm">
                    {importResult.failed_rows.map((row, i) => (
                      <li key={i} className="border-b pb-2">
                        <div className="font-medium text-red-800">
                          Baris {row.row} — {row.nama || "-"}
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

            {successMessage && createPortal(
              <div
                className="fixed bottom-5 right-5 z-50 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg"
                onClick={() => setSuccessMessage("")} // klik untuk close
              >
                {successMessage}
              </div>,
              document.getElementById("modal-root")
            )}
          </div>,
          document.getElementById("modal-root")
        )}

      {/* ================= MODAL PASSWORD EXPORT ================= */}
      {showPasswordModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* BACKDROP */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeExportModal}
            />

            {/* MODAL */}
            <div className="relative bg-white w-full max-w-md rounded-2xl p-6 z-10 shadow-2xl">

              <div className="mb-5">
                <h2 className="text-xl font-semibold text-slate-800">
                  Konfirmasi Password
                </h2>
                <p className="text-sm text-slate-500">
                  Masukkan password akun untuk melanjutkan export data
                </p>
              </div>

              <div className="relative mb-6">
                {/* ===== FAKE EMAIL (ANTI AUTOFILL) ===== */}
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  tabIndex={-1}
                  className="absolute -left-[9999px] opacity-0"
                />

                {/* ===== FAKE PASSWORD PAIR ===== */}
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  tabIndex={-1}
                  className="absolute -left-[9999px] opacity-0"
                />

                {/* ===== PASSWORD ASLI ===== */}
                <Icon
                  icon="mdi:lock-outline"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  width={22}
                />

                <input
                  type={showExportPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="w-full border rounded-xl pl-12 pr-12 py-3
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Password akun"
                  value={exportPassword}
                  onChange={(e) => setExportPassword(e.target.value)}
                />

                <button
                  type="button"
                  onClick={() => setShowExportPassword(!showExportPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                >
                  <Icon
                    icon={showExportPassword ? "mdi:eye-off-outline" : "mdi:eye-outline"}
                    width={22}
                  />
                </button>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeExportModal}
                  disabled={exporting}
                  className="px-4 py-2 rounded-lg border text-slate-600
                       hover:bg-slate-100 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  onClick={handleConfirmExport}
                  disabled={!exportPassword || exporting}
                  className="px-5 py-2 rounded-lg bg-blue-900 text-white
                       hover:bg-blue-800 disabled:opacity-50"
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
