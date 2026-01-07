import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "../lib/axios";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";

const getNameFromEmail = (email = "") => {
  if (!email) return "Guest";

  const base = email.split("@")[0];
  const clean = base.replace(/[0-9]/g, "");

  return clean
    .split(/[.\-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/login", payload);
      return res.data;
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      localStorage.setItem("email", data.user.email);
      localStorage.setItem("role", data.user.role);

      const name = getNameFromEmail(data.user.email);
      toast.success(`Login berhasil sebagai ${name}`);

      const role = data.user.role;
      if (role === "admin") navigate("/dashboard");
      else if (role === "koordinator") navigate("/relawan");
      else if (role === "relawan") navigate("/kunjungan");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">

      {/* ===== BACKGROUND IMAGE ===== */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://i.pinimg.com/736x/2b/bf/bb/2bbfbb9bc6d892bce0c7c99a5025238f.jpg')",
        }}
      />

      {/* ===== DARK OVERLAY ===== */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* ===== LOGIN CARD ===== */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-10">

          {/* HEADER */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800">
              Selamat Datang
            </h1>
            <p className="text-md text-slate-500 mt-1">
              Silahkan login dengan akun anda
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* EMAIL */}
            <div className="mb-4">
              <label className="block text-md font-medium text-slate-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Icon
                  icon="mdi:email-outline"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  width="22"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@gmail.com"
                  required
                  className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-blue-800"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="mb-4">
              <label className="block text-md font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Icon
                  icon="mdi:lock-outline"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  width="22"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-11 pr-10 py-3 border border-slate-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-blue-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <Icon
                    icon={showPassword ? "mdi:eye-off-outline" : "mdi:eye-outline"}
                    width="22"
                  />
                </button>
              </div>
            </div>

            {/* REMEMBER */}
            <div className="flex items-center mb-6">
              <input type="checkbox" className="w-4 h-4" />
              <span className="ml-2 text-sm text-slate-600">
                Remember me
              </span>
            </div>

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loginMutation.isLoading}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white py-3
                         rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              {loginMutation.isLoading ? (
                "Signing in..."
              ) : (
                <>
                  <Icon icon="mdi:login" width="20" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* ERROR */}
          {loginMutation.isError && (
            <p className="text-red-500 text-sm mt-4 text-center">
              {loginMutation.error?.response?.data?.message ||
                "Email atau password salah"}
            </p>
          )}

          {/* FOOTER */}
          <p className="text-xs text-center text-slate-400 mt-6">
            © 2025 RelawanApp
          </p>
        </div>
      </div>
    </div>
  );
}
