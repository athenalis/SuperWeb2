import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../lib/axios";
import { Icon } from "@iconify/react";

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
        <h2 className="text-xl font-bold text-slate-800">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function Grid({ children, cols = 2 }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-4`}>
      {children}
    </div>
  );
}

function Field({ label, value, full = false }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <div className="bg-slate-50 border rounded-lg px-4 py-3 space-y-1">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </div>
        <div className="text-base text-slate-800 font-medium">
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
    <div className="max-w-4xl mx-auto py-10 text-center">
      <Icon icon="mdi:alert-circle" width="60" className="mx-auto text-red-500 mb-4" />
      <h2 className="text-2xl font-bold text-slate-800">{error}</h2>
      <button onClick={() => navigate("/kunjungan")} className="mt-6 px-6 py-2 bg-blue-900 text-white rounded-lg">
        Kembali ke Daftar
      </button>
    </div>
  );

  if (!data) return <p className="text-center py-10 italic">Data tidak ditemukan</p>;

  const questions = [
    { key: "tau_paslon", label: "Saya mengenal pasangan Pramono Anung - Rano Karno yang maju dalam pemilihan gubernur ini" },
    { key: "tau_informasi", label: "Informasi mengenai pemilihan gubernur saat ini sudah saya pahami dengan cukup jelas" },
    { key: "tau_visi_misi", label: "Saya mengetahui visi dan misi pasangan calon yang maju dalam pemilihan gubernur ini" },
    { key: "tau_program_kerja", label: "Program kerja pasangan calon menjadi pertimbangan utama saya dalam menentukan pilihan" },
    { key: "tau_rekam_jejak", label: "Rekam jejak calon gubernur memengaruhi keputusan saya dalam memilih" },
    { key: "pernah_dikunjungi", label: "Pernah dikunjungi sebelumnya oleh relawan atau tim sukses?", type: "yesno" },
    { key: "percaya", label: "Saya percaya pasangan calon ini memiliki kemampuan untuk memimpin daerah dengan baik" },
    { key: "harapan", label: "Saya berharap pemimpin terpilih nanti dapat membawa perubahan yang lebih baik bagi daerah ini" },
    { key: "pertimbangan", label: "Saya bersedia mempertimbangkan atau memilih pasangan calon apabila programnya sesuai dengan kebutuhan daerah saya" },
    { key: "ingin_memilih", label: "Saya bersedia memilih pasangan Pramono Anung - Rano Karno pada pemilihan gubernur mendatang" },
  ];

  const getStatusColor = (kunjungan) => {
    if (kunjungan.status === 'draft') return 'bg-gray-100 text-gray-700 border-gray-200';
    switch (kunjungan.status_verifikasi?.toLowerCase()) {
      case 'accepted': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    }
  };

  const getStatusLabel = (kunjungan) => {
    if (kunjungan.status === 'draft') return 'Draft';
    switch (kunjungan.status_verifikasi?.toLowerCase()) {
      case 'accepted': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      default: return 'Menunggu Verifikasi';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-20 px-4 md:px-0">
      
      {/* HEADER */}
      <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <button onClick={() => navigate("/kunjungan")} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-600">
            <Icon icon="mdi:arrow-left" width="24" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-blue-900">Detail Kunjungan</h1>
            <p className="text-[10px] md:text-sm text-slate-500 font-medium tracking-tight">Dicatat pada {formatDate(data.created_at)}</p>
          </div>
        </div>
        
        <div className={`w-full md:w-auto text-center px-4 py-2 rounded-xl border-2 font-bold text-xs md:text-sm ${getStatusColor(data)}`}>
          {getStatusLabel(data)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* LEFT COLUMN: PRIMARY INFO */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          
          <div className="bg-white rounded-2xl shadow-sm p-5 md:p-8 space-y-6 md:space-y-8">
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
              <div className="grid grid-cols-2 gap-4">
                 <Field label="Latitude" value={data.latitude} />
                 <Field label="Longitude" value={data.longitude} />
              </div>
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
                            <td className="px-4 py-3 text-slate-600 font-mono">{m.nik}</td>
                            <td className="px-4 py-3 text-slate-600 capitalize">{m.hubungan}</td>
                            <td className="px-4 py-3 text-slate-600">{m.umur} Thn</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE CARDS */}
                  <div className="md:hidden space-y-3">
                    {data.family_form.members.map((m) => (
                      <div key={m.id} className="bg-slate-50 border rounded-xl p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-slate-900">{m.nama}</div>
                            <div className="text-xs text-slate-500 font-mono">{m.nik}</div>
                          </div>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wider">
                            {m.hubungan}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600">
                          <span className="font-semibold">{m.umur} Tahun</span> • {m.pendidikan || "-"} • {m.pekerjaan || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-slate-500 italic text-center py-6 bg-slate-50 rounded-xl border border-dashed">Tidak ada data anggota keluarga</p>
              )}
            </Section>

            <Section title="Hasil Kuisioner">
              <div className="space-y-4">
                {questions.map((q, i) => (
                  <div key={q.key} className="p-4 rounded-xl border bg-slate-50/50">
                    <div className="text-xs text-slate-400 font-bold mb-1">PERTANYAAN #{i+1}</div>
                    <p className="text-sm font-semibold text-slate-700 leading-relaxed mb-2">{q.label}</p>
                    <div className="inline-block px-3 py-1 bg-white border rounded-lg text-sm font-bold text-blue-900 shadow-sm">
                      {q.type === 'yesno' 
                        ? (data.kepuasan?.[q.key] ? "Ya" : "Tidak")
                        : (scaleLabels[data.kepuasan?.[q.key]] || "Belum Dijawab")
                      }
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>

        {/* RIGHT COLUMN: MEDIA & CONTEXT */}
        <div className="space-y-8">
          
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
            <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
              <Icon icon="mdi:camera" className="text-blue-900" />
              Dokumentasi KTP
            </h3>
            {data.foto_ktp ? (
              <div className="rounded-xl overflow-hidden border shadow-inner">
                 <img 
                  src={import.meta.env.VITE_STORAGE_URL 
                    ? `${import.meta.env.VITE_STORAGE_URL}/${data.foto_ktp}`
                    : `${api.defaults.baseURL.replace('/api', '')}/storage/${data.foto_ktp}`
                  } 
                  alt="KTP Head Of Family" 
                  className="w-full h-auto object-contain bg-slate-100 min-h-[200px]"
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = "https://placehold.co/400x250?text=Foto+KTP+Bermasalah";
                  }}
                />
              </div>
            ) : (
              <div className="bg-slate-100 aspect-video rounded-xl flex items-center justify-center text-slate-400 italic text-sm">
                Foto KTP tidak tersedia
              </div>
            )}
            
            <Section title="Konteks Penugasan">
              <div className="space-y-4">
                <div className="text-sm">
                  <span className="block text-xs text-slate-400 uppercase font-bold">Relawan</span>
                  <span className="font-semibold text-slate-700">{data.relawan?.nama || "Unknown"}</span>
                </div>
                <div className="text-sm">
                  <span className="block text-xs text-slate-400 uppercase font-bold">Kampanye</span>
                  <span className="font-semibold text-slate-700">{data.campaign?.nama || "-"}</span>
                </div>
                <div className="text-sm">
                  <span className="block text-xs text-slate-400 uppercase font-bold">Status Berkas</span>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${data.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {data.status}
                  </span>
                </div>
              </div>
            </Section>
          </div>

          <div className="bg-blue-900 rounded-2xl p-6 text-white shadow-lg space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <Icon icon="mdi:information-outline" />
                Catatan Sistem
              </h3>
              <p className="text-xs text-blue-100 leading-relaxed italic">
                Data ini dicatat pada {formatDate(data.created_at)}. 
                Menunggu verifikasi dari Koordinator untuk divalidasi sebagai tugas yang sah.
              </p>
          </div>

        </div>

      </div>

    </div>
  );
}
