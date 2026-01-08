import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import axios from "../../lib/axios";

/* ========================= HELPERS ========================= */
const formatCPLabel = (type) => {
  if (type === "phone") return "No. Telepon";
  if (type === "email") return "Email";
  return "Kontak";
};

const intersectPlatforms = (selected, influencerPlatforms) => {
  const set = new Set(selected.map(Number));
  return influencerPlatforms.filter((p) => set.has(Number(p.id)));
};

const makeInfluencerRow = () => ({
  rowId: `row_${Math.random().toString(16).slice(2)}`,
  influencer_id: "",
});

export function formatFollowers(num) {
  if (!num) return "-";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(".0", "") + " jt";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(".0", "") + " rb";
  return num.toString();
}

/* ========================= MAIN COMPONENT ========================= */
export default function CreateContent() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openPlatform, setOpenPlatform] = useState(false);
  const [platforms, setPlatforms] = useState([]);
  const [adsErrors, setAdsErrors] = useState({});
  const [contentTypesByPlatform, setContentTypesByPlatform] = useState({});
  const [form, setForm] = useState({
    title: "",
    posting_date: "",
    platform_ids: [],
    use_influencer: false,
    influencer_rows: [makeInfluencerRow()],
    selected_content_by_platform: {},
    budget_content: "",
    is_ads: false,
    ads_start_date: "",
    ads_end_date: "",
    budget_ads: "",
    description: "",
  });

  /* ========================= FETCH PLATFORMS ========================== */
  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        const res = await axios.get("/platforms");
        setPlatforms(res.data);
      } catch (err) {
        console.error("Gagal ambil platforms:", err);
        toast.error("Gagal mengambil daftar platform");
      }
    };
    fetchPlatforms();
  }, []);

  /* ========================= FETCH CONTENT TYPES ========================== */
  useEffect(() => {
    const fetchContentTypes = async () => {
      try {
        const res = await axios.get("/content-types");
        setContentTypesByPlatform(res.data);
      } catch (err) {
        console.error("Gagal ambil content types:", err);
        toast.error("Gagal mengambil jenis konten");
      }
    };
    fetchContentTypes();
  }, []);

  /* ========================= FETCH INFLUENCERS SESUAI PLATFORM ========================== */
  useEffect(() => {
    const fetchInfluencers = async () => {
      try {
        const params = form.platform_ids.length
          ? { platform_ids: form.platform_ids }
          : {};
        const res = await axios.get("/influencers", { params });
        setInfluencers(res.data);
      } catch (err) {
        console.error("Gagal ambil influencer:", err);
        toast.error("Gagal mengambil daftar influencer");
      }
    };
    if (form.platform_ids.length) fetchInfluencers();
  }, [form.platform_ids]);

  /* ========================= OUTSIDE CLICK DROPDOWN ========================== */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenPlatform(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ========================= DERIVED DATA ========================== */
  const selectedPlatforms = form.platform_ids.map(Number);

  const showInfluencerSection = useMemo(() => {
    return form.use_influencer && selectedPlatforms.length > 0;
  }, [form.use_influencer, selectedPlatforms]);

  const availableInfluencers = useMemo(() => {
    if (!selectedPlatforms.length) return influencers;

    return influencers.filter((inf) =>
      Array.isArray(inf.platforms) &&
      inf.platforms.some((p) => selectedPlatforms.includes(Number(p.id)))
    );
  }, [selectedPlatforms, influencers]);

  /* ========================= HANDLERS ========================== */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlatformToggle = (platformId, checked) => {
    setForm((prev) => {
      const nextIds = checked
        ? [...prev.platform_ids, platformId]
        : prev.platform_ids.filter((id) => id !== platformId);
      return { ...prev, platform_ids: nextIds };
    });
  };

  const addInfluencerRow = () => {
    setForm((prev) => ({
      ...prev,
      influencer_rows: [...prev.influencer_rows, makeInfluencerRow()],
    }));
  };

  const removeInfluencerRow = (rowId) => {
    setForm((prev) => {
      const next = prev.influencer_rows.filter((r) => r.rowId !== rowId);
      return { ...prev, influencer_rows: next.length ? next : [makeInfluencerRow()] };
    });
  };

  const setInfluencerInRow = (rowId, influencerId) => {
    setForm((prev) => ({
      ...prev,
      influencer_rows: prev.influencer_rows.map((r) =>
        r.rowId === rowId ? { ...r, influencer_id: influencerId } : r
      ),
    }));
  };

  const handleContentPick = (platformId, contentTypeId) => {
    setForm((prev) => ({
      ...prev,
      selected_content_by_platform: {
        ...(prev.selected_content_by_platform || {}),
        [platformId]: contentTypeId,
      },
    }));
  };

  const handleAdsChange = (platformId, field, value) => {
    setForm(prev => {
      const nextAds = {
        ...prev.ads_by_platform,
        [platformId]: {
          ...(prev.ads_by_platform?.[platformId] || {}),
          [field]: value
        }
      };

      // VALIDASI REAL-TIME
      const start = nextAds[platformId]?.start_date;
      const end = nextAds[platformId]?.end_date;
      const postingDate = prev.posting_date;

      setAdsErrors(prevErr => {
        const nextErr = { ...prevErr };

        // 1) Start date tidak boleh kurang dari posting date
        if (start && postingDate && start < postingDate) {
          nextErr[platformId] = "Start Ads tidak boleh kurang dari tanggal posting";
          toast.error("Start Ads tidak boleh kurang dari tanggal posting");
        }
        // 2) End date harus >= start date
        else if (start && end && end < start) {
          nextErr[platformId] = "Tanggal selesai ads harus sama atau setelah tanggal mulai";
        }
        else {
          delete nextErr[platformId];
        }

        return nextErr;
      });

      return { ...prev, ads_by_platform: nextAds };
    });
  };

  const getPlatformLabel = (ids) => {
    if (!ids || !ids.length) return "Pilih platform";

    const names = ids
      .map((id) => platforms.find((p) => Number(p.id) === Number(id))?.name)
      .filter(Boolean);

    if (!names.length) return "Platform";

    return names.join(", ");
  };

  const getPlatformName = (id) =>
    platforms.find((p) => Number(p.id) === Number(id))?.name || id;

  /* ========================= VALIDATION ========================== */
  const validate = () => {
    if (!form.title.trim()) return "Judul konten wajib diisi";
    if (!form.posting_date) return "Tanggal konten wajib diisi";
    if (!form.budget_content) return "Budget konten wajib diisi";
    if (Number(form.budget_content) <= 0) return "Budget konten harus lebih dari 0";
    if (!selectedPlatforms.length) return "Minimal pilih satu platform";

    for (const pid of selectedPlatforms) {
      const picked = form.selected_content_by_platform?.[pid];
      if (!picked) return `Pilih konten untuk platform ${getPlatformName(pid)}`;
    }

    if (form.is_ads) {
      const ads = form.ads_by_platform || {};
      let hasAnyAdsFilled = false;

      for (const pid of selectedPlatforms) {
        const a = ads[pid];
        if (!a) continue;

        const filledFields = [a.start_date, a.end_date, a.budget_ads].filter(Boolean);

        // kalau salah satu diisi → wajib lengkap
        if (filledFields.length > 0) {
          hasAnyAdsFilled = true;

          if (!a.start_date)
            return `Tanggal mulai ads wajib diisi untuk ${getPlatformName(pid)}`;

          if (!a.end_date)
            return `Tanggal selesai ads wajib diisi untuk ${getPlatformName(pid)}`;

          if (!a.budget_ads)
            return `Budget ads wajib diisi untuk ${getPlatformName(pid)}`;

          if (Number(a.budget_ads) <= 0)
            return `Budget ads harus lebih dari 0 untuk ${getPlatformName(pid)}`;
        }
      }

      // optional: kalau checkbox ads dicentang tapi ga ada satu pun diisi
      if (!hasAnyAdsFilled) {
        // boleh kosong → TIDAK ERROR
      }
    }

    if (form.use_influencer) {
      const anyPicked = form.influencer_rows.some((r) => !!r.influencer_id);
      if (!anyPicked) return "Pilih minimal 1 influencer atau matikan 'Gunakan Influencer'";
    }

    return "";
  };

  /* ========================= SUBMIT ========================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // VALIDASI LAIN
    const err = validate();
    if (err) return toast.error(err);

    // VALIDASI ADS LANGSUNG sebelum submit
    if (form.is_ads) {
      for (const pid of selectedPlatforms) {
        const a = form.ads_by_platform?.[pid];
        if (!a) continue;

        if (a.start_date && form.posting_date && a.start_date < form.posting_date) {
          return toast.error(`Start Ads untuk ${getPlatformName(pid)} tidak boleh kurang dari tanggal konten`);
        }
        if (a.start_date && a.end_date && a.end_date < a.start_date) {
          return toast.error(`End Ads untuk ${getPlatformName(pid)} harus setelah start ads`);
        }
        if ((a.start_date || a.end_date || a.budget_ads) && (!a.start_date || !a.end_date || !a.budget_ads)) {
          return toast.error(`Lengkapi semua field ads untuk ${getPlatformName(pid)}`);
        }
      }
    }

    setLoading(true);
    try {
      const payload = {
        title: form.title,
        posting_date: form.posting_date,
        content_type_ids: form.selected_content_by_platform,
        budget_content: Number(form.budget_content),
        description: form.description,
        influencer_ids: form.use_influencer
          ? form.influencer_rows.filter(r => r.influencer_id).map(r => r.influencer_id)
          : [],
        is_ads: form.is_ads,
        ads_by_platform: form.is_ads ? form.ads_by_platform : {},
      };

      await axios.post("/content-plans", payload);
      toast.success("Content plan berhasil dibuat!");
      navigate("/content");
    } catch (e) {
      console.error(e);
      toast.error("Gagal membuat content plan");
    } finally {
      setLoading(false);
    }
  };

  const baseInput =
    "w-full border rounded-lg px-6 py-3 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none";
  const baseSelect =
    "w-full appearance-none border rounded-lg px-6 py-3 pr-12 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none";
  const disabledSelect = "bg-slate-100 cursor-not-allowed";

  return (
    <div className="bg-white rounded-2xl p-8 shadow max-w-6xl mx-auto">
      <h2 className="text-4xl text-blue-900 font-bold mb-8 text-center">
        Form Perencanaan Konten
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1) JUDUL */}
          <Field label="Judul Konten" required>
            <input
              className={baseInput}
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Masukkan judul konten"
            />
          </Field>

          {/* 2) TANGGAL */}
          <Field label="Tanggal Konten" required>
            <input
              type="date"
              className={baseInput}
              name="posting_date"
              value={form.posting_date}
              onChange={handleChange}
            />
          </Field>
        </div>

        {/* 3) PLATFORM (DROPDOWN CHECKBOX) */}
        <Field label="Platform" required>
          <div className="relative" ref={dropdownRef}>
            {/* Trigger */}
            <button
              type="button"
              onClick={() => setOpenPlatform((s) => !s)}
              className={`${baseSelect} text-left relative`}
            >

              <span className={form.platform_ids.length
                ? "text-slate-800"
                : "text-slate-400"
              }
              >
                {getPlatformLabel(form.platform_ids)}
              </span>

              {/* Chevron (posisi FIXED, ga ikut turun) */}
              <Icon
                icon="mdi:chevron-down"
                width={22}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </button>

            {/* Dropdown */}
            {openPlatform && (
              <div className="absolute z-30 mt-2 w-full bg-white border rounded-lg shadow p-3 space-y-2">
                {platforms.map((p) => (
                  <label key={p.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.platform_ids.includes(p.id)}
                      onChange={(e) => handlePlatformToggle(p.id, e.target.checked)}
                    />
                    <span>{p.name}</span> {/* pastikan string, bukan object */}
                  </label>
                ))}
              </div>
            )}
          </div>

          {selectedPlatforms.length > 0 && (
            <div className="mt-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.use_influencer}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((prev) => ({
                      ...prev,
                      use_influencer: checked,
                      influencer_rows: checked ? prev.influencer_rows : [makeInfluencerRow()],
                    }));
                  }}
                  className="scale-125"
                />
                <span className="font-bold text-slate-800">Gunakan Influencer</span>
                <span className="text-xs text-slate-500">
                  (opsional, pilih konten dulu)
                </span>
              </label>

              {showInfluencerSection && (
                <div className="mt-4 rounded-xl bg-white border border-slate-200 shadow-sm p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-800">Influencer</div>
                      <div className="text-sm text-slate-500">
                        Pilih influencer sesuai platform yang kamu pilih
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={addInfluencerRow}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-lg
                       border border-blue-900 text-blue-900 hover:bg-blue-900 hover:text-white transition"
                    >
                      <Icon icon="mdi:plus" width={18} />
                      Tambah
                    </button>
                  </div>

                  {form.influencer_rows.map((row, idx) => {
                    const selectedInf = influencers.find((x) => x.id === row.influencer_id);

                    // supaya ga dobel (kecuali row yang sama)
                    const alreadyPicked = new Set(
                      form.influencer_rows
                        .filter((r) => r.rowId !== row.rowId)
                        .map((r) => r.influencer_id)
                        .filter(Boolean)
                    );

                    const optionsForThisRow = availableInfluencers.filter(
                      (inf) => !alreadyPicked.has(inf.id) || inf.id === row.influencer_id
                    );

                    // platform relevan buat influencer
                    const relevantPlatforms = selectedInf
                      ? intersectPlatforms(selectedPlatforms, selectedInf.platforms)
                      : [];

                    return (
                      <div key={row.rowId} className="bg-white border rounded-xl p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="text-sm font-bold text-slate-700 mb-2">
                              Influencer {idx + 1}
                            </div>

                            <div className="relative">
                              <select
                                value={row.influencer_id}
                                onChange={(e) => setInfluencerInRow(row.rowId, Number(e.target.value))}
                                className={`${baseSelect} ${optionsForThisRow.length ? "" : disabledSelect}`}
                                disabled={optionsForThisRow.length === 0}
                              >
                                <option value="" disabled>
                                  {optionsForThisRow.length
                                    ? "Pilih Influencer"
                                    : "Tidak ada influencer untuk platform ini"}
                                </option>
                                {optionsForThisRow.map((inf) => (
                                  <option key={inf.id} value={inf.id}>
                                    {inf.name}
                                  </option>
                                ))}
                              </select>

                              <Icon
                                icon="mdi:chevron-down"
                                width={22}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                              />
                            </div>

                            {selectedInf && (
                              <div className="mt-3 space-y-4">
                                {/* Nama influencer */}
                                <div className="text-sm font-bold text-slate-800">{selectedInf.name}</div>

                                {/* Platforms */}
                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {selectedInf.platforms.map((p) => (
                                    <div
                                      key={p.id}
                                      className="flex items-center justify-between border rounded-lg px-4 py-3 min-h-[72px]"
                                    >
                                      <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-slate-700">{p.name}</span>
                                        <span className="text-xs text-slate-500">{p.username || "-"}</span>
                                      </div>
                                      <div className="text-sm font-bold text-slate-800">
                                        {formatFollowers(p.followers)}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Kontak Person */}
                                {(selectedInf.email || (selectedInf.contacts && selectedInf.contacts.length > 0)) && (
                                  <div className="mt-4 border-t pt-4">
                                    <div className="text-sm font-bold text-slate-700 mb-2">CP (Kontak Person)</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Email */}
                                      {selectedInf.email && (
                                        <div className="border rounded-lg px-4 py-3">
                                          <div className="text-xs font-semibold text-slate-500">Email</div>
                                          <div className="text-sm text-slate-800">{selectedInf.email}</div>
                                        </div>
                                      )}

                                      {/* Kontak lain */}
                                      {selectedInf.contacts && selectedInf.contacts.length > 0 &&
                                        selectedInf.contacts.map((c, i) => (
                                          <div key={`cp_${selectedInf.id}_${c}`} className="border rounded-lg px-4 py-3">
                                            <div className="text-xs font-semibold text-slate-500">No. Telepon</div>
                                            <div className="text-sm text-slate-800">{c}</div>
                                          </div>
                                        ))
                                      }
                                    </div>
                                  </div>
                                )}

                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeInfluencerRow(row.rowId)}
                            title="Hapus"
                            className="w-10 h-10 flex items-center justify-center rounded-lg border
                             text-slate-500 hover:text-red-600 hover:border-red-300 transition"
                          >
                            <Icon icon="mdi:trash-outline" width={20} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </Field>

        {/* 4) KONTEN (sesuai platform) */}
        <Field label="Konten" required>
          {!selectedPlatforms.length ? (
            <div className="text-slate-500 text-sm">
              Pilih platform dulu untuk menampilkan pilihan konten.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-slate-500">
                Pilih <span className="font-semibold">1 konten</span> untuk{" "}
                <span className="font-semibold">setiap</span> platform yang kamu pilih.
              </div>

              {selectedPlatforms.map((pid) => {
                const types = contentTypesByPlatform[String(pid)] || [];
                const picked = form.selected_content_by_platform?.[pid] || "";

                return (
                  <div key={pid} className="border rounded-xl p-4 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800">
                        {getPlatformName(pid)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {picked
                          ? `Dipilih: ${types.find(t => t.id === picked)?.name}`
                          : "Belum dipilih"}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                      {types.map((t) => {
                        const checked = Number(picked) === Number(t.id);

                        return (
                          <label
                            key={`${pid}_${t.id}`}
                            className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer select-none
                              ${checked ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-slate-300"}
                            `}
                          >
                            {/* checkbox UI, tapi single-select behavior */}
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleContentPick(pid, t.id)}
                              className="scale-125"
                            />
                            <span className="font-medium text-slate-800">
                              {t.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    {types.length === 0 && (
                      <div className="mt-3 text-sm text-slate-500">
                        Tidak ada konten untuk platform ini.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Field>

        {/* 5) BUDGET KONTEN */}
        <Field label="Budget Konten" required>
          <input
            type="number"
            className={baseInput}
            name="budget_content"
            value={form.budget_content}
            onChange={handleChange}
            placeholder="Masukkan budget konten"
          />
        </Field>

        {/* ADS (opsional) - tetep dibawah budget konten */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            name="is_ads"
            checked={form.is_ads}
            onChange={handleChange}
            className="scale-125"
          />
          <span className="font-bold text-slate-800">Aktifkan Ads</span>
          <span className="text-xs text-slate-500">(opsional)</span>
        </label>

        {form.is_ads && selectedPlatforms.map(pid => (
          <div key={pid} className="border rounded-xl p-4 bg-white shadow-sm space-y-4">
            <div className="font-bold text-slate-800">
              Ads – {getPlatformName(pid)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Tanggal Mulai Ads">
                <input
                  type="date"
                  className={baseInput}
                  value={form.ads_by_platform?.[pid]?.start_date || ""}
                  onChange={e => handleAdsChange(pid, "start_date", e.target.value)}
                  min={form.posting_date || ""} // Tanggal mulai ads tidak boleh sebelum tanggal konten
                />
              </Field>

              <Field label="Tanggal Selesai Ads">
                <input
                  type="date"
                  className={baseInput}
                  value={form.ads_by_platform?.[pid]?.end_date || ""}
                  onChange={e => handleAdsChange(pid, "end_date", e.target.value)}
                  min={form.ads_by_platform?.[pid]?.start_date || form.posting_date || ""}
                // Tanggal selesai ads tidak boleh sebelum start ads
                />
              </Field>

              <Field label="Budget Ads">
                <input
                  type="number"
                  className={baseInput}
                  placeholder="Masukkan budget ads"
                  value={form.ads_by_platform?.[pid]?.budget_ads || ""}
                  onChange={e => handleAdsChange(pid, "budget_ads", e.target.value)}
                />
              </Field>
            </div>

            <div className="text-xs text-slate-500">
              Kosongkan jika tidak ingin menggunakan ads di platform ini
            </div>
          </div>
        ))}

        {/* DESKRIPSI (opsional) */}
        <Field label="Deskripsi">
          <textarea
            name="description"
            rows={4}
            className={baseInput}
            placeholder="Masukkan deskripsi (opsional)"
            value={form.description}
            onChange={handleChange}
          />
        </Field>

        {/* ACTION */}
        <div className="flex justify-end gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-900 hover:bg-blue-800 text-white px-6 py-2 rounded-lg"
          >
            {loading ? "Menyimpan..." : "Simpan"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/content")}
            className="text-gray-600 hover:underline"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}

/* ========================= FIELD ========================= */
function Field({ label, required, children }) {
  return (
    <div>
      <label className="block mb-3 font-bold">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
