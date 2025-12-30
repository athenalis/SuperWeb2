import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";

/* =========================
   HELPER
========================= */
const getNameFromEmail = (email = "") => {
  if (!email) return "Guest";

  // ambil sebelum @
  const base = email.split("@")[0];

  // hapus angka
  const clean = base.replace(/[0-9]/g, "");

  // kalau cuma 1 kata (admin)
  if (!clean.includes(".")) {
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  // kalau ada pemisah
  return clean
    .split(/[.\-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const getInitials = (name = "") => {
  if (!name || name === "Guest") return "G";

  return name
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

export default function Profile() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const email = localStorage.getItem("email"); // 🔥 INI KUNCI
  const name = getNameFromEmail(email);
  const initials = getInitials(name);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="relative" ref={ref}>
      {/* AVATAR */}
      <button
        onClick={() => setOpen(!open)}
        className={`
          w-11 h-11 rounded-full bg-white text-blue-800
          flex items-center justify-center font-bold
          transition
          ${
            open
              ? "ring-2 ring-white ring-offset-2 ring-offset-blue-900"
              : "hover:ring-2 hover:ring-white/70 hover:ring-offset-2 hover:ring-offset-blue-900"
          }
        `}
      >
        {initials}
      </button>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-lg border z-50">
          <div className="px-4 py-3 border-b">
            <div className="text-sm font-semibold text-slate-800">
              {name}
            </div>
            <div className="text-xs text-slate-500 truncate">
              {email}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3
                       text-sm text-red-600 hover:bg-red-50 transition"
          >
            <Icon icon="solar:logout-2-outline" width="18" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
