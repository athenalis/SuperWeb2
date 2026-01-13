import React, { useEffect, useState, useMemo } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom"; // import navigate
import api from "../../lib/axios";

/* ========================= STATUS MASTER (WAJIB TAMPIL) ========================= */
const STATUS_MASTER = [
  { label: "Terjadwal", icon: "solar:calendar-linear" },
  { label: "Sedang Dibuat", icon: "proicons:pencil" },
  { label: "Draf", icon: "proicons:document" },
  { label: "Diposting", icon: "meteor-icons:bullhorn" },
  { label: "Dibatalkan", icon: "gg:close-o" },
  { label: "Diblokir", icon: "mdi:block-helper" },
];

const PRIORITY_STATUS = [
  "Draf",
  "Terjadwal",
  "Sedang Dibuat",
];


/* ========================= PLATFORM ICON MAP ========================= */
const PLATFORM_ICON = {
  ig: { icon: "skill-icons:instagram", color: "text-pink-500" },
  tt: { icon: "logos:tiktok-icon", color: "text-black" },
  yt: { icon: "logos:youtube-icon", color: "text-red-500" },
  fb: { icon: "logos:facebook", color: "text-blue-600" },
  x: { icon: "ri:twitter-x-line", color: "text-black" }
};

const statusStyle = {
  Diposting: "bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold ",
  Terjadwal: "bg-blue-100 text-blue-700 border border-blue-200 font-bold  ",
  Diblokir: "bg-slate-800 text-white shadow-sm font-bold ", // Tetap gelap untuk kesan 'mati'
  Dibatalkan: "bg-rose-100 text-rose-700 border border-rose-200 font-bold ",
  "Sedang Dibuat": "bg-amber-100 text-amber-800 border border-amber-200 font-bold ",
  Draf: "bg-slate-100 text-slate-500 border border-slate-200 font-medium ",
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

const PLATFORM_ALIAS = {
  ig: "instagram",
  tt: "tiktok",
  yt: "youtube",
  fb: "facebook",
  x: "twitter",
};

  /* ========================= NORMALIZE HELPER ========================= */
  const normalizePlatformText = (text = "") => {
    let t = text.toLowerCase();

    Object.entries(PLATFORM_ALIAS).forEach(([alias, full]) => {
      t = t.replace(new RegExp(alias, "g"), full);
    });

    return t;
  };



export default function Index() {
  const navigate = useNavigate(); // inisialisasi navigate
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [platformFilter, setPlatformFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [sortKey, setSortKey] = useState(""); // "tanggal" / "budget"
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [showLateModal, setShowLateModal] = useState(false);
  const [budgetSummary, setBudgetSummary] = useState({
    total_budget: 0,
    used_budget: { content: 0, ads: 0, total: 0 },
    remaining_budget: 0,
  });


              /* ========================= FETCH DATA (SERVER SIDE) ========================= */
            const fetchData = () => {
              setLoading(true);

              const params = {
                status: statusFilter, page,
                per_page: perPage
              };

              Promise.all([
                // Axios otomatis mengubah { params } menjadi: /content-plans?search=xxx&status=xxx
                api.get("/content-plans", { params }), 
                api.get("/budget"),
              ])
                .then(([plansRes, budgetRes]) => {
                  // Logic pengecekan array tetap sama seperti punya Bapak
                  const plansData = Array.isArray(plansRes.data)
                    ? plansRes.data
                    : Array.isArray(plansRes.data?.data)
                      ? plansRes.data.data
                      : [];
                      
                  setPlans(plansData);
                  setStats(hitungStatistik(plansData));
                  setBudgetSummary(budgetRes.data);
                  setLoading(false);
                })
                .catch((err) => {
                  console.error("Error Fetching:", err);
                  setLoading(false);
                });
            };

              /* ========================= TRIGGER FETCH DATA ========================= */
                useEffect(() => {
                fetchData();
              }, [statusFilter, page, perPage]);

                /* ========================= LATE PLANS (TETAP DI SINI) ========================= */
                const latePlans = useMemo(() => {
                  return plans.filter(p => p.is_late === 1);
                }, [plans]);

                const lateCount = latePlans.length;

                /* ========================= GLOBAL FILTER LOGIC ========================= */
          const filteredPlans = useMemo(() => {
            let filtered = [...plans];

            /* ===================== FILTER PLATFORM ===================== */
            if (platformFilter) {
              filtered = filtered.filter((p) =>
                p.content_platforms?.some(
                  (cp) =>
                    PLATFORM_NAME_TO_CODE[cp.platform?.name] === platformFilter
                )
              );
            }

            /* ===================== FILTER TANGGAL ===================== */
            if (dateFilter) {
              filtered = filtered.filter((p) =>
                p.posting_date?.startsWith(dateFilter)
              );
            }

            /* ===================== FILTER MIN BUDGET ===================== */
            if (minBudget) {
              filtered = filtered.filter((p) => {
                const totalBudget =
                  Number(p.used_budget?.budget_content || 0) +
                  Number(p.used_budget?.budget_ads || 0);

                return totalBudget >= Number(minBudget);
              });
            }

            /* ===================== SEARCH GLOBAL ===================== */
            if (searchTitle.trim()) {
              const keyword = searchTitle.toLowerCase();

              filtered = filtered.filter((p) => {
                const title = p.title?.toLowerCase() || "";

                const platforms =
                  p.content_platforms
                    ?.map((cp) => cp.platform?.name?.toLowerCase())
                    .join(" ") || "";

                const status = p.status?.label?.toLowerCase() || "";

                const date = p.posting_date || "";

                const totalBudget = (
                  Number(p.used_budget?.budget_content || 0) +
                  Number(p.used_budget?.budget_ads || 0)
                ).toString();

                return (
                  title.includes(keyword) ||
                  platforms.includes(keyword) ||
                  status.includes(keyword) ||
                  date.includes(keyword) ||
                  totalBudget.includes(keyword)
                );
              });
            }

            /* ===================== SORTING ===================== */
            if (sortKey === "tanggal") {
              filtered.sort(
                (a, b) =>
                  new Date(a.posting_date) - new Date(b.posting_date)
              );
            }

            if (sortKey === "budget") {
              filtered.sort((a, b) => {
                const budgetA =
                  Number(a.used_budget?.budget_content || 0) +
                  Number(a.used_budget?.budget_ads || 0);
                const budgetB =
                  Number(b.used_budget?.budget_content || 0) +
                  Number(b.used_budget?.budget_ads || 0);

                return budgetB - budgetA;
              });
            }

           return filtered;
            }, [
              plans,
              platformFilter,
              dateFilter,
              minBudget,
              searchTitle,
            ]);

            const paginatedPlans = useMemo(() => {
              const start = (page - 1) * perPage;
              const end = start + perPage;
              return filteredPlans.slice(start, end);
            }, [filteredPlans, page, perPage]);
            
            const displayedPlans = useMemo(() => {
            const late = filteredPlans.filter(p => p.is_late === 1);
            const nonLate = filteredPlans.filter(p => p.is_late !== 1);

            let sortedNonLate = sortByCustomStatusAndDate(nonLate);

            if (sortKey === "tanggal") {
              sortedNonLate.sort((a, b) => {
                const timeA = a.posting_date ? new Date(a.posting_date).getTime() : Infinity;
                const timeB = b.posting_date ? new Date(b.posting_date).getTime() : Infinity;
                return timeA - timeB;
              });
            }

            if (sortKey === "budget") {
              sortedNonLate.sort((a, b) => {
                const budgetA = Number(a.used_budget?.budget_content || 0) + Number(a.used_budget?.budget_ads || 0);
                const budgetB = Number(b.used_budget?.budget_content || 0) + Number(b.used_budget?.budget_ads || 0);
                return budgetB - budgetA;
              });
            }

            const allSortedData = [...late, ...sortedNonLate];

            const start = (page - 1) * perPage;
            const end = start + perPage;
            
            return allSortedData.slice(start, end);

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

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            className="bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 w-full sm:w-auto"
            onClick={() => navigate("/influencer")}
          >
            Lihat Influencer
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            className="bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 w-full sm:w-auto"
            onClick={() => navigate("/content/create")}
          >
            Tambah Konten +
          </button>
        </div>
      </div>



                {/* ================= BUDGET ================= */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Card Total Anggaran - Deep Navy/Slate */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-950 rounded-2xl p-6 shadow-lg transition-all duration-300 hover:scale-[1.02] flex justify-between items-center cursor-default group">
              <div>
                <div className="text-slate-300 text-xs font-bold uppercase tracking-wider">Total Anggaran</div>
                <div className="text-2xl font-extrabold mt-1 text-white">
                  <span className="text-sm mr-1">Rp</span>
                  {Number(budgetSummary.total_budget).toLocaleString("id-ID")}
                </div>
              </div>
              <div className="bg-white/10 p-3 rounded-xl text-white/50 group-hover:text-white transition-colors">
                <Icon icon="solar:wallet-bold" width={32} />
              </div>
            </div>

            {/* Card Anggaran Terpakai - Soft Rose/Red */}
              <div className="bg-gradient-to-br from-rose-500 to-red-700 rounded-2xl p-6 shadow-lg shadow-rose-200 transition-all duration-300 hover:scale-[1.02] flex justify-between items-center cursor-default group relative overflow-hidden">
                <div className="absolute -right-2 -bottom-2 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all"></div>
                <div className="relative z-10">
                  <div className="text-rose-100 text-xs font-bold uppercase tracking-wider">Anggaran Terpakai</div>
                  <div className="text-2xl font-extrabold mt-1 text-white">
                    <span className="text-sm mr-1">Rp</span>
                    {Number(budgetSummary.used_budget?.total || 0).toLocaleString("id-ID")}
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-xl text-white/70 group-hover:text-white transition-colors">
                  <Icon icon="mdi:cash-minus" width={32} />
                </div>
              </div>

            {/* Card Anggaran Tersisa - Emerald/Teal */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl p-6 shadow-lg shadow-emerald-200 transition-all duration-300 hover:scale-[1.02] flex justify-between items-center cursor-default group">
              <div>
                <div className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Anggaran Tersisa</div>
                <div className="text-2xl font-extrabold mt-1 text-white">
                  <span className="text-sm mr-1">Rp</span>
                  {Number(budgetSummary.remaining_budget).toLocaleString("id-ID")}
                </div>
              </div>
              <div className="bg-white/20 p-3 rounded-xl text-white/70 group-hover:text-white transition-colors">
                <Icon icon="ph:piggy-bank-fill" width={32} />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* SEARCH TITLE */}
          <input
            type="text"
            value={searchTitle}
            onChange={(e) => {
            setSearchTitle(e.target.value);
            setPage(1); // Reset ke halaman 1 saat mengetik
            }}
            placeholder="Cari judul dan Status ..."
            className="border border-slate-300 rounded-lg px-4 py-3 w-full outline-none transition-all duration-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-600 placeholder:text-slate-400"
          />
          {/* FILTER STATUS */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border border-slate-300 rounded-lg px-4 py-3 outline-none transition-all duration-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-600 bg-white"
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

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

      {lateCount > 0 && (
        <div
          onClick={() => setShowLateModal(true)}
          className="
            cursor-pointer
            bg-gradient-to-br from-orange-400 to-orange-600
            rounded-xl
            px-6 py-3
            shadow-md
            hover:scale-[1.03]
            transition
            flex items-center gap-4
            w-fit
          "
        >
          <div>
            <div className="text-xs font-semibold text-orange-100 uppercase tracking-wide leading-none">
              Konten Terlambat
            </div>
            <div className="text-xl font-extrabold text-white leading-tight">
              {lateCount}
            </div>
          </div>

          <div className="bg-white/20 p-1.5 rounded-md">
            <Icon icon="mdi:alert-circle-outline" width={18} className="text-white" />
          </div>
        </div>
      )}
      </div>

        {/* ================= TABLE ================= */}
        <div className="hidden md:block bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-base">
            <thead className="bg-slate-100">
              <tr className="text-slate-700">
                <th className="px-4 py-4 text-left font-bold">No</th>
                <th className="px-4 py-4 text-left font-bold">Judul</th>
                <th className="px-4 py-4 text-left font-bold">Platform</th>
                <th className="px-4 py-4 text-left font-bold">Tanggal Posting</th>
                <th className="px-4 py-4 text-center font-bold">Ads</th> {/* CENTER */}
                <th className="px-4 py-4 text-left font-bold">Total Anggaran</th>
                <th className="px-4 py-4 text-center font-bold">Status</th> {/* CENTER */}
                <th className="px-4 py-4 text-center font-bold">Aksi</th> {/* CENTER */}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-slate-500 italic">
                    Memuat data konten...
                  </td>
                </tr>
              )}

              {!loading && displayedPlans.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <Icon icon="mdi:database-off-outline" width={48} />
                      <p className="font-semibold text-lg">Data belum tersedia</p>
                      <p className="text-sm">Belum ada rencana konten yang dibuat.</p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && displayedPlans.map((item, index) => {
                const totalBudget = getTotalBudget(item);

                return (
                  <tr 
                    key={item.id} 
                    className="group hover:bg-blue-50/40 transition-colors duration-200"
                  >
                    <td className="px-4 py-4 text-slate-500">
                      {(page - 1) * perPage + index + 1}
                    </td>

                    <td className="px-4 py-4 max-w-[260px]">
                      <p className="font-bold text-slate-800 line-clamp-2 leading-tight">
                        {item.title}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex gap-2 items-center">
                        {getPlatformIcons(item)}
                      </div>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-slate-600 font-medium">
                      {item.posting_date
                        ? new Date(item.posting_date).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </td>

                    {/* ADS */}
                    <td className="px-4 py-4 text-center">
                      {hasAds(item) ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-sm">
                          Ya
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-sm">Tidak</span>
                      )}
                    </td>

                    <td className="px-4 py-4 font-bold text-slate-900">
                      Rp {totalBudget.toLocaleString("id-ID")}
                    </td>

                    {/* STATUS */}
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-block min-w-[100px] px-4 py-1.5 rounded-full text-xs font-bold ${statusStyle[item.status?.label] || "bg-slate-100 text-white font-semibold"}`}>
                        {item.status?.label || "-"}
                      </span>
                    </td>

                    {/* AKSI */}
                    <td className="px-4 py-4">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={() => navigate(`/content/${item.id}`)}
                          title="Lihat Detail"
                          className="w-9 h-9 flex items-center justify-center text-blue-600 border border-blue-400 bg-white rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        >
                          <Icon icon="si:eye-line" width={18} />
                        </button>

                        <button 
                          onClick={() => navigate(`/content/${item.id}/analytic`)}
                          title="Analitik"
                          className="w-9 h-9 flex items-center justify-center text-purple-600 border border-purple-400 bg-white rounded-lg hover:bg-purple-600 hover:text-white transition-all shadow-sm"
                        >
                          <Icon icon="stash:chart-trend-up" width={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      {/* ================= MOBILE CARD ================= */}
      <div className="md:hidden space-y-4">
        {loading && (
          <div className="text-center text-slate-500 py-6">Loading...</div>
        )}

        {!loading && displayedPlans.length === 0 && (
          <div className="text-center text-slate-500 py-10">
            <Icon
              icon="mdi:database-off-outline"
              width={36}
              className="mx-auto mb-2"
            />
            <p className="font-medium">Data belum tersedia</p>
            <p className="text-sm opacity-70">
              Belum ada konten yang bisa ditampilkan
            </p>
          </div>
        )}

        {!loading &&

          [...displayedPlans]
            .sort((a, b) => {
              const timeA = a.posting_date ? new Date(a.posting_date).getTime() : 0;
              const timeB = b.posting_date ? new Date(b.posting_date).getTime() : 0;
              return timeA - timeB;
            })
            .map((item, index) => {
              const totalBudget = getTotalBudget(item);

              return (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3">
                  {/* HEADER CARD: Judul & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-bold text-slate-800 leading-snug line-clamp-2 text-[15px]">
                        {item.title}
                      </p>
                      <span className="hidden md:inline text-xs text-slate-500">
                        {(page - 1) * perPage + index + 1}
                      </span>
                    </div>

                    {/* STATUS: Dibuat lebih ramping dan fixed width agar tidak goyang */}
                    <div className="shrink-0">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] 
                            ${statusStyle[item.status?.label] || "bg-slate-100 text-slate-600"}`}>
                        {item.status?.label || "-"}
                      </span>
                    </div>
                  </div>

                  {/* ICONS & TANGGAL */}
                  <div className="flex items-center justify-between border-y border-slate-50 py-2">
                    <div className="flex gap-1.5">
                      {getPlatformIcons(item)}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-black">Tanggal Posting</p>
                      <p className="text-xs font-semibold text-black">
                        {item.posting_date ? new Date(item.posting_date).toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' }) : "-"}
                      </p>
                    </div>
                  </div>

                  {/* BUDGET & ADS */}
                  <div className="flex justify-between items-end">
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-black font-semibold ">Total Budget</p>
                      <p className="text-lg text-black leading-none">
                        Rp {totalBudget.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[11px] font-bold ${hasAds(item) ? 'text-green-600' : 'text-slate-400'}`}>
                        {hasAds(item) ? "● Ads Aktif" : "Tanpa Ads"}
                      </p>
                    </div>
                  </div>

                  {/* AKSI: Tombol Full Width agar mudah ditekan jempol di iPhone XR */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => navigate(`/content/${item.id}/analytic`)}
                      className="flex-1 bg-purple-100 hover:bg-purple-100 text-purple-700 py-2.5 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Icon icon="stash:chart-trend-up" width={20} />
                      <span className="ml-2 text-xs font-bold">Analisis</span>
                    </button>

                    <button
                      onClick={() => navigate(`/content/${item.id}`)}
                      className="flex-1 bg-blue-100 hover:bg-blue-100 text-blue-700 py-2.5 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Icon icon="si:eye-line" width={18} />
                      <span className="ml-2 text-xs font-bold">Detail</span>
                    </button>
                  </div>
                </div>
              );
            })}
      </div>



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

      {/* ================= MODAL KONTEN TERLAMBAT ================= */}
      {showLateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-orange-600 mb-2">
              Konten Terlambat
            </h3>

            <p className="text-sm text-slate-500 mb-4">
              Konten berikut melewati tanggal posting namun belum diposting.
            </p>

            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {latePlans.map(item => (
                <div
                  key={item.id}
                  onClick={() => {
                    setShowLateModal(false);
                    navigate(`/content/${item.id}`);
                  }}
                  className="
                    border rounded-lg p-3
                    hover:bg-orange-50
                    cursor-pointer
                    transition
                  "
                >
                  <p className="font-semibold text-slate-800 line-clamp-1">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(item.posting_date).toLocaleDateString("id-ID")}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowLateModal(false)}
                className="
                  px-5 py-2
                  rounded-lg
                  bg-orange-600
                  text-white
                  hover:bg-orange-700
                  transition
                "
              >
                Tutup
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
            Sebelumnya
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
            Selanjutnya
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
  HELPER
========================= */
function sortByCustomStatusAndDate(data = []) {
  const now = Date.now();

  return [...data].sort((a, b) => {
    const statusA = a.status?.label || "";
    const statusB = b.status?.label || "";

    const isPriorityA = PRIORITY_STATUS.includes(statusA);
    const isPriorityB = PRIORITY_STATUS.includes(statusB);

    // 1️⃣ Prioritas status dulu
    if (isPriorityA && !isPriorityB) return -1;
    if (!isPriorityA && isPriorityB) return 1;

    const timeA = a.posting_date
      ? new Date(a.posting_date).getTime()
      : null;

    const timeB = b.posting_date
      ? new Date(b.posting_date).getTime()
      : null;

    // 2️⃣ Sama-sama PRIORITY
    if (isPriorityA && isPriorityB) {
      if (!timeA && !timeB) return 0;
      if (!timeA) return 1;
      if (!timeB) return -1;

      // paling dekat ke hari ini
      return Math.abs(timeA - now) - Math.abs(timeB - now);
    }

    // 3️⃣ Sama-sama NON PRIORITY
    if (!timeA && !timeB) return 0;
    if (!timeA) return 1;
    if (!timeB) return -1;

    // tanggal terbaru di atas
    return timeB - timeA;
  });
}

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
  return item.ads?.some((ad) => ad.is_ads) ?? false;
}

function getTotalBudget(item) {
  const contentBudget = Number(
    item.budget_with_trashed?.budget_content || 0
  );

  const adsBudget =
    item.ads?.reduce((sum, ad) => {
      return sum + Number(ad.budget_ads || 0);
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
        <div
          key={index}
          className="w-9 h-9 flex items-center justify-center rounded-md bg-slate-50"
        >
          <Icon
            icon={PLATFORM_ICON[code].icon}
            className="max-w-[90%] max-h-[90%]"
          />
        </div>
      );
    })
    .filter(Boolean);
}

