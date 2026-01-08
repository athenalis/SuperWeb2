import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../lib/axios";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import { validateKTP } from "../../lib/ktpValidator";

export default function EditKunjungan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showExitModal, setShowExitModal] = useState(false);
  const stepRef = useRef();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchInitialData = async () => {
    try {
      const res = await api.get(`/kunjungan/${id}`);
      if (res.data.success) {
        const kunjunganData = res.data.data;

        // Check if not rejected or pending - prevent edit
        if (kunjunganData.status_verifikasi !== 'rejected' && kunjunganData.status_verifikasi !== 'pending') {
          toast.error('Hanya kunjungan yang Pending atau Ditolak yang dapat diedit!', {
            duration: 4000,
            position: 'top-center',
          });
          navigate(`/kunjungan/${id}`, { replace: true });
          return;
        }

        setInitialData(kunjunganData);
      }
    } catch (err) {
      console.error("Failed to fetch kunjungan data", err);
      toast.error('Gagal memuat data kunjungan');
      navigate('/kunjungan');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmExit = async () => {
    // If the step component has a submitDraft method, call it
    if (stepRef.current && typeof stepRef.current.submitDraft === 'function') {
      try {
        await stepRef.current.submitDraft();
        setShowExitModal(false);
        navigate('/kunjungan');
      } catch (err) {
        console.error("Error saving draft on exit:", err);
        // Even if saving draft fails, we might want to exit? 
        // For now, let's just exit to be safe, or toast warning.
        setShowExitModal(false);
        navigate('/kunjungan');
      }
    } else {
      setShowExitModal(false);
      navigate('/kunjungan');
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
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 md:px-8 py-4 md:py-6 relative">
            <button
              onClick={() => setShowExitModal(true)}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <Icon icon="mdi:arrow-left" width="24" />
            </button>
            <div className="ml-8 md:ml-10">
              <h1 className="text-2xl md:text-3xl font-bold text-white">Edit Kunjungan</h1>
              <p className="text-blue-100 mt-1 text-sm md:text-base">Ubah data kunjungan melalui tahapan berikut</p>
            </div>
          </div>

          <div className="px-4 md:px-8 py-4 md:py-6 bg-gray-50 border-b">
            <Stepper step={step} isMobile={isMobile} />
          </div>

          <div className="p-4 md:p-8">
            {isMobile ? (
              // --- MOBILE FLOW (2 STEPS) ---
              <>
                {step === 1 && (
                  <StepMobileEdit
                    ref={stepRef}
                    initial={initialData}
                    kunjunganId={id}
                    onNext={() => { setStep(2); window.scrollTo(0, 0); }}
                  />
                )}
                {step === 2 && (
                  <Step3
                    kunjunganId={id}
                    initialAnswers={initialData.kepuasan || {}}
                    onBack={() => { setStep(1); window.scrollTo(0, 0); }}
                    onComplete={() => {
                      toast.success("Kuisioner selesai! Data berhasil diperbarui.");
                      navigate(`/kunjungan/${id}`);
                    }}
                  />
                )}
              </>
            ) : (
              // --- DESKTOP FLOW (3 STEPS) ---
              <>
                {step === 1 && (
                  <Step1
                    ref={stepRef}
                    initial={initialData}
                    onNext={() => { setStep(2); window.scrollTo(0, 0); }}
                  />
                )}
                {step === 2 && (
                  <Step2
                    kunjunganId={id}
                    initialMembers={initialData.family_form?.members || []}
                    onNext={() => { setStep(3); window.scrollTo(0, 0); }}
                    onBack={() => { setStep(1); window.scrollTo(0, 0); }}
                  />
                )}
                {step === 3 && (
                  <Step3
                    kunjunganId={id}
                    initialAnswers={initialData.kepuasan || {}}
                    onBack={() => { setStep(2); window.scrollTo(0, 0); }}
                    onComplete={() => {
                      if (window.innerWidth < 768) {
                        toast.success("✅ Kuisioner selesai! Data berhasil disimpan.");
                        navigate(`/kunjungan/${id}`);
                      } else {
                        setStep(4);
                        window.scrollTo(0, 0);
                      }
                    }}
                  />
                )}
              </>
            )}
            {step === 4 && <EditComplete id={id} navigate={navigate} />}
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon icon="mdi:alert-circle-outline" className="text-4xl text-amber-500" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Simpan Perubahan?</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                Anda sedang mengubah data. Ingin menyimpan progres sebagai draft sebelum keluar?
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleConfirmExit}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Icon icon="mdi:content-save" />
                  Ya, Simpan & Keluar
                </button>
                <button
                  onClick={() => navigate('/kunjungan')}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all active:scale-95"
                >
                  Keluar Tanpa Menyimpan
                </button>
                <button
                  onClick={() => setShowExitModal(false)}
                  className="w-full py-3 text-slate-400 text-sm font-semibold hover:text-slate-600 transition-colors"
                >
                  Lanjutkan Mengedit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({ step, isMobile }) {
  const steps = isMobile ? [
    { num: 1, label: "Data Keluarga", icon: "mdi:account-group" },
    { num: 2, label: "Kuisioner", icon: "mdi:clipboard-text" },
  ] : [
    { num: 1, label: "Info Dasar", icon: "mdi:account" },
    { num: 2, label: "Anggota", icon: "mdi:account-multiple" },
    { num: 3, label: "Kuisioner", icon: "mdi:clipboard-check" },
  ];

  return (
    <div className="relative max-w-2xl mx-auto px-4">
      {/* Progress Bar Background */}
      <div className="absolute top-5 left-8 right-8 h-1 bg-gray-100 rounded-full overflow-hidden z-0">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700 ease-out rounded-full"
          style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
        />
      </div>

      <div className="relative z-10 flex justify-between">
        {steps.map((s) => {
          const isActive = step === s.num;
          const isCompleted = step > s.num;

          return (
            <div key={s.num} className="flex flex-col items-center group cursor-default">
              <div
                className={`
                  w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center 
                  transition-all duration-300 transform
                  ${isActive
                    ? "bg-white border-2 border-blue-600 text-blue-600 shadow-lg shadow-blue-500/20 scale-110 ring-4 ring-blue-50"
                    : isCompleted
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none shadow-md scale-100"
                      : "bg-white border-2 border-slate-100 text-slate-300"
                  }
                `}
              >
                {isCompleted ? (
                  <Icon icon="mdi:check" className="text-lg md:text-xl" />
                ) : (
                  <Icon icon={s.icon} className="text-lg md:text-xl" />
                )}
              </div>

              <span
                className={`
                  mt-3 text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors duration-300
                  ${isActive ? "text-blue-700" : isCompleted ? "text-blue-600/70" : "text-slate-300"}
                `}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const compressImage = (file, maxWidth = 720, quality = 0.6) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          },
          "image/jpeg",
          quality
        );
      };
    };
  });
};

const getImageUrl = (path) => {
  if (!path) return "";
  const storageUrl = import.meta.env.VITE_STORAGE_URL;
  if (storageUrl) return `${storageUrl}/${path}`;
  return `${api.defaults.baseURL.replace('/api', '')}/storage/${path}`;
};

const StepMobileEdit = forwardRef(({ initial, kunjunganId, onNext }, ref) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pekerjaanList, setPekerjaanList] = useState([]);
  const [loadingGps, setLoadingGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("");

  useImperativeHandle(ref, () => ({
    submitDraft: async () => {
      try {
        const fd = new FormData();
        fd.append("nama", form.nama);
        fd.append("nik", form.nik);
        fd.append("tanggal", form.tanggal || "");
        fd.append("pendidikan", form.pendidikan || "");
        fd.append("pekerjaan", form.pekerjaan || "");
        fd.append("penghasilan", form.penghasilan || "");
        fd.append("alamat", form.alamat || "");
        fd.append("is_draft", "true");
        if (form.latitude) fd.append("latitude", form.latitude);
        if (form.longitude) fd.append("longitude", form.longitude);
        if (form.fotoKtp) {
          const compressedFoto = await compressImage(form.fotoKtp);
          fd.append("foto_ktp", compressedFoto);
        }

        await api.post(`/kunjungan/${kunjunganId}?_method=PUT`, fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        return true;
      } catch (err) {
        console.error("StepMobileEdit submitDraft error:", err);
        throw err;
      }
    }
  }));

  // --- STATE HEAD ---
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
  const [previewUrl, setPreviewUrl] = useState(getImageUrl(initial?.foto_ktp));

  // --- STATE MEMBERS ---
  const [members, setMembers] = useState(initial?.family_form?.members?.map(m => ({
    ...m,
    isLocal: false,
    previewUrl: getImageUrl(m.foto_ktp),
    tanggalLahir: m.tanggal_lahir
  })) || []);

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

  const reverseGeocode = async (lat, lon) => {
    try {
      setGpsStatus("Menerjemahkan alamat...");
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await res.json();
      if (data.display_name) {
        setForm(prev => ({ ...prev, alamat: data.display_name }));
      }
    } catch (err) { }
  };

  const getLocationAndAddress = () => {
    if (!navigator.geolocation) return;
    setLoadingGps(true);
    setGpsStatus("Mencari lokasi...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm(prev => ({ ...prev, latitude, longitude }));
        reverseGeocode(latitude, longitude);
        setLoadingGps(false);
        setGpsStatus("✓ Lokasi terbaca");
      },
      (err) => {
        setLoadingGps(false);
        setGpsStatus("Gagal (Izin ditolak/Timeout)");
        if (err.code === 1) alert("Mohon izinkan akses lokasi di browser Anda.");
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 0 }
    );
  };

  // --- HANDLERS HEAD ---
  const handleFotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran foto maksimal 5MB");
      return;
    }

    // OCR Check
    const toastId = toast.loading("Memindai KTP (OCR)...");
    const validation = await validateKTP(file);
    toast.dismiss(toastId);

    if (!validation.isValid) {
      toast.error(validation.message, { duration: 5000 });
      return;
    }

    setForm(prev => ({ ...prev, fotoKtp: file }));
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
  };

  // --- HANDLERS MEMBERS ---
  const addMember = () => {
    setMembers([...members, {
      id: Date.now(),
      isLocal: true,
      nama: "", nik: "", hubungan: "", tanggalLahir: "", pekerjaan: "", pendidikan: "", penghasilan: "",
      fotoKtp: null, previewUrl: ""
    }]);
    // Scroll to bottom
    setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 100);
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
    setMembers(prev => prev.map(m => m.id === id ? { ...m, [key]: value } : m));
  };

  const handleMemberFoto = async (id, file) => {
    if (!file) return;
    const toastId = toast.loading("Validasi KTP Anggota...");
    const res = await validateKTP(file);
    toast.dismiss(toastId);

    if (!res.isValid) {
      toast.error(res.message);
      return;
    }
    updateMember(id, "fotoKtp", file);
    updateMember(id, "previewUrl", URL.createObjectURL(file));
  };

  // --- SUBMIT ALL ---
  const handleSubmit = async () => {
    // Validation
    const isHeadValid = form.nama && /^\d{16}$/.test(form.nik) && form.tanggal &&
      form.pendidikan && form.pekerjaan && form.penghasilan && form.alamat && form.alamat.length >= 10;

    if (!isHeadValid) {
      setError("Mohon lengkapi data Kepala Keluarga (NIK harus 16 digit, Alamat min 10 char).");
      window.scrollTo(0, 0);
      return;
    }

    const isMembersValid = members.every(m => m.nama && /^\d{16}$/.test(m.nik) && m.hubungan && m.tanggalLahir && m.pendidikan && m.penghasilan && (m.fotoKtp || m.foto_ktp));
    if (!isMembersValid) {
      setError("Mohon lengkapi data semua Anggota Keluarga.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. UPDATE HEAD
      const fd = new FormData();
      fd.append("nama", form.nama);
      fd.append("nik", form.nik);
      fd.append("tanggal", form.tanggal);
      fd.append("pendidikan", form.pendidikan);
      fd.append("pekerjaan", form.pekerjaan);
      fd.append("penghasilan", form.penghasilan);
      fd.append("alamat", form.alamat);
      if (form.latitude) fd.append("latitude", form.latitude);
      if (form.longitude) fd.append("longitude", form.longitude);
      if (form.fotoKtp) {
        const compressedFoto = await compressImage(form.fotoKtp);
        fd.append("foto_ktp", compressedFoto);
      }
      await api.post(`/kunjungan/${kunjunganId}?_method=PUT`, fd, { headers: { "Content-Type": "multipart/form-data" } });

      // 2. UPDATE MEMBERS
      for (const m of members) {
        const fdM = new FormData();
        fdM.append("nama", m.nama);
        fdM.append("nik", m.nik);
        fdM.append("hubungan", m.hubungan);
        fdM.append("tanggal_lahir", m.tanggalLahir);
        fdM.append("pekerjaan", m.pekerjaan || "");
        fdM.append("pendidikan", m.pendidikan);
        fdM.append("penghasilan", m.penghasilan);
        if (m.fotoKtp instanceof File) {
          const compressedMemberFoto = await compressImage(m.fotoKtp);
          fdM.append("foto_ktp", compressedMemberFoto);
        }

        const config = { headers: { "Content-Type": "multipart/form-data" } };
        if (m.isLocal) {
          await api.post(`/kunjungan/${kunjunganId}/anggota`, fdM, config);
        } else {
          try {
            await api.post(`/kunjungan/anggota/${m.id}?_method=PUT`, fdM, config);
          } catch (e) {
            console.error(`Gagal update member ${m.id}`, e);
          }
        }
      }

      toast.success("Data Keluarga berhasil disimpan!");
      onNext();
    } catch (err) {
      console.error(err);
      if (err.response?.data?.errors) {
        const backendErrors = Object.values(err.response.data.errors).flat().join(", ");
        setError(`Gagal: ${backendErrors}`);
      } else {
        setError(err?.response?.data?.message || "Terjadi kesalahan saat menyimpan.");
      }
      window.scrollTo(0, 0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <Alert type="error" message={error} />}

      {/* --- SECTION KEPALA KELUARGA --- */}
      <div className="bg-white md:bg-transparent rounded-2xl shadow-sm border border-slate-100 p-4 md:p-0 space-y-4">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <Icon icon="mdi:account" width="20" />
          </div>
          <h3 className="font-bold text-slate-800">Informasi Kepala Keluarga</h3>
        </div>

        <div className="md:grid md:grid-cols-2 md:gap-6 space-y-4 md:space-y-0">
          <Input label="Nama Lengkap" value={form.nama} onChange={(v) => setForm({ ...form, nama: v })} required />
          <Input label="NIK (16 digit)" value={form.nik} onChange={(v) => /^\d{0,16}$/.test(v) && setForm({ ...form, nik: v })}
            maxLength={16} required placeholder="3201234567891234" />
          <Input type="date" label="Tanggal Lahir" value={form.tanggal} onChange={(v) => setForm({ ...form, tanggal: v })} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Pendidikan" value={form.pendidikan} onChange={(v) => setForm({ ...form, pendidikan: v })}
              options={["SD", "SMP", "SMA/SMK", "D3", "S1", "S2+"]} required />
            <Select label="Penghasilan" value={form.penghasilan} onChange={(v) => setForm({ ...form, penghasilan: v })}
              options={["< Rp500.000", "Rp500.000 - Rp1.500.000", "Rp1.500.000 - Rp3.000.000", "Rp3.000.000 - Rp5.000.000", "> Rp5.000.000"]} required />
          </div>
          <Select label="Pekerjaan" value={form.pekerjaan} onChange={(v) => setForm({ ...form, pekerjaan: v })}
            options={pekerjaanList} required />

          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-2">
              <label className="block font-semibold text-sm">Alamat Lengkap <span className="text-red-500">*</span></label>
              <button
                type="button"
                onClick={getLocationAndAddress}
                disabled={loadingGps}
                className="flex items-center gap-1 text-[10px] md:text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                {loadingGps ? <Icon icon="mdi:loading" className="animate-spin" /> : <Icon icon="mdi:crosshairs-gps" />}
                {loadingGps ? "Mencari..." : gpsStatus || "Update Lokasi"}
              </button>
            </div>
            <textarea
              value={form.alamat}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              rows={2}
              placeholder="Nama jalan, RT/RW, Dusun..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-semibold mb-2 text-sm">Foto KTP Kepala</label>
            <div
              onClick={() => document.getElementById("mobileEditFotoKtp").click()}
              className="border-2 border-dashed rounded-xl p-4 text-center border-gray-300 cursor-pointer bg-slate-50 hover:bg-slate-100"
            >
              {!previewUrl ? (
                <div className="flex flex-col items-center text-slate-400">
                  <Icon icon="mdi:camera" width="32" />
                  <span className="text-xs mt-1">Upload Foto KTP</span>
                </div>
              ) : (
                <div className="relative">
                  <img src={previewUrl} className="mx-auto h-32 object-contain rounded-lg" alt="Preview KTP" />
                  <div className="flex items-center justify-center gap-1 text-green-600 text-[10px] font-bold mt-1">
                    <Icon icon="mdi:check-circle" /> Foto Terpilih
                  </div>
                </div>
              )}
            </div>
            <input id="mobileEditFotoKtp" type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
          </div>
        </div>
      </div>

      {/* --- SECTION ANGGOTA KELUARGA --- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Icon icon="mdi:account-group" className="text-blue-600" />
            Anggota Keluarga ({members.length})
          </h3>
          <button
            onClick={addMember}
            className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 flex items-center gap-1 active:scale-95 transition"
          >
            <Icon icon="mdi:plus" /> Tambah
          </button>
        </div>

        {members.length === 0 && (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-500">
            <p className="text-sm">Belum ada anggota keluarga.</p>
            <p className="text-xs mt-1">Klik tombol <b>+ Tambah</b> untuk menambahkan.</p>
          </div>
        )}

        {members.map((member, idx) => (
          <div key={member.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 relative">
            <button
              onClick={() => removeMember(member.id, member.isLocal)}
              className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition"
            >
              <Icon icon="mdi:close" width="16" />
            </button>

            <h4 className="font-bold text-sm text-slate-800 mb-3 border-b pb-2 flex items-center gap-2">
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px]">#{idx + 1}</span>
              {member.nama || "Anggota Baru"}
            </h4>

            <div className="space-y-3">
              <Input label="Nama" value={member.nama} onChange={(v) => updateMember(member.id, "nama", v)} required placeholder="Nama Anggota" />
              <Input label="NIK" value={member.nik} onChange={(v) => updateMember(member.id, "nik", v)} required maxLength={16} placeholder="NIK Anggota" />

              <div className="grid grid-cols-2 gap-3">
                <Select label="Hubungan" value={member.hubungan} onChange={(v) => updateMember(member.id, "hubungan", v)}
                  options={["ayah", "ibu", "anak", "lainnya"]} required />
                <Input type="date" label="Tgl Lahir" value={member.tanggalLahir} onChange={(v) => updateMember(member.id, "tanggalLahir", v)} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select label="Pendidikan" value={member.pendidikan} onChange={(v) => updateMember(member.id, "pendidikan", v)}
                  options={["SD", "SMP", "SMA/SMK", "D3", "S1", "S2+"]} required />
                <Select label="Pekerjaan" value={member.pekerjaan} onChange={(v) => updateMember(member.id, "pekerjaan", v)}
                  options={pekerjaanList} required />
              </div>
              <Select label="Penghasilan" value={member.penghasilan} onChange={(v) => updateMember(member.id, "penghasilan", v)}
                options={["< Rp500.000", "Rp500.000 - Rp1.500.000", "Rp1.500.000 - Rp3.000.000", "Rp3.000.000 - Rp5.000.000", "> Rp5.000.000"]} required />

              {/* FOTO KTP MEMBER */}
              <div className="flex flex-col mt-3 border-t border-slate-100 pt-3">
                <label className="block font-semibold mb-2 text-sm text-slate-700">Foto KTP Anggota <span className="text-red-500">*</span></label>
                <div
                  onClick={() => document.getElementById(`mobile-mbr-${member.id}`).click()}
                  className="w-full border-2 border-dashed rounded-xl p-4 text-center border-blue-200 cursor-pointer bg-blue-50/30 hover:bg-blue-50 hover:border-blue-400 transition-all flex flex-col items-center justify-center min-h-[140px] group"
                >
                  {!member.previewUrl ? (
                    <div className="flex flex-col items-center gap-2 text-blue-600">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon icon="mdi:camera" className="text-xl" />
                      </div>
                      <span className="text-xs font-bold">Ambil Foto KTP</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <img src={member.previewUrl} className="mx-auto h-32 object-contain rounded-lg shadow-md" alt="Preview" />
                      <div className="absolute -bottom-2 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <Icon icon="mdi:check" width="12" /> Terisi
                      </div>
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => document.getElementById(`mobile-mbr-${member.id}`).click()} className="text-xs font-medium text-slate-500 hover:text-blue-600 hover:underline w-full text-center mt-2 transition-colors">
                  Atau upload dari galeri
                </button>
                <input
                  id={`mobile-mbr-${member.id}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleMemberFoto(member.id, e.target.files?.[0])}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- ACTION BUTTON --- */}
      <div className="pt-4 border-t border-slate-100">
        <Button onClick={handleSubmit} loading={loading} disabled={loading} className="w-full shadow-lg shadow-blue-500/30">
          {loading ? "Menyimpan..." : "Lanjut ke Kuisioner →"}
        </Button>
      </div>

    </div>
  );
});

const Step1 = forwardRef(({ initial, onNext }, ref) => {
  const navigate = useNavigate();
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

  useImperativeHandle(ref, () => ({
    submitDraft: async () => {
      try {
        const fd = new FormData();
        fd.append("nama", form.nama);
        fd.append("nik", form.nik);
        fd.append("tanggal", form.tanggal || "");
        fd.append("pendidikan", form.pendidikan || "");
        fd.append("pekerjaan", form.pekerjaan || "");
        fd.append("penghasilan", form.penghasilan || "");
        fd.append("alamat", form.alamat || "");
        fd.append("is_draft", "true");
        if (form.latitude) fd.append("latitude", form.latitude);
        if (form.longitude) fd.append("longitude", form.longitude);
        if (form.fotoKtp) {
          const compressedFoto = await compressImage(form.fotoKtp);
          fd.append("foto_ktp", compressedFoto);
        }

        await api.post(`/kunjungan/${initial.id}?_method=PUT`, fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        return true;
      } catch (err) {
        console.error("Step1 edit submitDraft error:", err);
        throw err;
      }
    }
  }));
  const [previewUrl, setPreviewUrl] = useState(getImageUrl(initial?.foto_ktp));
  const [loading, setLoading] = useState(false);
  const [loadingGps, setLoadingGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("");
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

  const reverseGeocode = async (lat, lon) => {
    try {
      setGpsStatus("Menerjemahkan alamat...");
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await res.json();
      if (data.display_name) {
        setForm(prev => ({ ...prev, alamat: data.display_name }));
      }
    } catch (err) {
      console.error("Geocoding error:", err);
    }
  };

  const getLocationAndAddress = () => {
    if (!navigator.geolocation) {
      setError("Browser tidak mendukung GPS");
      return;
    }
    setLoadingGps(true);
    setGpsStatus("Mencari lokasi...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm(prev => ({ ...prev, latitude, longitude }));
        reverseGeocode(latitude, longitude);
        setLoadingGps(false);
        setGpsStatus("✓ Lokasi diperbarui");
      },
      (err) => {
        console.error("GPS Error:", err);
        setLoadingGps(false);
        setGpsStatus("");
        if (err.code === 1) setError("Izin GPS ditolak. Mohon aktifkan izin lokasi.");
        else setError("Gagal mengambil lokasi. Pastikan GPS aktif.");
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 0 }
    );
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
    if (!isValid) {
      setError("Mohon lengkapi semua field yang wajib diisi");
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
      if (form.latitude) fd.append("latitude", form.latitude);
      if (form.longitude) fd.append("longitude", form.longitude);

      if (form.fotoKtp) {
        const compressedFoto = await compressImage(form.fotoKtp);
        fd.append("foto_ktp", compressedFoto);
      }

      await api.post(`/kunjungan/${initial.id}?_method=PUT`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      onNext();
    } catch (err) {
      console.error(err);
      if (err.response?.data?.errors) {
        const backendErrors = Object.values(err.response.data.errors).flat().join(", ");
        setError(`Validasi Gagal: ${backendErrors}`);
      } else {
        setError(err?.response?.data?.message || "Gagal memperbarui data");
      }
    } finally {
      setLoading(false);
    }
  };

  const isValid = form.nama && /^\d{16}$/.test(form.nik) && form.tanggal &&
    form.pendidikan && form.pekerjaan && form.penghasilan && form.alamat && form.alamat.length >= 10;

  return (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-gray-800">Informasi Kepala Keluarga</h2>

      {error && <Alert type="error" message={error} />}

      <div className="bg-white md:bg-transparent md:border-none md:shadow-none rounded-2xl shadow-sm border border-slate-100 p-4 md:p-0 space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Input label="Nama Lengkap" value={form.nama} onChange={(v) => setForm({ ...form, nama: v })} required />
          <Input label="NIK (16 digit)" value={form.nik} onChange={(v) => /^\d{0,16}$/.test(v) && setForm({ ...form, nik: v })}
            maxLength={16} required placeholder="3201234567891234" />
          <Input type="date" label="Tanggal Lahir" value={form.tanggal} onChange={(v) => setForm({ ...form, tanggal: v })} required />
          <Select label="Pendidikan" value={form.pendidikan} onChange={(v) => setForm({ ...form, pendidikan: v })}
            options={["SD", "SMP", "SMA/SMK", "D3", "S1", "S2+"]} required />
          <Select label="Pekerjaan" value={form.pekerjaan} onChange={(v) => setForm({ ...form, pekerjaan: v })}
            options={pekerjaanList} required />
          <Select label="Penghasilan" value={form.penghasilan} onChange={(v) => setForm({ ...form, penghasilan: v })}
            options={["< Rp500.000", "Rp500.000 - Rp1.500.000", "Rp1.500.000 - Rp3.000.000", "Rp3.000.000 - Rp5.000.000", "> Rp5.000.000"]} required />
        </div>
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

      {/* GPS Location Section - HIDDEN */}
      {/* 
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-2">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
          <div>
            <h3 className="font-semibold text-blue-900 flex items-center gap-1">
              <Icon icon="mdi:map-marker" />
              Lokasi GPS
            </h3>
            <p className="text-xs text-blue-700 mt-0.5">Refresh lokasi untuk memperbarui alamat otomatis</p>
            {gpsStatus && <p className="text-[10px] font-bold text-blue-600 mt-1 uppercase tracking-wider">{gpsStatus}</p>}
          </div>
          <button
            onClick={getLocationAndAddress}
            disabled={loadingGps}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loadingGps ? (
              <Icon icon="mdi:loading" className="animate-spin" />
            ) : (
              <Icon icon="mdi:refresh" />
            )}
            <span>Refresh Kode Lokasi</span>
          </button>
        </div>
      </div>
      */}

      <div className="space-y-1">
        <label className="block font-semibold">Alamat <span className="text-red-500">*</span></label>
        <textarea
          value={form.alamat}
          onChange={(e) => setForm({ ...form, alamat: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm md:text-base"
          rows={3}
          placeholder="Masukkan alamat lengkap..."
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
        <Button
          variant="outline"
          onClick={async () => {
            if (!isValid) {
              setError("Mohon lengkapi semua field yang wajib diisi");
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
              if (form.latitude) fd.append("latitude", form.latitude);
              if (form.longitude) fd.append("longitude", form.longitude);
              if (form.fotoKtp) {
                const compressedFoto = await compressImage(form.fotoKtp);
                fd.append("foto_ktp", compressedFoto);
              }
              await api.post(`/kunjungan/${initial.id}?_method=PUT`, fd, {
                headers: { "Content-Type": "multipart/form-data" }
              });
              toast.success("Data berhasil diperbarui!", {
                duration: 3000,
                position: 'top-center',
              });
              navigate(`/kunjungan/${initial.id}`);
            } catch (err) {
              console.error(err);
              if (err.response?.data?.errors) {
                const backendErrors = Object.values(err.response.data.errors).flat().join(", ");
                setError(`Validasi Gagal: ${backendErrors}`);
              } else {
                setError(err?.response?.data?.message || "Gagal memperbarui data");
              }
            } finally {
              setLoading(false);
            }
          }}
          disabled={!isValid || loading}
          className="w-full sm:w-auto order-2 sm:order-1"
        >
          💾 Simpan & Selesai
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          loading={loading}
          className="w-full sm:w-auto order-1 sm:order-2"
        >
          {loading ? "Menyimpan..." : "Lanjut ke Anggota Keluarga →"}
        </Button>
      </div>
    </div>
  );
});

function Step2({ kunjunganId, initialMembers, onNext, onBack }) {
  const navigate = useNavigate();
  const [members, setMembers] = useState(initialMembers.map(m => ({
    ...m,
    isLocal: false,
    previewUrl: getImageUrl(m.foto_ktp),
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
    setMembers(members.map(m => m.id === id ? { ...m, [key]: value } : m));
  };

  const handleSubmit = async () => {
    if (!kunjunganId || kunjunganId === "undefined") {
      setError("ID Kunjungan tidak valid");
      return;
    }
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
          } catch (err) {
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
        <Button variant="outline" onClick={onBack} className="w-full sm:w-auto order-3 sm:order-1">← Kembali</Button>
        <Button
          variant="outline"
          onClick={async () => {
            if (!members.every(m => m.nama && /^\d{16}$/.test(m.nik) && m.hubungan && m.tanggalLahir && m.pendidikan && m.penghasilan)) {
              setError("Mohon lengkapi semua data anggota");
              return;
            }
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
                  } catch (err) {
                    console.error(`Gagal update anggota ${m.id}`, err);
                  }
                }
              }
              toast.success("✅ Data anggota berhasil diperbarui!", {
                duration: 3000,
                position: 'top-center',
              });
              navigate(`/kunjungan/${kunjunganId}`);
            } catch (err) {
              console.error(err);
              setError(err?.response?.data?.message || "Gagal menyimpan data anggota");
            } finally {
              setLoading(false);
            }
          }}
          disabled={!isValid || loading}
          className="w-full sm:w-auto order-2 sm:order-2"
        >
          💾 Simpan & Selesai
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || loading} loading={loading} className="w-full sm:w-auto order-1 sm:order-3">
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

    if (!kunjunganId || kunjunganId === "undefined") {
      setLoading(false);
      setError("ID Kunjungan tidak valid");
      return;
    }

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
      className={`px-6 py-3 rounded-xl font-semibold transition ${styles[variant]} ${disabled || loading ? "opacity-50 cursor-not-allowed" : ""
        }`}
    >
      {loading && (
        <Icon icon="mdi:loading" className="inline-block animate-spin mr-2" />
      )}
      {children}
    </button>
  );
}
