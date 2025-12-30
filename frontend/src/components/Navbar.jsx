import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Profile from "../components/profile";
import { Icon } from "@iconify/react";

const getNameFromEmail = (email = "") => {
  if (!email) return "Guest";

  const base = email.split("@")[0];
  const clean = base.replace(/[0-9]/g, "");

  return clean
    .split(/[.\-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [openSuara, setOpenSuara] = useState(false);
  const [role, setRole] = useState("");
  const [name, setName] = useState("Guest");
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  useEffect(() => {
    const email = localStorage.getItem("email");
    setRole(localStorage.getItem("role") || "");
    setName(getNameFromEmail(email));
  }, []);

  /* ===== MENU UTAMA ===== */
  const menus = [
    { name: "Dashboard", path: "/dashboard", show: ["admin"] },
    { name: "Koordinator", path: "/koordinator", show: ["admin"] },
    { name: "Relawan", path: "/relawan", show: ["admin", "koordinator"] },
    // { name: "Suara", path: "/suara", show: ["admin"] },
    { name: "Kampanye", path: "/kampanye", show: ["admin"] },
    { name: "Kunjungan", path: "/kunjungan", show: ["relawan"] },
  ];

  /* ===== SUB MENU SUARA ===== */
  const suaraMenus = [
    { name: "Dashboard", path: "/suara/dashboard" },
    { name: "Paslon", path: "/suara/paslon" },
    { name: "Partai", path: "/suara/partai" },
    { name: "DPT", path: "/suara/dpt" }, // ✅ DPT MASUK SINI
    { name: "Analisis", path: "/suara/analisis" },
  ];

  const canSeeSuara = ["admin"].includes(role);

  return (
    <nav className="sticky top-0 z-50 bg-blue-900 text-white shadow-md shadow-black/60">
      <div className="h-20 px-6 flex items-center justify-between">

        {/* LEFT */}
        <div className="flex items-center gap-10">
          <div className="text-2xl font-bold tracking-wide">
            SuperWeb
          </div>

          {/* DESKTOP MENU */}
          <div className="hidden md:flex gap-8 text-md font-medium items-center">
            {menus
              .filter(m => m.show.includes(role))
              .map(menu => (
                <NavLink
                  key={menu.name}
                  to={menu.path}
                  className={({ isActive }) =>
                    `relative pb-2 transition
                     after:absolute after:left-0 after:-bottom-1
                     after:h-[2px] after:w-full after:origin-left
                     after:scale-x-0 after:bg-white after:transition-transform
                     ${isActive ? "after:scale-x-100" : "hover:after:scale-x-100"}`
                  }
                >
                  {menu.name}
                </NavLink>
              ))}

            {/* ===== SUARA DROPDOWN (DESKTOP) ===== */}
            {canSeeSuara && (
              <div className="relative flex items-center">
                <button
                  onClick={() => setOpenSuara(!openSuara)}
                  className="flex items-center gap-1 pb-2 font-medium
                            relative transition
                            after:absolute after:left-0 after:-bottom-1
                            after:h-[2px] after:w-full after:origin-left
                            after:scale-x-0 after:bg-white after:transition-transform
                            hover:after:scale-x-100"
                >
                  <span>Suara</span>
                  <Icon
                    icon="mdi:chevron-down"
                    className="text-lg translate-y-[1px]"
                  />
                </button>

                {openSuara && (
                  <div
                    className="absolute top-full left-0 mt-3 w-48
                              bg-white text-slate-800 rounded-lg shadow-lg
                              overflow-hidden z-50"
                  >
                    {suaraMenus.map(sm => (
                      <NavLink
                        key={sm.name}
                        to={sm.path}
                        onClick={() => setOpenSuara(false)}
                        className={({ isActive }) =>
                          `block px-4 py-2 text-sm hover:bg-blue-50 transition
                          ${isActive ? "bg-blue-100 font-semibold" : ""}`
                        }
                      >
                        {sm.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
)}
          </div>
        </div>

        {/* RIGHT */}
      <div className="hidden md:flex items-center gap-4">

         {/* INBOX – HANYA KOORDINATOR & RELAWAN */}
        {(role === "koordinator" || role === "relawan") && (
          <button
            onClick={() => navigate("/inbox")}
            className="relative p-2 rounded-full hover:bg-blue-800 transition"
            title="Pesan Masuk"
          >
            <Icon icon="ion:notifcations" width={22} />
          </button>
        )}

        {/* USER NAME */}
        <span className="text-sm font-medium">{name}</span>

        {/* PROFILE */}
        <Profile />
      </div>


        {/* HAMBURGER */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-3xl font-bold"
        >
          ☰
        </button>
      </div>

        {/* ===== MOBILE MENU ===== */}
        {open && (
          <div className="md:hidden bg-blue-900 px-6 pb-6 space-y-4">

            {/* MENU UTAMA */}
            {menus
              .filter(m => m.show.includes(role))
              .map(menu => (
                <NavLink
                  key={menu.name}
                  to={menu.path}
                  onClick={() => setOpen(false)}
                  className="block text-lg font-medium"
                >
                  {menu.name}
                </NavLink>
              ))}

            {/* SUARA MOBILE */}
            {canSeeSuara && (
              <div>
                <button
                  onClick={() => setOpenSuara(!openSuara)}
                  className="flex items-center gap-2 text-lg font-medium"
                >
                  Suara
                  <Icon icon="mdi:chevron-down" />
                </button>

                {openSuara && (
                  <div className="pl-4 mt-2 space-y-2">
                    {suaraMenus.map(sm => (
                      <NavLink
                        key={sm.name}
                        to={sm.path}
                        onClick={() => {
                          setOpen(false);
                          setOpenSuara(false);
                        }}
                        className="block text-base"
                      >
                        {sm.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===== USER + LOGOUT ===== */}
            <div className="pt-4 border-t border-blue-700 flex items-center justify-between">
              
              {/* USER INFO */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white text-blue-900
                                flex items-center justify-center font-bold">
                  {name?.[0] || "U"}
                </div>

                <div className="text-sm leading-tight">
                  <div className="text-blue-200">Login sebagai</div>
                  <div className="font-semibold text-white truncate max-w-[140px]">
                    {name}
                  </div>
                </div>
              </div>

              {/* LOGOUT */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-red-400
                           hover:text-red transition"
                title="Logout"
              >
                <Icon icon="solar:logout-2-outline" width={22} />
              </button>
            </div>
          </div>
        )}
    </nav>
  );
}
