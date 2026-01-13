import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Icon } from "@iconify/react"
import api from "../lib/axios"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import VisitMap from "../components/maps/VisitMap"

// =========================================================================
// 1. KOMPONEN ANIMASI ANGKA (Suntikan Fitur Baru)
// =========================================================================
const AnimateNumber = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    let startTime;
    const duration = 1500;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setDisplayValue(Math.floor(progress * value));
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }, [value]);
  return <span>{displayValue.toLocaleString("id-ID")}</span>;
};

// =========================================================================
// 2. DATA MENU (Tetap Asli)
// =========================================================================
const quickMenus = [
  { title: "Data Koordinator", desc: "Kelola data koordinator", icon: "solar:user-id-bold", path: "/koordinator" },
  { title: "Data Relawan", desc: "Kelola data relawan", icon: "solar:users-group-rounded-bold", path: "/relawan" },
  { title: "Konten", desc: "Kelola Jadwal Konten", icon: "uil:schedule", path: "/content" },
  { title: "Suara", desc: "Analisis Suara", icon: "solar:chart-bold", path: "/suara/dashboard" },
]

function getPlatformIcon(name) {
  switch (name) {
    case "TikTok":
      return { icon: "ic:baseline-tiktok", size: 22 };
    case "Instagram":
      return { icon: "skill-icons:instagram", size: 22 };
    case "YouTube":
      return { icon: "logos:youtube-icon", size: 22 };
    case "Facebook":
      return { icon: "logos:facebook", size: 22 };
    case "X":
    case "Twitter":
      return { icon: "ri:twitter-x-line", size: 22 };
    default:
      return { icon: "mdi:web", size: 22 };
  }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const role = localStorage.getItem("role") || "Admin"

  const [summary, setSummary] = useState({ koordinator_total: 0, relawan_total: 0 })
  const [visits, setVisits] = useState([])
  const [isLoading, setIsLoading] = useState(true);

  const contentSummary = {
    target_total: 100,
    posted_total: 45,
    by_platform: [
      { name: "TikTok", total: 20 },
      { name: "Instagram", total: 12 },
      { name: "YouTube", total: 5 },
      { name: "Facebook", total: 6 },
      { name: "X", total: 2 },
    ]
  };  

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return navigate("/login")

    // Ambil data dari API
    Promise.all([
      api.get("/dashboard"),
      api.get("peta/visit")
    ]).then(([resSummary, resVisits]) => {
      if (resSummary.data.success) setSummary(resSummary.data.data);
      if (resVisits.data.success) setVisits(resVisits.data.data);
    }).finally(() => {
      // Loading dimatikan setelah data Summary & Peta masuk
      setIsLoading(false);
    });
  }, [navigate])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* ===== HEADER ===== */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white rounded-xl p-6 shadow">
        <h1 className="text-2xl font-semibold">Selamat Datang, {role}</h1>
        <p className="text-sm opacity-90 mt-1">Sistem Manajemen SuperWeb</p>
      </div>

      {/* ===== SUMMARY SECTION ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        
        {/* Slot Koordinator */}
        {isLoading ? (
          <div className="h-[120px] bg-slate-200 animate-pulse rounded-2xl border border-slate-100"></div>
        ) : (
          <div className="bg-gradient-to-r from-blue-600 to-blue-400 text-white p-6 rounded-xl shadow flex justify-between">
            <div>
              <div className="text-2xl font-bold">
                <AnimateNumber value={summary.koordinator_total} />
              </div>
              <div className="text-sm opacity-80">Total Koordinator</div>
            </div>
              <Icon icon="solar:user-id-bold" width={32} />
          </div>
        )}

        {/* Slot Relawan */}
        {isLoading ? (
          <div className="h-[120px] bg-slate-200 animate-pulse rounded-2xl border border-slate-100"></div>
        ) : (
          <div className="bg-gradient-to-r from-green-500 to-green-300 text-white p-6 rounded-xl shadow flex justify-between">
            <div>
              <div className="text-2xl font-bold">
                <AnimateNumber value={summary.relawan_total} />
              </div>
              <div className="text-sm opacity-80">Total Relawan</div>
            </div>
              <Icon icon="solar:users-group-rounded-bold" width={32} />
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-50">
        <h2 className="text-lg font-semibold mb-1 text-slate-800">
          Resume Konten per Platform
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          Jumlah konten yang telah diposting di masing-masing platform
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {contentSummary.by_platform.map(p => {
          const icon = getPlatformIcon(p.name);
          return (
            <div
              key={p.name}
              className="rounded-xl border bg-white p-4 shadow-sm"
            >
              {/* HEADER / KETERANGAN (ganti tanggal) */}
              <div className="text-xs text-slate-500 mb-3">
                Resume konten terposting
              </div>

              {/* BODY */}
              <div className="flex items-center justify-between">
                {/* LEFT : ICON + PLATFORM */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Icon icon={icon.icon} width={icon.size} />
                  </div>
                  <div className="text-sm font-medium text-slate-700">
                    {p.name}
                  </div>
                </div>

                {/* RIGHT : TOTAL */}
                <div className="text-xl font-bold text-slate-900">
                  <AnimateNumber value={p.total} />
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>


      {/* ===== CONTENT TARGET SUMMARY ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-400 text-white p-6 rounded-xl shadow flex justify-between">
          <div>
            <div className="text-2xl font-bold">
              <AnimateNumber value={contentSummary.posted_total} /> /{" "}
              <AnimateNumber value={contentSummary.target_total} />
            </div>
            <div className="text-sm opacity-80">
              Total Postingan Konten
            </div>
          </div>
          <Icon icon="solar:document-text-bold" width={32} />
        </div>
      </div>

      {/* ===== QUICK ACCESS ===== */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-50">
        <h2 className="text-lg font-semibold mb-1 text-slate-800">Akses Cepat</h2>
        <p className="text-sm text-slate-500 mb-5">Navigasi cepat ke fitur utama sistem</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickMenus.map(m => (
            <div key={m.title} onClick={() => navigate(m.path)}
              className="group cursor-pointer rounded-2xl border p-5 hover:shadow-md hover:border-blue-600 transition-all duration-300">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Icon icon={m.icon} width={26} />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{m.title}</div>
                  <div className="text-sm text-slate-500 line-clamp-1">{m.desc}</div>
                  <div className="mt-3 text-sm text-blue-600 font-medium group-hover:translate-x-1 transition-transform inline-block">Buka →</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== MAP ===== */}
      <div className="bg-white rounded-2xl shadow p-6 border border-slate-50">
        <h2 className="text-lg font-semibold mb-2 text-slate-800">Peta Kunjungan</h2>
        <div className="h-96 rounded-2xl overflow-hidden bg-slate-100 relative shadow-inner">
           {/* Jika data sedang dimuat, beri indikator tipis agar tidak kaku */}
           {isLoading && (
             <div className="absolute inset-0 bg-slate-200 animate-pulse z-10 flex items-center justify-center">
               <span className="text-slate-400 text-sm font-medium">Memuat Peta...</span>
             </div>
           )}
           <VisitMap visits={visits} />
        </div>
      </div>

    </div>
  )
}