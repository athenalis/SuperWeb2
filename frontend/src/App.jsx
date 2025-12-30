import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import MainLayout from "./layouts/MainLayout";

import Koordinator from "./pages/koordinator/index";
import CreateKoordinator from "./pages/koordinator/create";
import EditKoordinator from "./pages/koordinator/edit";
import RiwayatKoordinator from "./pages/koordinator/history";
import DetailKoordinator from "./pages/koordinator/detail";

import Relawan from "./pages/relawan/index";
import DetailRelawan from "./pages/relawan/detail";
import EditRelawan from "./pages/relawan/edit";
import CreateRelawan from "./pages/relawan/create";

import Kunjungan from "./pages/kunjungan/index";
import KunjunganAnggota from "./pages/kunjungan/anggota";
import KunjunganDetail from "./pages/kunjungan/detail";
import KunjunganEdit from "./pages/kunjungan/edit";

import Suara from "./pages/suara/dashboard/index";
import SuaraTest from "./pages/suara/test";

import Paslon from "./pages/suara/paslon/index";

import Partai from "./pages/suara/partai/index";

import AnalisisPaslon from "./pages/suara/analisis/index";

import DPT from "./pages/suara/dpt/index";

import Inbox from "./pages/inbox/index";




import RequireAuth from "./middlewares/RequireAuth";
import RequireRole from "./middlewares/RequireRole";

export default function App() {
  return (
    <Routes>
      {/* ROOT */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* LOGIN */}
      <Route path="/login" element={<Login />} />

      {/* SEMUA HARUS LOGIN */}
      <Route element={<RequireAuth />}>
        <Route path="/" element={<MainLayout />}>

          {/* SEMUA ROLE */}
          <Route path="dashboard" element={<Dashboard />} />

          {/* ================= ADMIN ONLY ================= */}
          <Route element={<RequireRole allowedRoles={["admin"]} />}>
            <Route path="koordinator" element={<Koordinator />} />
            <Route path="koordinator/create" element={<CreateKoordinator />} />
            <Route path="koordinator/:id/edit" element={<EditKoordinator />} />
            <Route path="koordinator/:id/history" element={<RiwayatKoordinator />} />
            <Route path="koordinator/:id" element={<DetailKoordinator />} />
            <Route path="suara/dashboard" element={<Suara />} />
            <Route path="suara/test" element={<SuaraTest />} />
            <Route path="suara/paslon" element={<Paslon />} />
            <Route path="suara/partai" element={<Partai />} />
            <Route path="suara/dpt" element={<DPT />} />
            <Route path="suara/analisis" element={<AnalisisPaslon />} />

          </Route>

          {/* =========== ADMIN & KOORDINATOR =========== */}
          <Route element={<RequireRole allowedRoles={["admin","koordinator"]} />}>
            <Route path="relawan" element={<Relawan />} />
            <Route path="relawan/:id" element={<DetailRelawan />} />
          </Route>

          {/* =========== KOORDINATOR ONLY =========== */}
          <Route element={<RequireRole allowedRoles={["koordinator"]} />}>
            <Route path="relawan/create" element={<CreateRelawan />} />
            <Route path="relawan/:id/edit" element={<EditRelawan />} />
          </Route>

          {/* =========== KOORDINATOR & RELAWAN =========== */}
          <Route element={<RequireRole allowedRoles={["admin","koordinator","relawan"]} />}>
            <Route path="kunjungan" element={<Kunjungan />} />
            <Route path="kunjungan/anggota" element={<KunjunganAnggota />} />
            <Route path="kunjungan/:id" element={<KunjunganDetail />} />
            <Route path="kunjungan/:id/edit" element={<KunjunganEdit />} />
            <Route path="inbox" element={<Inbox />} />
          </Route>

        </Route>
      </Route>
    </Routes>
  );
}
