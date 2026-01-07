import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";

export default function Dashboard() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "Admin";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");
  }, [navigate]);

  // =====================
  // AKSES CEPAT (TAMBAH KONTEN)
  // =====================
  const quickMenus = [
    {
      title: "Koordinator",
      desc: "Kelola data koordinator",
      path: "/koordinator",
      icon: "solar:user-id-bold",
    },
    {
      title: "Relawan",
      desc: "Kelola data relawan",
      path: "/relawan",
      icon: "solar:users-group-rounded-bold",
    },
    {
      title: "Konten",
      desc: "Kelola konten promosi",
      path: "/content",
      icon: "solar:document-text-bold",
    },
    {
      title: "Suara",
      desc: "Manajemen suara",
      path: "/suara/dashboard",
      icon: "solar:clipboard-list-bold",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white rounded-xl p-6 shadow">
        <h1 className="text-2xl font-semibold">
          Selamat Datang, {role}
        </h1>
        <p className="text-sm opacity-90 mt-1">
          Sistem Manajemen SuperWeb
        </p>
      </div>

      {/* ===== AKSES CEPAT ===== */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">
          Akses Cepat
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          Navigasi cepat ke fitur utama sistem
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickMenus.map((m) => (
            <div
              key={m.title}
              onClick={() => navigate(m.path)}
              className="cursor-pointer rounded-xl border border-slate-200
                         p-5 hover:shadow-md hover:border-blue-600 transition"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
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
