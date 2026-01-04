import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";

export default function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");
  }, [navigate]);

  // ================= DUMMY STATS (AMAN BUAT BESOK) =================
  const stats = [
    {
      label: "Total Relawan",
      value: 128,
      icon: "solar:users-group-rounded-bold",
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Total Koordinator",
      value: 12,
      icon: "solar:user-id-bold",
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Suara Masuk",
      value: 3240,
      icon: "solar:chart-2-bold",
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "TPS Terdata",
      value: 210,
      icon: "solar:map-point-bold",
      color: "bg-orange-50 text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">

      {/* ================= HEADER ================= */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-semibold text-slate-800">
          Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Ringkasan kondisi sistem saat ini
        </p>
      </div>

      {/* ================= STAT CARDS ================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4"
          >
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center ${s.color}`}
            >
              <Icon icon={s.icon} width={26} />
            </div>

            <div>
              <div className="text-sm text-slate-500">
                {s.label}
              </div>
              <div className="text-xl font-semibold text-slate-800">
                {s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
