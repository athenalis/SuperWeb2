import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Icon } from "@iconify/react"
import api from "../lib/axios"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

// ================= LEAFLET FIX =================
delete L.Icon.Default.prototype._getIconUrl

// ================= ICON LOCATION (COLORED SVG) =================
const createStatusIcon = (color) =>
  L.divIcon({
    html: `
      <svg xmlns="http://www.w3.org/2000/svg"
        width="36" height="36" viewBox="0 0 24 24"
        fill="${color}"
        style="filter: drop-shadow(0 4px 6px rgba(0,0,0,.4));">
        <path d="M12 2c3.86 0 7 3.14 7 7 0 5.25-7 13-7 13S5 14.25 5 9c0-3.86 3.14-7 7-7zm0 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>
      </svg>
    `,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  })

const statusIcons = {
  completed: createStatusIcon("#22c55e"),
  pending: createStatusIcon("#eab308"),
  rejected: createStatusIcon("#ef4444"),
  process: createStatusIcon("#3b82f6"),
  default: createStatusIcon("#64748b"),
}

const quickMenus = [
  { title: "Data Koordinator", desc: "Kelola data koordinator", icon: "solar:user-id-bold", path: "/koordinator" },
  { title: "Data Relawan", desc: "Kelola data relawan", icon: "solar:users-group-rounded-bold", path: "/relawan" },
  { title: "Peta Kunjungan", desc: "Monitoring lokasi relawan", icon: "solar:map-point-bold", path: "/peta" },
  { title: "Laporan", desc: "Rekap & laporan aktivitas", icon: "solar:chart-bold", path: "/laporan" },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const role = localStorage.getItem("role") || "Admin"

  const [summary, setSummary] = useState({ koordinator_total: 0, relawan_total: 0 })
  const [visits, setVisits] = useState([])

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) navigate("/login")

    api.get("/dashboard").then(res => res.data.success && setSummary(res.data.data))
    api.get("peta/visit").then(res => res.data.success && setVisits(res.data.data))
  }, [navigate])

  return (
    <div className="space-y-6">

      {/* ===== HEADER ===== */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white rounded-xl p-6 shadow">
        <h1 className="text-2xl font-semibold">Selamat Datang, {role}</h1>
        <p className="text-sm opacity-90 mt-1">Sistem Manajemen SuperWeb</p>
      </div>

      {/* ===== SUMMARY ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-400 text-white p-6 rounded-xl shadow flex justify-between">
          <div>
            <div className="text-2xl font-bold">{summary.koordinator_total}</div>
            <div className="text-sm opacity-80">Koordinator</div>
          </div>
          <Icon icon="solar:user-id-bold" width={32} />
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-300 text-white p-6 rounded-xl shadow flex justify-between">
          <div>
            <div className="text-2xl font-bold">{summary.relawan_total}</div>
            <div className="text-sm opacity-80">Relawan</div>
          </div>
          <Icon icon="solar:users-group-rounded-bold" width={32} />
        </div>
      </div>

      {/* ===== QUICK ACCESS ===== */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-1">Akses Cepat</h2>
        <p className="text-sm text-slate-500 mb-5">Navigasi cepat ke fitur utama sistem</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickMenus.map(m => (
            <div key={m.title} onClick={() => navigate(m.path)}
              className="cursor-pointer rounded-xl border p-5 hover:shadow-md hover:border-blue-600 transition">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Icon icon={m.icon} width={26} />
                </div>
                <div>
                  <div className="font-semibold">{m.title}</div>
                  <div className="text-sm text-slate-500">{m.desc}</div>
                  <div className="mt-3 text-sm text-blue-600 font-medium">Buka →</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== MAP ===== */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-2">Peta Kunjungan</h2>

        <div className="h-96 rounded-xl overflow-hidden">
          <MapContainer center={[-6.237812, 106.854268]} zoom={13} className="h-full w-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {visits
              .filter(v => !isNaN(v.latitude) && !isNaN(v.longitude))
              .map(v => (
                <Marker
                  key={v.id}
                  position={[parseFloat(v.latitude), parseFloat(v.longitude)]}
                  icon={statusIcons[v.status] || statusIcons.default}
                >
                  <Popup>
                    <b>{v.nama}</b><br />
                    {v.alamat}<br />
                    Status: {v.status}
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </div>
      </div>
    </div>
  )
}
