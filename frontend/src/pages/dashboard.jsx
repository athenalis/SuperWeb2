import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";

export default function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");
  }, [navigate]);

  const suaraMenus = [
    {
      title: "Dashboard Suara",
      desc: "Ringkasan data suara",
      path: "/suara/dashboard",
      icon: "solar:chart-2-bold",
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Paslon",
      desc: "Analisis perolehan paslon",
      path: "/suara/paslon",
      icon: "solar:users-group-rounded-bold",
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      title: "Partai",
      desc: "Analisis suara partai",
      path: "/suara/partai",
      icon: "solar:flag-bold",
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "DPT",
      desc: "Data pemilih terdaftar",
      path: "/suara/dpt",
      icon: "solar:clipboard-list-bold",
      color: "bg-orange-50 text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">

      {/* ================= HEADER ================= */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-xl font-semibold text-slate-800">
          Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Akses cepat fitur utama sistem
        </p>
      </div>

      {/* ================= AKSES CEPAT SUARA ================= */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">
          Menu Suara
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          Akses cepat fitur pengolahan dan analisis suara
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {suaraMenus.map((m) => (
            <div
              key={m.title}
              onClick={() => navigate(m.path)}
              className="cursor-pointer rounded-xl border border-slate-200
                         p-5 hover:shadow-md hover:border-blue-500 transition"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${m.color}`}
                >
                  <Icon icon={m.icon} width={26} />
                </div>

                <div className="flex-1">
                  <div className="font-semibold text-slate-800">
                    {m.title}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {m.desc}
                  </div>

                  <div className="mt-3 text-sm font-medium text-blue-600">
                    Buka →
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
