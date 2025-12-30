  import { useState, useEffect } from "react";
  import { useNavigate, useParams } from "react-router-dom";
  import api from "../../lib/axios";
  import {Icon} from "@iconify/react";

  export default function EditKunjungan() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [initialData, setInitialData] = useState(null);

    useEffect(() => {
      fetchInitialData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchInitialData = async () => {
      try {
        const res = await api.get(`/kunjungan/${id}`);
        if (res.data.success) {
          setInitialData(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch kunjungan data", err);
      } finally {
        setLoading(false);
      }
    };

    if (loading) return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-4 md:py-8 px-2 md:px-4">
        <div className="max-w-8xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden text-slate-900 leading-normal">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 md:px-8 py-4 md:py-6">
              <h1 className="text-2xl md:text-3xl font-bold text-white">Edit Kunjungan</h1>
              <p className="text-blue-100 mt-1 text-sm md:text-base">Ubah data kunjungan melalui tahapan berikut</p>
            </div>

            <div className="px-4 md:px-8 py-4 md:py-6 bg-gray-50 border-b">
              <Stepper step={step} />
            </div>

            <div className="p-4 md:p-8">
              {step === 1 && (
                <Step1 
                  initial={initialData} 
                  onNext={() => { setStep(2); window.scrollTo(0,0); }} 
                />
              )}
              {step === 2 && (
                <Step2 
                  kunjunganId={id} 
                  initialMembers={initialData.family_form?.members || []}
                  onNext={() => { setStep(3); window.scrollTo(0,0); }} 
                  onBack={() => { setStep(1); window.scrollTo(0,0); }} 
                />
              )}
              {step === 3 && (
                <Step3 
                  kunjunganId={id} 
                  initialAnswers={initialData.kepuasan || {}}
                  onBack={() => { setStep(2); window.scrollTo(0,0); }} 
                  onComplete={() => { setStep(4); window.scrollTo(0,0); }} 
                />
              )}
              {step === 4 && <EditComplete id={id} navigate={navigate} />}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function Stepper({ step }) {
    const steps = [
      { num: 1, label: "Info Dasar", icon: "1" },
      { num: 2, label: "Anggota", icon: "2" },
      { num: 3, label: "Kuisioner", icon: "3" },
    ];

    return (
      <div className="relative max-w-3xl mx-auto">
      <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-gray-200">
        <div
          className="h-full bg-blue-600 transition-all duration-500"
          style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
        />
      </div>

        <div className="relative grid grid-cols-3">
  {steps.map((s) => (
    <div
      key={s.num}
      className="flex flex-col items-center text-center"
    >
      <div
        className={`
          w-11 h-11 md:w-12 md:h-12
          rounded-full flex items-center justify-center
          text-base md:text-lg font-bold
          border-4 border-white transition-all
          ${step >= s.num
            ? "bg-blue-600 text-white shadow-lg"
            : "bg-gray-200 text-gray-500"}
        `}
      >
        {s.icon}
      </div>

      <span
        className={`
          mt-3 text-xs md:text-sm font-semibold
          ${step >= s.num ? "text-blue-600" : "text-gray-400"}
        `}
      >
        {s.label}
      </span>
    </div>
  ))}

        </div>
      </div>
    );
  }

  function Step1({ initial, onNext }) {
    const [form, setForm] = useState({
      nama: initial?.nama || "",
      nik: initial?.nik || "",
      tanggal: initial?.tanggal || "",
      pendidikan: initial?.pendidikan || "",
      pekerjaan: initial?.pekerjaan || "",
      penghasilan: initial?.penghasilan || "",
      fotoKtp: null,
      alamat: initial?.alamat || "",
      latitude: initial?.latitude || "",
      longitude: initial?.longitude || ""
    });
    const [previewUrl, setPreviewUrl] = useState(initial?.foto_ktp ? `${import.meta.env.VITE_STORAGE_URL}/${initial.foto_ktp}` : "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [pekerjaanList, setPekerjaanList] = useState([]);

    useEffect(() => {
      fetchPekerjaan();
    }, []);

    const fetchPekerjaan = async () => {
      try {
        const res = await api.get("/wilayah/pekerjaan");
        setPekerjaanList(res.data.map(item => item.nama));
      } catch (err) {
        console.error(err);
      }
    };

    const handleFotoChange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        setError("Ukuran foto maksimal 5MB");
        return;
      }
      setForm(prev => ({ ...prev, fotoKtp: file }));
      setPreviewUrl(URL.createObjectURL(file));
      setError("");
    };

    const handleSubmit = async () => {
   if (!isComplete) {
    setError("Mohon lengkapi semua jawaban kuisioner");
    return;
  }
      setLoading(true);
      setError("");
      try {
        const fd = new FormData();
        fd.append("nama", form.nama);
        fd.append("nik", form.nik);
        fd.append("tanggal", form.tanggal);
        fd.append("pendidikan", form.pendidikan);
        fd.append("pekerjaan", form.pekerjaan);
        fd.append("penghasilan", form.penghasilan);
        fd.append("alamat", form.alamat);
        fd.append("latitude", form.latitude);
        fd.append("longitude", form.longitude);
        if (form.fotoKtp) {
          fd.append("foto_ktp", form.fotoKtp);
        }

        await api.post(`/kunjungan/${initial.id}?_method=PUT`, fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });

        onNext();
      } catch (err) {
        console.error(err);
        setError(err?.response?.data?.message || "Gagal memperbarui data");
      } finally {
        setLoading(false);
      }
    };

    const isValid = form.nama && /^\d{16}$/.test(form.nik) && form.tanggal && 
                    form.pendidikan && form.pekerjaan && form.penghasilan && form.alamat;

    return (
      <div className="space-y-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Informasi Kepala Keluarga</h2>
        
        {error && <Alert type="error" message={error} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Input label="Nama Lengkap" value={form.nama} onChange={(v) => setForm({...form, nama: v})} required />
          <Input label="NIK (16 digit)" value={form.nik} onChange={(v) => /^\d{0,16}$/.test(v) && setForm({...form, nik: v})} 
                maxLength={16} required placeholder="3201234567891234" />
          <Input type="date" label="Tanggal Lahir" value={form.tanggal} onChange={(v) => setForm({...form, tanggal: v})} required />
          <Select label="Pendidikan" value={form.pendidikan} onChange={(v) => setForm({...form, pendidikan: v})} 
                  options={["SD", "SMP", "SMA/SMK", "D3", "S1", "S2+"]} required />
          <Select label="Pekerjaan" value={form.pekerjaan} onChange={(v) => setForm({...form, pekerjaan: v})} 
                  options={pekerjaanList} required />
          <Select label="Penghasilan" value={form.penghasilan} onChange={(v) => setForm({...form, penghasilan: v})}
                  options={["< Rp500.000", "Rp500.000 - Rp1.500.000", "Rp1.500.000 - Rp3.000.000", "Rp3.000.000 - Rp5.000.000", "> Rp5.000.000"]} required />
        </div>

        <div>
          <label className="block font-semibold mb-2">Foto KTP <span className="text-red-500">*</span></label>
          <div 
            onClick={() => document.getElementById("editFotoKtp").click()}
            className="border-2 border-dashed rounded-xl p-4 md:p-8 text-center transition border-gray-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50"
          >
            {!previewUrl ? (
              <div className="space-y-1 md:space-y-2 flex flex-col items-center justify-center text-center">
                <Icon icon="mdi:camera" className="text-4xl md:text-5xl text-gray-500" /> 
                <p className="text-sm md:text-base text-gray-600">Klik untuk ambil/upload foto KTP</p>
                <p className="text-xs md:text-sm text-gray-400">Foto KTP wajib dilampirkan (max 5MB)</p>
              </div>
            ) : (
              <div className="space-y-3">
                <img src={previewUrl} className="mx-auto max-h-48 md:max-h-64 rounded-lg shadow-lg" alt="Preview KTP" />
                <div className="text-green-600 font-medium text-sm md:text-base">✓ Foto KTP berhasil dipilih</div>
              </div>
            )}
          </div>
          <input 
            id="editFotoKtp" 
            type="file" 
            accept="image/*" 
            capture="environment"
            className="hidden" 
            onChange={handleFotoChange} 
          />
        </div>

        <Input label="Alamat" value={form.alamat} onChange={(v) => setForm({...form, alamat: v})} required />

        <div className="flex justify-end pt-4">
          <Button onClick={handleSubmit} disabled={!isValid || loading} loading={loading} className="w-full md:w-auto">
            {loading ? "Menyimpan..." : "Lanjut ke Anggota Keluarga →"}
          </Button>
        </div>
      </div>
    );
  }

  function Step2({ kunjunganId, initialMembers, onNext, onBack }) {
    const [members, setMembers] = useState(initialMembers.map(m => ({
      ...m,
      isLocal: false,
      previewUrl: m.foto_ktp ? `${import.meta.env.VITE_STORAGE_URL}/${m.foto_ktp}` : "",
      tanggalLahir: m.tanggal_lahir
    })));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [pekerjaanList, setPekerjaanList] = useState([]);

    useEffect(() => {
      fetchPekerjaan();
    }, []);

    const fetchPekerjaan = async () => {
      try {
        const res = await api.get("/wilayah/pekerjaan");
        setPekerjaanList(res.data.map(i => i.nama));
      } catch (err) {
        console.error(err);
        setPekerjaanList([]);
      }
    };

    const addMember = (e) => {
      e.preventDefault();
      setMembers([...members, { 
        id: Date.now(), 
        isLocal: true,
        nama: "", nik: "", hubungan: "", tanggalLahir: "", pekerjaan: "", pendidikan: "", penghasilan: "",
        fotoKtp: null, previewUrl: "" 
      }]);
    };

    const removeMember = async (mid, isLocal) => {
      if (isLocal) {
          setMembers(members.filter(m => m.id !== mid));
          return;
      }

      if (window.confirm("Hapus anggota ini dari database?")) {
          try {
              await api.delete(`/kunjungan/anggota/${mid}`);
              setMembers(members.filter(m => m.id !== mid));
          } catch (err) {
              console.error(err);
              alert("Gagal menghapus anggota");
          }
      }
    };

    const updateMember = (id, key, value) => {
      setMembers(members.map(m => m.id === id ? {...m, [key]: value} : m));
    };

    const handleSubmit = async () => {
      setLoading(true);
      setError("");
      try {
        for (const m of members) {
          const fd = new FormData();
          fd.append("nama", m.nama);
          fd.append("nik", m.nik);
          fd.append("hubungan", m.hubungan);
          fd.append("tanggal_lahir", m.tanggalLahir);
          fd.append("pekerjaan", m.pekerjaan || "");
          fd.append("pendidikan", m.pendidikan);
          fd.append("penghasilan", m.penghasilan);
          if (m.fotoKtp instanceof File) {
            fd.append("foto_ktp", m.fotoKtp);
          }

          if (m.isLocal) {
            await api.post(`/kunjungan/${kunjunganId}/anggota`, fd);
          } else {
            try {
              await api.post(`/kunjungan/anggota/${m.id}?_method=PUT`, fd);
            } catch(err) {
              console.error(`Gagal update anggota ${m.id}`, err);
            }
          }
        }
        onNext();
      } catch (err) {
        console.error(err);
        setError(err?.response?.data?.message || "Gagal menyimpan data anggota");
      } finally {
        setLoading(false);
      }
    };

    const isValid = members.every(m => m.nama && /^\d{16}$/.test(m.nik) && m.hubungan && m.tanggalLahir && m.pendidikan && m.penghasilan);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Data Anggota Keluarga</h2>
          <button 
            type="button" 
            onClick={addMember} 
            className="w-full sm:w-auto px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-bold"
          >
            + Tambah Anggota
          </button>
        </div>

        {error && <Alert type="error" message={error} />}

        {members.length === 0 && (
          <div className="text-center py-10 md:py-14 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 flex flex-col items-center justify-center">
            <Icon icon="mdi:account-group" className="text-5xl md:text-6xl text-gray-300 mb-4" />
            <p>Klik tombol di atas untuk menambah anggota keluarga</p>
          </div>
        )}

        {members.map((member, idx) => (
          <div key={member.id} className="border rounded-xl p-4 md:p-6 bg-gray-50 relative">
            <button 
              type="button"
              onClick={() => removeMember(member.id, member.isLocal)} 
              className="absolute top-4 right-4 text-red-500 hover:text-red-700 font-bold"
            >
              ✕
            </button>
            
            <h4 className="font-semibold mb-4 text-lg">Anggota #{idx + 1} {!member.isLocal && <span className="text-[10px] text-blue-500 uppercase font-bold tracking-tight bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 ml-2">Record Lama</span>}</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <Input label="Nama Lengkap" value={member.nama} onChange={(v) => updateMember(member.id, "nama", v)} required />
                <Input label="NIK" value={member.nik} onChange={(v) => updateMember(member.id, "nik", v)} required maxLength={16} placeholder="16 digit NIK" />
                <div className="grid grid-cols-2 gap-3">
                  <Select label="Hubungan" value={member.hubungan} onChange={(v) => updateMember(member.id, "hubungan", v)}
                          options={["ayah", "ibu", "anak", "lainnya"]} required />
                  <Input type="date" label="Tgl Lahir" value={member.tanggalLahir} onChange={(v) => updateMember(member.id, "tanggalLahir", v)} required />
                </div>
                <Select label="Pendidikan" value={member.pendidikan} onChange={(v) => updateMember(member.id, "pendidikan", v)}
                        options={["SD", "SMP", "SMA/SMK", "D3", "S1", "S2+"]} required />
                <Select label="Pekerjaan" value={member.pekerjaan} onChange={(v) => updateMember(member.id, "pekerjaan", v)} options={pekerjaanList} />
                <Select label="Penghasilan" value={member.penghasilan} onChange={(v) => updateMember(member.id, "penghasilan", v)}
                        options={["< Rp500.000", "Rp500.000 - Rp1.500.000", "Rp1.500.000 - Rp3.000.000", "Rp3.000.000 - Rp5.000.000", "> Rp5.000.000"]} required />
              </div>

              <div className="flex flex-col">
                <label className="block font-semibold mb-2 text-sm">Foto KTP Anggota <span className="text-gray-400 text-xs font-normal">(Opsional)</span></label>
                <div 
                  onClick={() => document.getElementById(`edt-mbr-${member.id}`).click()}
                  className="flex-1 border-2 border-dashed rounded-xl p-4 text-center border-gray-300 cursor-pointer min-h-[160px] md:min-h-[200px] flex flex-col items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition"
                >
                  {!member.previewUrl ? (
                    <div className="space-y-1 md:space-y-2 flex flex-col items-center justify-center text-center">
                      <Icon icon="mdi:camera" className="text-4xl md:text-5xl text-gray-500" /> 
                      <p className="text-[10px] md:text-xs text-gray-600">Klik untuk upload foto KTP</p>
                    </div>
                  ) : (
                    <img src={member.previewUrl} className="max-h-32 md:max-h-40 rounded-lg shadow-md" alt="Preview" />
                  )}
                </div>
                <input 
                  id={`edt-mbr-${member.id}`} 
                  type="file" 
                  accept="image/*"
                  capture="environment"
                  className="hidden" 
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) { updateMember(member.id, "fotoKtp", f); updateMember(member.id, "previewUrl", URL.createObjectURL(f)); }
                  }}
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
          <Button variant="outline" onClick={onBack} className="w-full sm:w-auto order-2 sm:order-1">← Kembali</Button>
          <Button onClick={handleSubmit} disabled={!isValid || loading} loading={loading} className="w-full sm:w-auto order-1 sm:order-2">
            {loading ? "Menyimpan..." : "Lanjut ke Kuisioner →"}
          </Button>
        </div>
      </div>
    );
  }

  function Step3({ kunjunganId, initialAnswers, onBack, onComplete }) {
    const [answers, setAnswers] = useState({
      tau_paslon: initialAnswers?.tau_paslon || 0,
      tau_informasi: initialAnswers?.tau_informasi || 0,
      tau_visi_misi: initialAnswers?.tau_visi_misi || 0,
      tau_program_kerja: initialAnswers?.tau_program_kerja || 0,
      tau_rekam_jejak: initialAnswers?.tau_rekam_jejak || 0,
      pernah_dikunjungi: initialAnswers?.pernah_dikunjungi === 1 ? "ya" : initialAnswers?.pernah_dikunjungi === 0 ? "tidak" : null,
      percaya: initialAnswers?.percaya || 0,
      harapan: initialAnswers?.harapan || "",
      pertimbangan: initialAnswers?.pertimbangan || 0,
      ingin_memilih: initialAnswers?.ingin_memilih || 0
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const updateAnswer = (key, val) => setAnswers(prev => ({ ...prev, [key]: val }));

    const handleSubmit = async () => {
      const isComplete = Object.entries(answers).every(([key, val]) => {
  if (key === "harapan") {
    return typeof val === "string" && val.trim().length >= 5;
  }
  return val !== 0 && val !== null;
});

if (!isComplete) {
  setError("Mohon lengkapi semua jawaban kuisioner");
  return;
}

      setLoading(true);
      try {
        await api.post(`/kunjungan/${kunjunganId}/selesai`, { 
          ...answers,
          pernah_dikunjungi: answers.pernah_dikunjungi === "ya" ? 1 : 0
        });
        onComplete();
      } catch (err) {
        console.error(err);
        setError("Gagal menyimpan kuisioner");
      } finally {
        setLoading(false);
      }
    };

    const questions = [
      { key: "tau_paslon", label: "Saya mengenal pasangan Pramono Anung - Rano Karno yang maju dalam pemilihan gubernur ini." },
      { key: "tau_informasi", label: "Informasi mengenai pemilihan gubernur saat ini sudah saya pahami dengan cukup jelas." },
      { key: "tau_visi_misi", label: "Saya mengetahui visi dan misi pasangan calon Pramono Anung - Rano Karno yang maju dalam pemilihan gubernur." },
      { key: "tau_program_kerja", label: "Program kerja pasangan calon menjadi pertimbangan utama saya dalam menentukan pilihan." },
      { key: "tau_rekam_jejak", label: "Rekam jejak digital Pramono Anung - Rano Karno memengaruhi keputusan saya dalam memilih." },
      { key: "pernah_dikunjungi", label: "Pernah dikunjungi sebelumnya oleh relawan atau tim sukses?", type: "yesno" },
      { key: "percaya", label: "Saya percaya pasangan calon Pramono Anung - Rano Karno memiliki kemampuan untuk memimpin daerah dengan baik." },
      { key: "harapan", label: "Saya berharap pemimpin terpilih nanti dapat membawa perubahan yang lebih baik bagi daerah ini.", type: "text" },
      { key: "pertimbangan", label: "Saya bersedia mempertimbangkan atau memilih Pramono Anung - Rano Karno apabila programnya sesuai dengan kebutuhan daerah saya." },
      { key: "ingin_memilih", label: "Saya bersedia memilih pasangan Pramono Anung - Rano Karno pada pemilihan gubernur mendatang." },
    ];

    const likertOptions = [
      { value: 4, label: "Sangat Setuju", color: "bg-blue-100 text-blue-700 border-blue-200" },
      { value: 3, label: "Setuju", color: "bg-blue-100 text-blue-700 border-blue-200" },
      { value: 2, label: "Tidak Setuju", color: "bg-blue-100 text-blue-700 border-blue-200" },
      { value: 1, label: "Sangat Tidak Setuju", color: "bg-blue-100 text-blue-700 border-blue-200" },
    ];

    return (
      <div className="space-y-6 md:space-y-10">
        <div className="text-center">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Kuisioner Kunjungan</h2>
          <p className="text-sm text-gray-600">Terima kasih atas partisipasi Anda</p>
        </div>
        {error && <Alert type="error" message={error} />}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {questions.map((q, idx) => (
            <div key={q.key} className="bg-gray-50 p-4 md:p-5 rounded-2xl border border-gray-100 h-full">
              <p className="text-sm md:text-base font-semibold text-gray-800 mb-4">{idx + 1}. {q.label}</p>
              {q.type === "text" ? (
                <div>
                  <textarea
                    value={answers[q.key]}
                    onChange={(e) => updateAnswer(q.key, e.target.value)}
                    rows={4}
                    placeholder="Tuliskan harapan Anda secara singkat dan jelas..."
                    className="
                      w-full px-4 py-3 border border-gray-300 rounded-xl
                      focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      text-sm md:text-base resize-none
                    "
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Minimal 5 karakter. Jawaban bebas sesuai pendapat Anda.
                  </p>
                </div>
                ) : q.type === "yesno" ? (
                <div className="flex gap-3">
                  {["ya", "tidak"].map(o => (
                    <button key={o} type="button" onClick={() => updateAnswer(q.key, o)} className={`flex-1 sm:flex-none px-6 md:px-8 py-2 rounded-xl font-bold border-2 capitalize transition-all ${answers[q.key] === o ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                      {o}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {likertOptions.map(opt => (
                    <button key={opt.value} type="button" onClick={() => updateAnswer(q.key, opt.value)} className={`p-2 rounded-xl text-[10px] md:text-xs font-bold border-2 transition-all ${answers[q.key] === opt.value ? `${opt.color} border-current shadow-sm` : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
          <Button variant="outline" onClick={onBack} className="w-full sm:w-auto order-2 sm:order-1">← Kembali</Button>
          <Button onClick={handleSubmit} disabled={loading} loading={loading} className="w-full sm:w-auto order-1 sm:order-2">Update Selesai</Button>
        </div>
      </div>
    );
  }

  function EditComplete({ id, navigate }) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h3 className="text-3xl font-bold text-gray-800 mb-3">Update Berhasil!</h3>
        <p className="text-gray-600 mb-8">Data kunjungan telah diperbarui di sistem</p>
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => navigate("/kunjungan")}>Ke Daftar Kunjungan</Button>
          <Button onClick={() => navigate(`/kunjungan/${id}`)}>Lihat Detail</Button>
        </div>
      </div>
    );
  }

  /* UI Shared Components */
  function Alert({ type, message, loading }) {
    const styles = {
      error: "bg-red-50 border-red-200 text-red-700",
      success: "bg-green-50 border-green-200 text-green-700",
      info: "bg-blue-50 border-blue-200 text-blue-700"
    };
    return (
      <div className={`border rounded-xl p-4 ${styles[type]}`}>
        <div className="flex items-center gap-3">
          {loading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />}
          <span className="text-sm font-medium">{message}</span>
        </div>
      </div>
    );
  }

  function Input({ label, type = "text", value, onChange, required, maxLength, placeholder, disabled }) {
    return (
      <div>
        <label className="block text-sm font-semibold mb-2 text-slate-700">{label} {required && <span className="text-red-500">*</span>}</label>
        <input type={type} value={value} onChange={e => onChange?.(e.target.value)} disabled={disabled} maxLength={maxLength} placeholder={placeholder} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-white" />
      </div>
    );
  }

  function Select({ label, value, onChange, options, required }) {
    return (
      <div>
        <label className="block text-sm font-semibold mb-2 text-slate-700">{label} {required && <span className="text-red-500">*</span>}</label>
        <select value={value} onChange={e => onChange?.(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-white">
          <option value="">-- Pilih {label} --</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    );
  }

  function Button({ children, onClick, disabled, loading, variant = "primary" }) {
    const styles = { primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-md", outline: "border-2 border-gray-300 hover:bg-gray-50 text-gray-700" };
    return (
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`px-6 py-3 rounded-xl font-semibold transition ${styles[variant]} ${
          disabled || loading ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {loading && (
          <Icon icon="mdi:loading" className="inline-block animate-spin mr-2" />
        )}
        {children}
      </button>
    );
  }
