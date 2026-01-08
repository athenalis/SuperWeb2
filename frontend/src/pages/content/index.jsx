import React, { useEffect, useState, useMemo } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom"; // import navigate
import api from "../../lib/axios";

/* ========================= STATUS MASTER (WAJIB TAMPIL) ========================= */
const STATUS_MASTER = [
  { label: "Terjadwal", icon: "material-symbols:calendar-month" },
  { label: "Sedang Dibuat", icon: "mdi:pencil" },
  { label: "Draf", icon: "material-symbols:description" },
  { label: "Diposting", icon: "mdi:bullhorn" },
  { label: "Dibatalkan", icon: "mdi:close-circle" },
  { label: "Diblokir", icon: "mdi:block-helper" },
];

/* ========================= PLATFORM ICON MAP ========================= */
const PLATFORM_ICON = {
  ig: { icon: "skill-icons:instagram", color: "text-pink-500" },
  tt: { icon: "logos:tiktok-icon", color: "text-black" },
  yt: { icon: "logos:youtube-icon", color: "text-red-500" },
  fb: { icon: "logos:facebook", color: "text-blue-600" },
  x: { icon: "devicon:twitter", color: "text-black" },
};

const statusStyle = {
  Diposting: "bg-green-100 text-green-800",
  Terjadwal: "bg-blue-100 text-blue-800",
  Diblokir: "bg-[#0f172a] text-white",
  Dibatalkan: "bg-red-100 text-red-800",
  "Sedang Dibuat": "bg-yellow-100 text-yellow-800",
  Draf: "bg-gray-100 text-gray-800",
};


const PLATFORM_NAME_TO_CODE = {
  Instagram: "ig",
  TikTok: "tt",
  YouTube: "yt",
  Facebook: "fb",
  "X (Twitter)": "x",
  X: "x", // jaga-jaga kalau backend cuma "X"
  Twitter: "x", // jaga-jaga
};

export default function Index() {
  const navigate = useNavigate(); // inisialisasi navigate
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [sortKey, setSortKey] = useState(""); // "tanggal" / "budget"
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [budgetSummary, setBudgetSummary] = useState({
    total_budget: 0,
    used_budget: { content: 0, ads: 0, total: 0 },
    remaining_budget: 0,
  });


  /* ========================= FETCH DATA ========================= */
  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get("/content-plans"),
      api.get("/budget"),
    ])
      .then(([plansRes, budgetRes]) => {
        const plansData = Array.isArray(plansRes.data) ? plansRes.data : [];
        setPlans(plansData);
        setStats(hitungStatistik(plansData));
        setBudgetSummary(budgetRes.data);
        setLoading(false);
      })

      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ========================= FILTER & SORT ========================= */
  const filteredPlans = useMemo(() => {
    let filtered = [...plans];

    if (statusFilter) {
      filtered = filtered.filter(
        (p) => p.status?.label === statusFilter
      );
    }

    if (searchTitle.trim()) {
      filtered = filtered.filter((p) =>
        p.title
          ?.toLowerCase()
          .includes(searchTitle.toLowerCase())
      );
    }

    return filtered;
  }, [plans, statusFilter, searchTitle]);


  const displayedPlans = useMemo(() => {
    let data = [...filteredPlans];

    if (sortKey === "tanggal") {
      data.sort(
        (a, b) =>
          new Date(a.posting_date).getTime() -
          new Date(b.posting_date).getTime()
      );
    }

    if (sortKey === "budget") {
      data.sort((a, b) => {
        const budgetA =
          Number(a.used_budget?.budget_content || 0) +
          Number(a.used_budget?.budget_ads || 0);

        const budgetB =
          Number(b.used_budget?.budget_content || 0) +
          Number(b.used_budget?.budget_ads || 0);

        return budgetA - budgetB;
      });
    }

    return data.slice(
      (page - 1) * perPage,
      page * perPage
    );
  }, [filteredPlans, sortKey, page, perPage]);

  const totalPage = Math.max(
    1,
    Math.ceil(filteredPlans.length / perPage)
  );

  const pages = Array.from({ length: totalPage }, (_, i) => i + 1);

  useEffect(() => {
    if (page > totalPage) {
      setPage(1);
    }
  }, [totalPage]);



  /* ========================= DELETE MODAL STATE & FN ========================= */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const openDeleteModal = (item) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setSelectedItem(null);
    setShowDeleteModal(false);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    try {
      setDeleting(true);
      await api.delete(`/content-plans/${selectedItem.id}`);
      closeDeleteModal();
      fetchData();
    } catch (err) {
      alert("Gagal menghapus data");
    } finally {
      setDeleting(false);
    }
  };


  return (
    <div className="p-6 space-y-6">



      {/* ================= HEADER ================= */}
      <div className="bg-white rounded-lg p-7 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">Social Media</h1>
          <p className="text-sm opacity-90 mt-1"></p>
        </div>

        <div className="flex items-center justify-center gap-2">

          <button
            className="bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800"
            onClick={() => navigate("/content/create")} // ✅ ganti window.location.href
          >
            Tambah Konten +
          </button>
        </div>
      </div>



      {/* ================= BUDGET ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-5">
          <div className="text-sm text-slate-500">Total Budget</div>
          <div className="text-xl font-bold mt-1">
            Rp {Number(budgetSummary.total_budget).toLocaleString("id-ID")}
          </div>
        </div>

        <div className="bg-white border rounded-xl p-5">
          <div className="text-sm text-slate-500">Budget Terpakai</div>
          <div className="text-xl font-bold mt-1 text-red-600">
            Rp {Number(budgetSummary.used_budget?.total || 0).toLocaleString("id-ID")}
          </div>
        </div>

        <div className="bg-white border rounded-xl p-5">
          <div className="text-sm text-slate-500">Budget Tersisa</div>
          <div className="text-xl font-bold mt-1 text-green-600">
            Rp {Number(budgetSummary.remaining_budget).toLocaleString("id-ID")}
          </div>
        </div>
      </div>

      {/* ================= STATISTIK STATUS ================= */}
      {/* <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {STATUS_MASTER.map((status) => (
          <div
            key={status.label}
            className="bg-white   border rounded-xl p-4 text-center hover:shadow transition"
          >
            <Icon
              icon={status.icon}
              width={22}
              className="mx-auto text-slate-600"
            />
            <div className="mt-2 text-2xl font-bold text-slate-800">
              {stats[status.label] || 0}
            </div>
            <div className="text-sm text-slate-500 mt-1">{status.label}</div>
          </div>
        ))}
      </div> */}

      {/* ================= STATISTIK STATUS (COMPACT) ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STATUS_MASTER.map((status) => (
          <div
            key={status.label}
            className="bg-white border rounded-xl px-4 py-3 
                 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <Icon
                icon={status.icon}
                width={18}
                className="text-slate-600"
              />
            </div>

            <div>
              <div className="text-lg font-bold text-slate-800">
                {stats[status.label] || 0}
              </div>
              <div className="text-xs text-slate-500">
                {status.label}
              </div>
            </div>
          </div>
        ))}
      </div>


      {/* ================= FILTER DATA ================= */}
      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <Icon icon="mdi:filter-variant" width={22} className="text-blue-900" />
          <div>
            <h3 className="font-semibold">Filter Data</h3>
            <p className="text-sm text-slate-500">Cari data berdasarkan kriteria</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* SEARCH TITLE */}
          <input
            type="text"
            value={searchTitle}
            onChange={(e) => {
              setSearchTitle(e.target.value);
              setPage(1); // reset pagination
            }}
            placeholder="Cari judul konten..."
            className="border rounded-lg px-4 py-3 w-full"
          />

          {/* FILTER STATUS */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border rounded-lg px-4 py-3"
          >
            <option value="">Semua Status</option>
            {STATUS_MASTER.map((s) => (
              <option key={s.label} value={s.label}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

      </div>


      {/* ================= PER PAGE ================= */}
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
      <div className="bg-white rounded-xl shadow overflow-x-auto">

        <table className="w-full text-base">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left">No</th>
              <th className="px-4 py-3 text-left">Judul</th>
              <th className="px-4 py-3 text-left">Platform</th>
              <th className="px-4 py-3 text-left">Tanggal Posting</th>
              <th className="px-4 py-3 text-center">Ads</th>
              <th className="px-4 py-3 text-left">Total Budget</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-left">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan="7" className="py-6 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            )}

            {!loading &&
              displayedPlans.map((item, index) => {
                const totalBudget = getTotalBudget(item);

                return (
                  <tr key={item.id} className="border-t hover:bg-slate-50">
                    {/* NO */}
                    <td className="px-4 py-3">
                      {(page - 1) * perPage + index + 1}
                    </td>

                    {/* JUDUL */}
                    <td className="px-4 py-3 max-w-[260px]">
                      <p className="font-medium leading-snug line-clamp-2">
                        {item.title}
                      </p>
                    </td>

                    {/* PLATFORM (ICON) */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getPlatformIcons(item)}
                      </div>
                    </td>

                    {/* TIPE */}
                    {/* <td className="px-4 py-3">
                      {getContentTypes(item)}
                    </td> */}
                    
                    {/* TANGGAL */}
                    <td className="px-4 py-3 max-w-[50px]">
                      {item.posting_date
                        ? new Date(item.posting_date).toLocaleDateString("id-ID")
                        : "-"}
                    </td>

                    {/* ADS */}
                    <td className="px-4 py-3 text-center ">
                      {hasAds(item) ? (
                        <span className="text-green-600 font-semibold">Ya</span>
                      ) : (
                        <span className="text-red-500 font-semibold">Tidak</span>
                      )}
                    </td>

                    {/* TOTAL BUDGET */}
                    <td className="px-4 py-3 font-semibold">
                      Rp {totalBudget.toLocaleString("id-ID")}
                    </td>

                    {/* STATUS */}
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            statusStyle[item.status?.label] ||
                            "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {item.status?.label || "-"}
                        </span>
                      </div>
                    </td>

                    {/* AKSI */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/content/${item.id}/analytic`)}
                          className="w-9 h-9 flex items-center justify-center
                         rounded-lg text-purple-600 border border-purple-600
                         hover:bg-purple-600 hover:text-white"
                        >
                          <Icon icon="stash:chart-trend-up" width={35} />
                        </button>

                        <button
                          onClick={() => navigate(`/content/${item.id}`)}
                          className="w-9 h-9 flex items-center justify-center
                         rounded-lg text-blue-600 border border-blue-600
                         hover:bg-blue-600 hover:text-white"
                        >
                          <Icon icon="si:eye-line" width={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>

        {/* ================= DELETE MODAL ================= */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
              <p className="text-slate-600 mb-6">
                Yakin ingin menghapus konten
                <span className="font-semibold text-slate-800">
                  {" "}“{selectedItem?.title}”
                </span>
                ?
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeDeleteModal}
                  className="px-4 py-2 rounded-lg border border-slate-300
            text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>

                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-5 py-2 rounded-lg bg-red-600 text-white
            hover:bg-red-700 transition"
                >
                  {deleting ? "Menghapus..." : "Hapus"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= PAGINATION ================= */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-4 py-3">

          <div className="text-sm text-slate-500">
            Halaman {page} dari {totalPage}
          </div>

          <div className="flex flex-wrap gap-2 justify-center md:justify-start">

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
                className={`px-3 py-1 rounded-lg border ${p === page
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
    </div>
  );
}

/* =========================
  HELPER
========================= */
function hitungStatistik(data = []) {
  const result = {};
  data.forEach((item) => {
    const label = item.status?.label;
    if (!label) return;
    result[label] = (result[label] || 0) + 1;
  });
  return result;
}

function getContentTypes(item) {
  if (!item.platforms?.length) return "-";

  return item.platforms
    .map((platform) => {
      const typeId = platform.pivot?.content_type_id;

      return platform.content_types
        ?.find((ct) => ct.id === typeId)
        ?.name;
    })
    .filter(Boolean)
    .join(", ");
}

function getPlatformWithType(item) {
  if (!item.content_platforms?.length) return "-";

  return item.content_platforms
    .map((cp) => {
      const platform = cp.platform?.name;
      const type = cp.content_type?.name;

      if (!platform || !type) return null;

      return `${platform} - ${type}`;
    })
    .filter(Boolean)
    .join(", ");
}

function hasAds(item) {
  return item.content_platforms?.some(
    (cp) => cp.ads && cp.ads.is_ads
  );
}

function getTotalBudget(item) {
  const contentBudget = Number(
    item.budget_with_trashed?.budget_content || 0
  );

  const adsBudget =
    item.content_platforms?.reduce((sum, cp) => {
      return sum + Number(cp.ads?.budget_ads || 0);
    }, 0) || 0;

  return contentBudget + adsBudget;
}

function getPlatformIcons(item) {
  if (!item.content_platforms?.length) return "-";

  const used = new Set();

  return item.content_platforms
    .map((cp, index) => {
      const platformName = cp.platform?.name;
      if (!platformName) return null;

      const code = PLATFORM_NAME_TO_CODE[platformName];
      if (!code || !PLATFORM_ICON[code]) return null;

      // cegah icon dobel
      if (used.has(code)) return null;
      used.add(code);

      return (
        <Icon
          key={index}
          icon={PLATFORM_ICON[code].icon}
          width={20}
        />
      );
    })
    .filter(Boolean);
}

