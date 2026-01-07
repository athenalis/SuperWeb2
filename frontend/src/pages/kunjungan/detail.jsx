import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../lib/axios";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";

/* =========================
   HELPERS
========================= */
function formatDate(dateString) {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

/* =========================
   SUB COMPONENTS
========================= */
function Section({ title, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 border-b pb-2">
        <span className="w-1.5 h-6 bg-blue-900 rounded-full" />
        <h2 className="text-lg md:text-xl font-bold text-slate-800">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function Grid({ children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
      {children}
    </div>
  );
}

function Field({ label, value, full = false }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="bg-slate-50 border rounded-lg px-3 md:px-4 py-2 md:py-3 space-y-1">
        <div className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </div>
        <div className="text-sm md:text-base text-slate-800 font-medium break-words">
          {value || "-"}
        </div>
      </div>
    </div>
  );
}

const scaleLabels = {
  1: "Sangat Tidak Setuju",
  2: "Tidak Setuju",
  3: "Setuju",
  4: "Sangat Setuju"
};


/* =========================
   MAIN COMPONENT
========================= */
export default function KunjunganDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const role = localStorage.getItem("role");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    api.get(`/kunjungan/${id}`)
      .then(res => {
        if (res.data.success) {
          setData(res.data.data);
        } else {
          setError(res.data.message);
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Gagal memuat data kunjungan");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="animate-spin w-10 h-10 border-4 border-blue-900 border-t-transparent rounded-full" />
      <p className="mt-4 text-slate-500">Memuat detail kunjungan...</p>
    </div>
  );

  if (error) return (
    <div className="max-w-4xl mx-auto py-10 text-center px-4">
      <Icon icon="mdi:alert-circle" width="60" className="mx-auto text-red-500 mb-4" />
      <h2 className="text-xl md:text-2xl font-bold text-slate-800">{error}</h2>
      <button onClick={() => navigate("/kunjungan")} className="mt-6 px-6 py-2 bg-blue-900 text-white rounded-lg">
        Kembali ke Daftar
      </button>
    </div>
  );

  if (!data) return <p className="text-center py-10 italic">Data tidak ditemukan</p>;

  const questions = [
    { key: "tau_paslon", label: "Mengenal pasangan calon" },
    { key: "tau_informasi", label: "Informasi pemilihan" },
    { key: "tau_visi_misi", label: "Visi dan misi" },
    { key: "tau_program_kerja", label: "Program kerja" },
    { key: "tau_rekam_jejak", label: "Rekam jejak" },
    { key: "pernah_dikunjungi", label: "Pernah dikunjungi?", type: "yesno" },
    { key: "percaya", label: "Kepercayaan" },
    { key: "harapan", label: "Harapan" },
    { key: "pertimbangan", label: "Pertimbangan" },
    { key: "ingin_memilih", label: "Kesediaan memilih" },
  ];

  const getStatusColor = (kunjungan) => {
    if (kunjungan.status === 'draft') return 'bg-gray-100 text-gray-700 border-gray-200';
    switch (kunjungan.status_verifikasi?.toLowerCase()) {
      case 'accepted': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  const getStatusLabel = (kunjungan) => {
    if (kunjungan.status === 'draft') return 'Draft';
    switch (kunjungan.status_verifikasi?.toLowerCase()) {
      case 'accepted': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      default: return 'Pending';
    }
  };

  const canVerify = role === "koordinator" && data.status_verifikasi === "pending";

  return (
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-6 pb-20 px-3 md:px-4">

      {/* HEADER */}
      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-3 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => navigate(-1)} className="p-1.5 md:p-2 hover:bg-slate-100 rounded-full transition text-slate-600">
              <Icon icon="mdi:arrow-left" width="20" className="md:w-6 md:h-6" />
            </button>
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-blue-900">Detail Kunjungan</h1>
              <p className="text-[10px] md:text-sm text-slate-500 font-medium">{formatDate(data.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
            {role === "relawan" && data.status_verifikasi === "rejected" && (
              <button
                onClick={() => navigate(`/kunjungan/${data.id}/edit`)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 rounded-lg md:rounded-xl bg-amber-50 text-amber-700 border border-amber-200 font-bold text-xs md:text-sm hover:bg-amber-100 transition-colors"
              >
                <Icon icon="mdi:pencil" width="16" className="md:w-5 md:h-5" />
                <span className="hidden sm:inline">Edit Data</span>
                <span className="sm:hidden">Edit</span>
              </button>
            )}



            <div className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border-2 font-bold text-[10px] md:text-sm whitespace-nowrap ${getStatusColor(data)}`}>
              {getStatusLabel(data)}
            </div>
          </div>
        </div>

        {/* Komentar verifikasi jika ditolak */}
        {data.status_verifikasi === "rejected" && data.komentar_verifikasi && (
          <div className="mt-4 p-3 md:p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-2">
              <Icon icon="mdi:alert-circle" className="text-red-500 shrink-0 mt-0.5" width="18" />
              <div>
                <div className="text-xs font-bold text-red-700 uppercase mb-1">Alasan Penolakan:</div>
                <p className="text-sm text-red-800">{data.komentar_verifikasi}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

        {/* LEFT COLUMN: PRIMARY INFO */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">

          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 md:p-6 space-y-5 md:space-y-8">
            <Section title="Informasi Kepala Keluarga">
              <Grid>
                <Field label="Nama Lengkap" value={data.nama} />
                <Field label="NIK" value={data.nik} />
                <Field label="Pendidikan" value={data.pendidikan} />
                <Field label="Pekerjaan" value={data.pekerjaan} />
                <Field label="Penghasilan" value={data.penghasilan} />
                <Field label="Tanggal Lahir / Umur" value={`${formatDate(data.tanggal)} (${data.umur} thn)`} />
              </Grid>
              <Field label="Alamat Lengkap" value={data.alamat} full />
            </Section>

            <Section title="Anggota Keluarga">
              {data.family_form?.members?.length > 0 ? (
                <>
                  {/* DESKTOP TABLE */}
                  <div className="hidden md:block overflow-x-auto border rounded-xl font-medium">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-600 text-xs font-bold uppercase">
                        <tr>
                          <th className="px-4 py-3">Nama</th>
                          <th className="px-4 py-3">NIK</th>
                          <th className="px-4 py-3">Hubungan</th>
                          <th className="px-4 py-3">Umur</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-sm">
                        {data.family_form.members.map((m) => (
                          <tr key={m.id}>
                            <td className="px-4 py-3 font-semibold text-slate-800">{m.nama}</td>
                            <td className="px-4 py-3 text-slate-600 font-mono text-xs">{m.nik}</td>
                            <td className="px-4 py-3 text-slate-600 capitalize">{m.hubungan}</td>
                            <td className="px-4 py-3 text-slate-600">{m.umur} Thn</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE CARDS */}
                  <div className="md:hidden space-y-2">
                    {data.family_form.members.map((m) => (
                      <div key={m.id} className="bg-slate-50 border rounded-lg p-3 space-y-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-sm text-slate-900">{m.nama}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{m.nik}</div>
                          </div>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold uppercase">
                            {m.hubungan}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-600">
                          <span className="font-semibold">{m.umur} Tahun</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-slate-500 italic text-center py-4 md:py-6 bg-slate-50 rounded-xl border border-dashed text-sm">Tidak ada data anggota keluarga</p>
              )}
            </Section>

            <Section title="Hasil Kuisioner">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-3">
                {questions.map((q, i) => (
                  <div key={q.key} className="p-2 md:p-3 rounded-lg md:rounded-xl border bg-slate-50/50">
                    <div className="text-[9px] md:text-xs text-slate-400 font-bold mb-1 uppercase">Q{i + 1}</div>
                    <p className="text-[10px] md:text-xs font-medium text-slate-700 leading-tight mb-2 line-clamp-2">
                      {q.label}
                    </p>
                    <div className="px-2 py-1 bg-white border rounded text-[10px] md:text-xs font-semibold text-slate-800 text-center break-words whitespace-pre-wrap">
                      {q.type === 'yesno'
                        ? (data.kepuasan?.[q.key] ? "Ya" : "Tidak")
                        : (scaleLabels[data.kepuasan?.[q.key]] || data.kepuasan?.[q.key] || "-")
                      }
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>

        {/* RIGHT COLUMN: MEDIA & CONTEXT */}
        <div className="space-y-4 md:space-y-6">

          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 md:p-6 space-y-4 md:space-y-6">
            <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center gap-2 text-sm md:text-base">
              <Icon icon="mdi:camera" className="text-blue-900" />
              Dokumentasi KTP
            </h3>
            {data.foto_ktp ? (
              <div className="rounded-lg md:rounded-xl overflow-hidden border shadow-inner">
                <img
                  src={`http://192.168.1.29:9000/storage/${data.foto_ktp}`}
                  alt="KTP Head Of Family"
                  className="w-full h-auto object-contain bg-slate-100 min-h-[150px] md:min-h-[200px]"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://placehold.co/400x250?text=Foto+KTP";
                  }}
                />
              </div>
            ) : (
              <div className="bg-slate-100 aspect-video rounded-lg md:rounded-xl flex items-center justify-center text-slate-400 italic text-xs md:text-sm">
                Foto KTP tidak tersedia
              </div>
            )}

            <div className="space-y-3 md:space-y-4">

              <div className="text-xs md:text-sm">
                <span className="block text-[10px] md:text-xs text-slate-400 uppercase font-bold">Relawan</span>
                <span className="font-semibold text-slate-700">{data.relawan?.nama || "Unknown"}</span>
              </div>
            </div>
          </div>

          {/* Tombol Verifikasi Mobile - Fixed Bottom */}
          {canVerify && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-white border-t shadow-lg">
              <button
                // onClick={() => setShowVerifikasiModal(true)} // This line was removed
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-900 text-white font-bold text-sm hover:bg-blue-800 transition-colors"
              >
                <Icon icon="mdi:clipboard-check" width="20" />
                Verifikasi Kunjungan
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}