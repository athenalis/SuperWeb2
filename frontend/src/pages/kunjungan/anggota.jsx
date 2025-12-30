import { useState, useEffect } from "react";
import api from "../../lib/axios";
import { Icon } from "@iconify/react";

const maxDate17 = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 17);
  return d.toISOString().split("T")[0];
};

export default function CreateKunjungan() {
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
            {step === 3 && <Step3 kunjunganId={kunjunganId} onBack={() => setStep(2)} onComplete={() => setStep(4)} />}
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

function Step1({ onNext }) {
  const [form, setForm] = useState({
    nama: "", nik: "", tanggal: "", pendidikan: "", pekerjaan: "", penghasilan: "",
    fotoKtp: null, alamat: "", latitude: "", longitude: ""
  });
  const [loading, setLoading] = useState(false);
  const [loadingGps, setLoadingGps] = useState(false);
  const [error, setError] = useState("");
  const [gpsStatus, setGpsStatus] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [pekerjaanList, setPekerjaanList] = useState([]);

  useEffect(() => {
    getLocationAndAddress();
    fetchPekerjaan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPekerjaan = async () => {
    try {
      const res = await api.get("/wilayah/pekerjaan");
      // Map pekerjaan data to just strings if they are objects, or adjust Select component
      // Assuming response is array of objects {id, nama}
      const p = res.data.map(item => item.nama);
      setPekerjaanList(p);
    } catch (err) {
      console.error("Failed to fetch pekerjaan", err);
    }
  };

  const getLocationAndAddress = () => {
    if (!navigator.geolocation) {
      setGpsStatus("failed");
      setError("Browser tidak mendukung GPS");
      return;
    }

    setLoadingGps(true);
    setGpsStatus("loading");
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lon = position.coords.longitude.toFixed(6);

        setForm(prev => ({ ...prev, latitude: lat, longitude: lon }));

        try {
          const address = await reverseGeocode(lat, lon);
          if (address) {
            setForm(prev => ({ ...prev, alamat: address }));
            setGpsStatus("success");
          } else {
            setGpsStatus("failed");
            setError("Gagal mendapatkan alamat dari GPS. Silakan isi manual.");
          }
        } catch {
          setGpsStatus("failed");
          setError("Gagal mendapatkan alamat dari GPS. Silakan isi manual.");
        } finally {
          setLoadingGps(false);
        }
      },
      (error) => {
        setLoadingGps(false);
        setGpsStatus("failed");
        let errorMsg = "GPS Error: ";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg += "Izin akses lokasi ditolak. Aktifkan GPS dan berikan izin.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg += "Lokasi tidak tersedia. Pastikan GPS aktif.";
            break;
          case error.TIMEOUT:
            errorMsg += "Waktu tunggu habis. Coba lagi.";
            break;
          default:
            errorMsg += error.message;
        }
        setError(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const reverseGeocode = async (lat, lon) => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18&addressdetails=1`;

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'KunjunganApp/1.0' }
      });

      if (!response.ok) {
        throw new Error('Reverse geocode failed');
      }

      const data = await response.json();
      return data?.display_name || null;
    } catch (error) {
      console.error('Reverse geocode error:', error);
      return null;
    }
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

  const handleRefreshGps = () => {
    setError("");
    getLocationAndAddress();
  };

  const handleSubmit = async () => {
    if (!isValid) {
      setError("Mohon lengkapi semua field yang wajib diisi");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("nama", form.nama);
      fd.append("nik", form.nik);
      fd.append("tanggal", form.tanggal);
      fd.append("pendidikan", form.pendidikan);
      fd.append("pekerjaan", form.pekerjaan);
      fd.append("penghasilan", form.penghasilan);
      fd.append("foto_ktp", form.fotoKtp);
      fd.append("alamat", form.alamat);
      fd.append("latitude", form.latitude);
      fd.append("longitude", form.longitude);

      // Gunakan api helper (otomatis handle token via interceptor)
      const res = await api.post("/kunjungan", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (!res.data.success) {
        throw new Error(res.data.message || "Gagal menyimpan kunjungan");
      }

      // Success - proceed to next step
      onNext(res.data.data.id, form.alamat);

    } catch (err) {
      console.error("Step1 submit error:", err);
      setError(err?.response?.data?.message || err.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setLoading(false);
    }
  };

  const isValid = form.nama && /^\d{16}$/.test(form.nik) && form.tanggal &&
    form.pendidikan && form.pekerjaan && form.penghasilan &&
    form.fotoKtp && form.alamat.length >= 10 &&
    form.latitude && form.longitude;

  return (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-gray-800">Informasi Kepala Keluarga</h2>

      {error && <Alert type="error" message={error} />}

      {loadingGps && (
        <Alert type="info" message="Mengambil lokasi GPS dan alamat..." loading={true} />
      )}

      {gpsStatus === "success" && (
        <Alert type="success" message="✓ Lokasi dan alamat berhasil didapatkan dari GPS" />
      )}

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

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
          <div>
            <h3 className="font-semibold text-blue-900 flex items-center gap-1">
              <Icon icon="mdi:map-marker" />
              Lokasi GPS
            </h3>
            <p className="text-xs text-blue-700 mt-0.5">Alamat akan otomatis terisi dari GPS Anda</p>
          </div>
          <button
            onClick={handleRefreshGps}
            disabled={loadingGps}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
          {loadingGps ? (
            <Icon icon="mdi:loading" className="animate-spin" />
          ) : (
            <Icon icon="mdi:refresh" />
          )}
          <span>Refresh Lokasi GPS</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-blue-800 mb-1">Latitude</label>
            <input
              value={form.latitude || ''}
              readOnly
              placeholder="-6.xxxxx"
              className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-blue-800 mb-1">Longitude</label>
            <input
              value={form.longitude || ''}
              readOnly
              placeholder="106.xxxxx"
              className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-mono"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block font-semibold mb-2 text-sm md:text-base">
          Alamat Lengkap (dari GPS) <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.alamat}
          onChange={(e) => setForm({ ...form, alamat: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm md:text-base"
          rows={3}
          placeholder="Alamat akan terisi otomatis dari koordinat GPS..."
          disabled={loadingGps}
        />
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="w-full md:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-50 disabled:shadow-none"
        >
          {loading ? "Menyimpan..." : "Lanjut ke Anggota Keluarga →"}
        </button>
      </div>
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
    try {
      const res = await api.get("/wilayah/pekerjaan");
      const p = res.data.map(item => item.nama);
      setPekerjaanList(p);
    } catch (err) {
      console.error("Failed to fetch pekerjaan", err);
    }
  };

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
    setError("");
    setLoading(true);

    if (members.length === 0) {
      setError("");
      setLoading(false);
      onNext();
      return;
    }

    const invalidMembers = members.filter(m => !m.nama || !m.hubungan || !m.tanggalLahir || !m.pendidikan || !m.penghasilan);
    if (invalidMembers.length > 0) {
      const missingFields = [];
      const m = invalidMembers[0];
      if (!m.nama) missingFields.push("Nama");
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
          fd.append("foto_ktp", member.fotoKtp);
        }

        const res = await api.post(`/kunjungan/${kunjunganId}/anggota`, fd);

        if (!res.data.success) {
          throw new Error(res.data.message || "Gagal menyimpan anggota");
        }
      }

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

  const isValid = members.length === 0 || members.every(m => m.nama && /^\d{16}$/.test(m.nik) && m.hubungan && m.tanggalLahir && m.pendidikan && m.penghasilan);

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
              <Input label="NIK" value={member.nik} onChange={(v) => updateMember(member.id, "nik", v)} required maxLength={16} placeholder="16 digit NIK" />

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
                ):q.type === "yesno" ? (
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
