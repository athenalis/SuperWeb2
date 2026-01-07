import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../lib/axios";
import { Icon } from "@iconify/react";

const maxDate17 = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 17);
  return d.toISOString().split("T")[0];
};

export default function CreateKunjungan() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [kunjunganId, setKunjunganId] = useState(null);
  const [address, setAddress] = useState("");


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-4 md:py-8 px-2 md:px-4">
      <div className="max-w-8xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 md:px-8 py-4 md:py-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">Form Kunjungan Keluarga</h1>
            <p className="text-blue-100 mt-1 md:mt-2 text-sm md:text-base">Lengkapi data kunjungan secara bertahap</p>
          </div>

          <div className="px-5 md:px-8 py-4 md:py-6 bg-gray-50 border-b">
            <Stepper step={step} />
          </div>

          <div className="p-5 md:p-8">
            {step === 1 && <Step1 onNext={(id, addr) => { setKunjunganId(id); setAddress(addr); setStep(2); }} />}
            {step === 2 && <Step2 kunjunganId={kunjunganId} address={address} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
            {step === 3 && <Step3 kunjunganId={kunjunganId} onBack={() => setStep(2)} onComplete={() => {
              if (window.innerWidth < 1024) {
                toast.success("✅ Kunjungan berhasil dibuat!");
                navigate(`/kunjungan`);
              } else {
                setStep(4);
              }
            }} />}
            {step === 4 && <StepComplete />}
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

const compressImage = (file, maxWidth = 800, quality = 0.6) => {
  return new Promise((resolve) => {
    // If file is small enough, skip compression
    if (file.size < 500 * 1024) { // < 500KB - skip compression
      resolve(file);
      return;
    }

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

function Step1({ onNext }) {
  const [form, setForm] = useState({
    nama: "", nik: "", tanggal: "", pendidikan: "", pekerjaan: "", penghasilan: "",
    fotoKtp: null, alamat: "", latitude: "", longitude: ""
  });
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGps, setLoadingGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("");
  const [error, setError] = useState("");
  const [pekerjaanList, setPekerjaanList] = useState([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  useEffect(() => {
    // Load persisted data
    const saved = localStorage.getItem("kunjungan_draft_step1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setForm(prev => ({ ...prev, ...parsed }));
        // Jika sudah ada alamat dari draft, tidak perlu ambil GPS lagi
        if (parsed.alamat && parsed.alamat.length > 10) {
          fetchPekerjaan();
          return;
        }
      } catch (e) {
        console.error("Failed to parse draft step 1");
      }
    }

    fetchPekerjaan();

    // Auto fetch GPS dinyalakan kembali
    // getLocationAndAddress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save to localstorage on change
  useEffect(() => {
    // Avoid saving empty init state if verified
    if (form.nama || form.nik) {
      localStorage.setItem("kunjungan_draft_step1", JSON.stringify(form));
    }
  }, [form]);

  const fetchPekerjaan = async () => {
    // Fallback data jika API gagal
    const fallbackPekerjaan = [
      "Belum / Tidak Bekerja",
      "Pelajar / Mahasiswa",
      "PNS / ASN",
      "TNI / POLRI",
      "Karyawan Swasta",
      "Wiraswasta",
      "Petani / Nelayan",
      "Buruh",
      "Pedagang",
      "Ibu Rumah Tangga",
      "Pensiunan",
      "Lainnya"
    ];

    try {
      const res = await api.get("/wilayah/pekerjaan");
      if (res.data && res.data.length > 0) {
        setPekerjaanList(res.data.map(item => item.nama));
      } else {
        setPekerjaanList(fallbackPekerjaan);
      }
    } catch (err) {
      console.error("Failed to fetch pekerjaan, using fallback", err);
      setPekerjaanList(fallbackPekerjaan);
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
        setGpsStatus("✓ Lokasi terbaca");
      },
      (err) => {
        console.error("GPS Error:", err);
        setLoadingGps(false);
        setGpsStatus("");
        if (err.code === 1) {
          setShowPermissionModal(true);
          setGpsStatus("");
          setError(""); // Ensure red alert is gone
        } else {
          setError("Gagal mengambil lokasi. Pastikan GPS aktif.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleRefreshGps = () => {
    setError("");
    setShowPermissionModal(false);
    getLocationAndAddress();
  };

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi ukuran file (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran foto maksimal 5MB");
      return;
    }

    // Validasi tipe file
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setError("Format foto harus JPG, JPEG, atau PNG");
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

    setError("");
    setLoading(true);

    const compressedFoto = await compressImage(form.fotoKtp);

    try {
      const fd = new FormData();
      fd.append("nama", form.nama);
      fd.append("nik", form.nik);
      fd.append("tanggal", form.tanggal);
      fd.append("pendidikan", form.pendidikan);
      fd.append("pekerjaan", form.pekerjaan);
      fd.append("penghasilan", form.penghasilan);
      fd.append("foto_ktp", compressedFoto);
      fd.append("alamat", form.alamat);
      if (form.latitude) fd.append("latitude", form.latitude);
      if (form.longitude) fd.append("longitude", form.longitude);

      // Gunakan api helper (otomatis handle token via interceptor)
      const res = await api.post("/kunjungan", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (!res.data.success) {
        throw new Error(res.data.message || "Gagal menyimpan kunjungan");
      }

      // Success - proceed to next step
      localStorage.removeItem("kunjungan_draft_step1");

      if (!res.data.data?.id) {
        throw new Error("Gagal mendapatkan ID Kunjungan dari server");
      }
      onNext(res.data.data.id, form.alamat);

    } catch (err) {
      console.error("Step1 submit error:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);

      if (err.response?.data?.errors) {
        const backendErrors = Object.values(err.response.data.errors).flat().join(", ");
        setError(`Validasi Gagal: ${backendErrors}`);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError(err.message || "Terjadi kesalahan saat menyimpan data");
      }
    } finally {
      setLoading(false);
    }
  };

  const getValidationError = () => {
    if (!form.nama) return "Nama Lengkap belum diisi";
    if (!form.nik) return "NIK belum diisi";
    if (!/^\d{16}$/.test(form.nik)) return "NIK harus berjumlah 16 digit angka";
    if (!form.tanggal) return "Tanggal Lahir belum diisi";
    if (!form.pendidikan) return "Pendidikan belum dipilih";
    if (!form.pekerjaan) return "Pekerjaan belum dipilih";
    if (!form.penghasilan) return "Penghasilan belum dipilih";
    if (!form.fotoKtp) return "Foto KTP wajib diupload";
    if (!form.alamat || form.alamat.length < 10) return "Alamat minimal 10 karakter";
    return null;
  };

  const isValid = !getValidationError();

  return (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-gray-800">Informasi Kepala Keluarga</h2>

      {error && <Alert type="error" message={error} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Input label="Nama Lengkap" value={form.nama} onChange={(v) => setForm({ ...form, nama: v })} required />
        <Input label="NIK (16 digit)" value={form.nik} onChange={(v) => /^\d{0,16}$/.test(v) && setForm({ ...form, nik: v })}
          maxLength={16} placeholder="3201234567891234" required />
        <Input
          type="date"
          label="Tanggal Lahir"
          value={form.tanggal}
          max={maxDate17()}
          onChange={(v) => setForm({ ...form, tanggal: v })}
          required
        />
        <Select label="Pendidikan" value={form.pendidikan} onChange={(v) => setForm({ ...form, pendidikan: v })}
          options={["SD", "SMP", "SMA/SMK", "D3", "S1", "S2+"]} required />
        <Select label="Pekerjaan" value={form.pekerjaan} onChange={(v) => setForm({ ...form, pekerjaan: v })}
          options={pekerjaanList} required />
        <Select label="Penghasilan" value={form.penghasilan} onChange={(v) => setForm({ ...form, penghasilan: v })}
          options={["< Rp500.000", "Rp500.000 - Rp1.500.000", "Rp1.500.000 - Rp3.000.000", "Rp3.000.000 - Rp5.000.000", "> Rp5.000.000"]} required />
      </div>

      <div>
        <label className="block font-semibold mb-2 text-sm md:text-base">Foto KTP <span className="text-red-500">*</span></label>
        <div
          onClick={() => document.getElementById("fotoKtp").click()}
          className="border-2 border-dashed rounded-xl p-4 md:p-8 text-center transition border-gray-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50"
        >
          {!previewUrl ? (
            <div className="space-y-1 md:space-y-2 flex flex-col items-center justify-center text-center">
              <Icon icon="mdi:camera" className="text-4xl md:text-5xl text-gray-500" />
              <p className="text-gray-600 font-medium text-sm md:text-base">Klik untuk ambil/upload foto KTP</p>
              <p className="text-xs text-gray-400">Format JPG/PNG (max 5MB)</p>
            </div>
          ) : (
            <div className="space-y-3">
              <img src={previewUrl} className="mx-auto max-h-48 md:max-h-64 rounded-lg shadow-lg" alt="Preview KTP" />
              <div className="text-green-600 font-medium text-sm flex items-center gap-1">
                <Icon icon="mdi:check" />
                Foto KTP berhasil dipilih
              </div>
            </div>
          )}
        </div>
        <input
          id="fotoKtp"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFotoChange}
        />
      </div>

      {/* GPS section dihide - latitude/longitude tetap bisa dikirim jika ada */}
      <input type="hidden" value={form.latitude || ""} />
      <input type="hidden" value={form.longitude || ""} />

      <div>
        <label className="block font-semibold mb-2 text-sm md:text-base">
          Alamat Lengkap <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.alamat}
          onChange={(e) => setForm({ ...form, alamat: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm md:text-base"
          rows={3}
          placeholder="Masukkan alamat lengkap..."
        />
      </div>

      <div className="pt-2">
        {!isValid && (
          <p className="text-xs text-red-500 text-right mb-2 font-medium italic">
            * {getValidationError()}
          </p>
        )}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="w-full md:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? "Menyimpan..." : "Lanjut ke Anggota Keluarga →"}
          </button>
        </div>
      </div>
      {showPermissionModal && <PermissionModal onRetry={handleRefreshGps} loading={loadingGps} />}
    </div>
  );
}

function Step2({ kunjunganId, onNext, onBack }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pekerjaanList, setPekerjaanList] = useState([]);

  useEffect(() => {
    fetchPekerjaan();
  }, []);

  const fetchPekerjaan = async () => {
    // Fallback data jika API gagal
    const fallbackPekerjaan = [
      "Belum / Tidak Bekerja",
      "Pelajar / Mahasiswa",
      "PNS / ASN",
      "TNI / POLRI",
      "Karyawan Swasta",
      "Wiraswasta",
      "Petani / Nelayan",
      "Buruh",
      "Pedagang",
      "Ibu Rumah Tangga",
      "Pensiunan",
      "Lainnya"
    ];

    try {
      const res = await api.get("/wilayah/pekerjaan");
      if (res.data && res.data.length > 0) {
        const p = res.data.map(item => item.nama);
        setPekerjaanList(p);
      } else {
        setPekerjaanList(fallbackPekerjaan);
      }
    } catch (err) {
      console.error("Failed to fetch pekerjaan, using fallback", err);
      setPekerjaanList(fallbackPekerjaan);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("kunjungan_draft_members");
    if (saved) {
      try {
        setMembers(JSON.parse(saved));
      } catch (e) { }
    }
  }, []);

  useEffect(() => {
    if (members.length > 0) {
      localStorage.setItem("kunjungan_draft_members", JSON.stringify(members));
    }
  }, [members]);

  const addMember = () => {
    setMembers([...members, {
      id: Date.now(),
      nama: "",
      nik: "",
      hubungan: "",
      tanggalLahir: "",
      pekerjaan: "",
      pendidikan: "",
      penghasilan: "",
      fotoKtp: null,
      previewUrl: ""
    }]);
  };

  const removeMember = (id) => {
    setMembers(members.filter(m => m.id !== id));
  };

  const updateMember = (id, key, value) => {
    setMembers(members.map(m => m.id === id ? { ...m, [key]: value } : m));
  };

  const handleSubmit = async () => {
    if (!kunjunganId) {
      setError("ID Kunjungan tidak ditemukan. Silakan kembali ke tahap sebelumnya.");
      return;
    }

    setError("");
    setLoading(true);

    if (members.length === 0) {
      setError("");
      setLoading(false);
      onNext();
      return;
    }

    const invalidMembers = members.filter(m => {
      // Validasi field wajib termasuk NIK
      if (!m.nama || !m.nik || !m.hubungan || !m.tanggalLahir || !m.pendidikan || !m.penghasilan) return true;
      // Validasi NIK harus 16 digit
      if (!/^\d{16}$/.test(m.nik)) return true;
      return false;
    });

    if (invalidMembers.length > 0) {
      const missingFields = [];
      const m = invalidMembers[0];
      if (!m.nama) missingFields.push("Nama");
      if (!m.nik) missingFields.push("NIK");
      if (m.nik && !/^\d{16}$/.test(m.nik)) missingFields.push("NIK harus 16 digit");
      if (!m.hubungan) missingFields.push("Hubungan");
      if (!m.tanggalLahir) missingFields.push("Tanggal Lahir");
      if (!m.pendidikan) missingFields.push("Pendidikan");
      if (!m.penghasilan) missingFields.push("Penghasilan");

      setError(`Mohon lengkapi data anggota: ${missingFields.join(", ")}`);
      setLoading(false);
      return;
    }

    setError("");
    setLoading(true);

    try {
      for (const member of members) {
        const fd = new FormData();
        fd.append("nama", member.nama);
        fd.append("nik", member.nik);
        fd.append("hubungan", member.hubungan);
        fd.append("tanggal_lahir", member.tanggalLahir);
        fd.append("pekerjaan", member.pekerjaan || "");
        fd.append("pendidikan", member.pendidikan);
        fd.append("penghasilan", member.penghasilan);
        if (member.fotoKtp instanceof File) {
          const compressedFoto = await compressImage(member.fotoKtp);
          fd.append("foto_ktp", compressedFoto);
        }

        const res = await api.post(`/kunjungan/${kunjunganId}/anggota`, fd);

        if (!res.data.success) {
          throw new Error(res.data.message || "Gagal menyimpan anggota");
        }
      }

      localStorage.removeItem("kunjungan_draft_members");
      onNext();
    } catch (err) {
      console.error("Step2 submit error:", err);
      const backendErrors = err?.response?.data?.errors;
      if (backendErrors) {
        const firstErrorKey = Object.keys(backendErrors)[0];
        const firstErrorMessage = backendErrors[firstErrorKey][0];
        setError(`Error: ${firstErrorMessage}`);
      } else {
        setError(err?.response?.data?.message || err.message || "Terjadi kesalahan saat menyimpan data anggota");
      }
    } finally {
      setLoading(false);
    }
  };

  const isValid = members.length === 0 || members.every(m => {
    // Field wajib termasuk NIK
    if (!m.nama || !m.nik || !m.hubungan || !m.tanggalLahir || !m.pendidikan || !m.penghasilan) return false;
    // NIK harus 16 digit
    if (!/^\d{16}$/.test(m.nik)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Data Anggota Keluarga</h2>
        <button onClick={addMember} className="w-full sm:w-auto px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-sm">
          + Tambah Anggota
        </button>
      </div>

      {error && <Alert type="error" message={error} />}

      {members.length === 0 && (
        <div className="text-center py-10 md:py-14 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 flex flex-col items-center justify-center">
          <Icon icon="mdi:account-group" className="text-5xl md:text-6xl text-gray-300 mb-4" />
          <p className="text-gray-600 font-medium">Belum ada anggota keluarga</p>
          <p className="text-xs text-gray-400 mt-2">Klik tombol di atas untuk menambahkan anggota Baru</p>
        </div>
      )}

      {members.map((member, idx) => (
        <div key={member.id} className="border border-gray-200 rounded-2xl p-4 md:p-6 bg-white relative shadow-sm">
          <button
            onClick={() => removeMember(member.id)}
            className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
          >
            <Icon icon="mdi:close" width="20" />
          </button>

          <h4 className="font-bold mb-5 text-lg text-blue-900 border-b pb-2">Anggota #{idx + 1}</h4>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Input label="Nama Lengkap" value={member.nama} onChange={(v) => updateMember(member.id, "nama", v)} required />
              <Input
                label="NIK"
                value={member.nik}
                onChange={(v) => /^\d{0,16}$/.test(v) && updateMember(member.id, "nik", v)}
                required
                maxLength={16}
                placeholder="16 digit NIK"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Hubungan" value={member.hubungan} onChange={(v) => updateMember(member.id, "hubungan", v)}
                  options={["ayah", "ibu", "anak", "lainnya"]} required />
                <Input
                  type="date"
                  label="Tanggal Lahir"
                  value={member.tanggalLahir}
                  max={maxDate17()}
                  onChange={(v) => updateMember(member.id, "tanggalLahir", v)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Pendidikan" value={member.pendidikan} onChange={(v) => updateMember(member.id, "pendidikan", v)}
                  options={["SD", "SMP", "SMA/SMK", "D3", "S1", "S2+"]} required />
                <Select label="Pekerjaan" value={member.pekerjaan} onChange={(v) => updateMember(member.id, "pekerjaan", v)}
                  options={pekerjaanList} />
              </div>

              <Select label="Penghasilan" value={member.penghasilan} onChange={(v) => updateMember(member.id, "penghasilan", v)}
                options={["< Rp500.000", "Rp500.000 - Rp1.500.000", "Rp1.500.000 - Rp3.000.000", "Rp3.000.000 - Rp5.000.000", "> Rp5.000.000"]} required />
            </div>

            <div className="flex flex-col">
              <label className="block font-semibold mb-2 text-sm md:text-base">Foto KTP <span className="text-gray-400 text-xs md:text-sm font-normal">(Opsional)</span></label>
              <div
                onClick={() => document.getElementById(`foto-member-${member.id}`).click()}
                className="flex-1 border-2 border-dashed rounded-2xl p-4 text-center transition border-gray-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50 flex flex-col items-center justify-center min-h-[180px] md:min-h-[200px]"
              >
                {!member.previewUrl ? (
                  <div className="space-y-1 md:space-y-2 flex flex-col items-center justify-center text-center">
                    <Icon icon="mdi:camera" className="text-4xl md:text-5xl text-gray-500" />
                    <p className="text-xs text-gray-600 font-medium">Klik untuk upload foto</p>
                  </div>
                ) : (
                  <img src={member.previewUrl} className="max-h-40 rounded-lg shadow-md" alt="Preview" />
                )}
              </div>
              <input
                id={`foto-member-${member.id}`}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    updateMember(member.id, "fotoKtp", file);
                    updateMember(member.id, "previewUrl", URL.createObjectURL(file));
                  }
                }}
              />
            </div>
          </div>
        </div>
      ))}

      <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
        <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
          ← Kembali
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          loading={loading}
          className="w-full sm:w-auto"
        >
          {loading ? "Menyimpan..." : members.length === 0 ? "Lanjut ke Kuisioner (Skip) →" : "Lanjut ke Kuisioner →"}
        </Button>

      </div>
    </div>
  );
}

function Step3({ kunjunganId, onBack, onComplete }) {
  const [answers, setAnswers] = useState({
    tau_paslon: 0,
    tau_informasi: 0,
    tau_visi_misi: 0,
    tau_program_kerja: 0,
    tau_rekam_jejak: 0,
    pernah_dikunjungi: null,
    percaya: 0,
    harapan: "",
    pertimbangan: 0,
    ingin_memilih: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateAnswer = (key, val) => {
    setAnswers(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async () => {
    // Validasi setiap jawaban
    const missingAnswers = [];

    if (answers.tau_paslon === 0) missingAnswers.push("Mengenal pasangan calon");
    if (answers.tau_informasi === 0) missingAnswers.push("Informasi pemilihan");
    if (answers.tau_visi_misi === 0) missingAnswers.push("Visi dan misi");
    if (answers.tau_program_kerja === 0) missingAnswers.push("Program kerja");
    if (answers.tau_rekam_jejak === 0) missingAnswers.push("Rekam jejak");
    if (answers.pernah_dikunjungi === null) missingAnswers.push("Pernah dikunjungi");
    if (answers.percaya === 0) missingAnswers.push("Kepercayaan");
    if (!answers.harapan || answers.harapan.trim().length < 3) missingAnswers.push(`Harapan (minimal 3 karakter, sekarang: ${answers.harapan?.trim().length || 0})`);
    if (answers.pertimbangan === 0) missingAnswers.push("Pertimbangan");
    if (answers.ingin_memilih === 0) missingAnswers.push("Kesediaan memilih");

    if (missingAnswers.length > 0) {
      setError(`Mohon lengkapi jawaban: ${missingAnswers.join(", ")}`);
      return;
    }

    if (!kunjunganId) {
      setError("ID Kunjungan tidak ditemukan. Mohon ulangi proses dari awal.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await api.post(`/kunjungan/${kunjunganId}/selesai`, {
        ...answers,
        pernah_dikunjungi: answers.pernah_dikunjungi === "ya" ? 1 : 0
      });

      if (!res.data.success) {
        throw new Error(res.data.message || "Gagal menyelesaikan kunjungan");
      }

      onComplete();
    } catch (err) {
      console.error("Step3 submit error:", err);
      setError(err?.response?.data?.message || err.message || "Terjadi kesalahan saat menyelesaikan kunjungan");
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
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">Kuisioner Kunjungan</h2>
        <p className="text-sm text-gray-600">Lengkapi data kuisioner akhir kunjungan</p>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Questionnaire */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {questions.map((q, idx) => (
            <div
              key={q.key}
              className="bg-gray-50 p-4 md:p-5 rounded-2xl border border-gray-100 h-full"
            >
              <p className="font-semibold text-gray-800 text-sm md:text-base mb-3 md:mb-4">
                {idx + 1}. {q.label}
              </p>

              {q.type === "text" ? (
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
              ) : q.type === "yesno" ? (
                <div className="flex gap-3 md:gap-4">
                  {["ya", "tidak"].map(opt => (
                    <button
                      key={opt}
                      onClick={() => updateAnswer(q.key, opt)}
                      className={`
                  flex-1 px-6 py-2 md:py-2.5 rounded-xl font-bold border-2 capitalize transition-all
                  ${answers[q.key] === opt
                          ? "bg-blue-600 border-blue-600 text-white shadow-md"
                          : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"}
                `}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {likertOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateAnswer(q.key, opt.value)}
                      className={`
                  p-2 md:p-2.5 rounded-xl text-[10px] md:text-xs font-bold border-2 transition-all
                  ${answers[q.key] === opt.value
                          ? `${opt.color} border-current shadow-sm`
                          : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"}
                `}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col sm:flex-row justify-between gap-3 md:gap-4 pt-4">
        <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">← Kembali</Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          loading={loading}
          className="w-full sm:px-10"
        >
          {loading ? "Menyelesaikan..." : "Selesaikan Kunjungan"}
        </Button>
      </div>
    </div>
  );
}

function StepComplete() {
  return (
    <div className="text-center py-12">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
        <Icon icon="mdi:check-circle" className="text-green-600" width="64" height="64" />
      </div>
      <h3 className="text-3xl font-bold text-gray-800 mb-3">Kunjungan Berhasil!</h3>
      <p className="text-gray-600 mb-8">Data kunjungan keluarga telah tersimpan dengan baik</p>
      <Button onClick={() => window.location.reload()}>Buat Kunjungan Baru</Button>
    </div>
  );
}

function Input({ label, type = "text", value, onChange, required, readOnly, maxLength, placeholder, disabled, max, min }) {
  return (
    <div>
      <label className="block font-semibold mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
        max={max}
        min={min}
        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${readOnly || disabled ? 'bg-gray-50 cursor-not-allowed' : ''
          }`}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, required }) {
  return (
    <div>
      <label className="block font-semibold mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
      >
        <option value="">-- Pilih {label} --</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function Button({ children, onClick, disabled = false, loading = false, variant = "primary" }) {
  const styles = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    outline: "border-2 border-gray-300 hover:bg-gray-50 text-gray-700"
  };

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


function PermissionModal({ onRetry, loading }) {
  return (
    <div className="fixed inset-0 z-[50] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform scale-100 transition-all">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-blue-50/50">
            <Icon icon="mdi:map-marker-radius" width="32" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Izin Lokasi Diperlukan</h3>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Aplikasi ini membutuhkan akses lokasi untuk memverifikasi data kunjungan.
            <br /><span className="font-semibold text-blue-600">Mohon aktifkan izin lokasi di browser Anda.</span>
          </p>
          <div className="space-y-3">
            <button
              onClick={onRetry}
              disabled={loading}
              className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-wait' : ''}`}
            >
              {loading ? (
                <>
                  <Icon icon="mdi:loading" className="animate-spin" width="20" />
                  Mencari...
                </>
              ) : (
                <>
                  <Icon icon="mdi:check-circle" width="20" />
                  Izinkan Akses Lokasi
                </>
              )}
            </button>
            <div className="pt-4 mt-2 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => window.location.reload()}
                className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors py-2 px-3 rounded-lg hover:bg-slate-50"
              >
                Muat Ulang Halaman
              </button>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="h-px bg-slate-100 flex-1"></div>
                <span>ATAU</span>
                <div className="h-px bg-slate-100 flex-1"></div>
              </div>
              <button
                onClick={() => window.location.href = '/kunjungan'}
                className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors py-2 px-3 rounded-lg hover:bg-red-50"
              >
                Kembali ke Data Kunjungan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function Alert({ type, message, loading = false }) {
  const styles = {
    error: "bg-red-50 border-red-200 text-red-700",
    success: "bg-green-50 border-green-200 text-green-700",
    info: "bg-blue-50 border-blue-200 text-blue-700"
  };

  return (
    <div className={`border rounded-xl p-4 ${styles[type]}`}>
      <div className="flex items-center gap-3">
        {loading && (
          <Icon icon="mdi:loading" className="animate-spin" />
        )}
        <span>{message}</span>
      </div>
    </div>
  );
}
