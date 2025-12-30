import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../lib/axios";
import { Icon } from "@iconify/react";

/* =========================
   HELPERS
========================= */
function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =========================
   SUB COMPONENTS
========================= */
function Section({ title, children }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="w-1.5 h-6 bg-blue-900 rounded-full" />
        <h2 className="text-lg font-semibold text-slate-800">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function Grid({ children }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {children}
    </div>
  );
}

function Field({ label, value, full = false }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <div className="border rounded-lg px-5 py-4 space-y-1">
        <div className="text-sm font-medium text-slate-500">
          {label}
        </div>
        <div className="text-base text-slate-800">
          {value || "-"}
        </div>
      </div>
    </div>
  );
}

/* =========================
   MAIN COMPONENT
========================= */
export default function RelawanDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ormasList, setOrmasList] = useState([]);
  const role = localStorage.getItem("role");

const ormasName =
  ormasList.find(o => o.id === data.ormas_id)?.nama_ormas || "-";


  // GET DATA DETAIL
  useEffect(() => {
    api.get(`/relawan/${id}`)
      .then(res => setData(res.data.data))
      .catch(() => alert("Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
  api.get("/ormas")
    .then(res => setOrmasList(res.data.data))
    .catch(() => setOrmasList([]));
}, []);


  if (loading) return <p className="text-center py-10">Loading...</p>;
  if (!data) return <p className="text-center py-10">Data tidak ditemukan</p>;

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-8xl bg-white rounded-xl shadow p-8 space-y-10">

      <div className="relative pt-4">
        {/* TITLE – CENTER BENERAN */}
        <h1 className="text-4xl text-blue-900 font-bold mb-6 text-center">
          Detail Relawan
        </h1>

        {/* EDIT BUTTON – TETAP KANAN */}
        {role !== "admin" && (
        <>
        <button
          onClick={() => navigate(`/relawan/${id}/edit`)}
          title="Edit"
          className="absolute right-0 top-1/2 -translate-y-1/2
                    w-11 h-11 flex items-center justify-center
                    rounded-lg border border-blue-900 text-blue-900
                    hover:bg-blue-900 hover:text-white transition"
        >
          <Icon icon="solar:pen-outline" width={20} />
        </button>
        </>
        )}
      </div>

        {/* INFORMASI */}
        <Section title="Informasi Relawan">
          <Grid>
            <Field label="Nama" value={data.nama} />
            <Field label="NIK" value={data.nik} />
            <Field label="No HP" value={data.no_hp} />
            <Field label="TPS" value={data.tps} />
            <Field label="Ormas" value={ormasName} />
            <Field label="Koordinator" value={data.koordinator?.nama || data.koordinator || "-"} />
            <Field label="Alamat" value={data.alamat} />
            <Field label="Email Login" value={data.user?.email} />
          </Grid>

        </Section>

        {/* WILAYAH */}
        <Section title="Wilayah Penugasan">
          <Grid>
            <Field label="Provinsi" value={data.province?.province} />
            <Field label="Kota/Kabupaten" value={data.city?.city} />
            <Field label="Kecamatan" value={data.district?.district} />
            <Field label="Kelurahan" value={data.village?.village} />
          </Grid>
        </Section>

        {/* STATUS */}
        <Section title="Status">
          <div className="border rounded-xl px-6 py-5">
            <span
              className={`inline-flex px-4 py-1.5 rounded-full text-sm font-semibold
                ${data.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
                }`}
            >
              {data.status === "active" ? "Aktif" : "Tidak Aktif"}
            </span>
          </div>
        </Section>

        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap justify-end gap-3 pt-4">

          {/* KEMBALI (TETAP TEXT) */}
          <button
            onClick={() => navigate("/relawan")}
            className="px-5 py-2.5 rounded-lg
                      bg-slate-200 text-slate-800 font-medium
                      hover:bg-slate-300 transition"
          >
            Kembali
          </button>
        </div>
      </div>
    </div>
  );
}
