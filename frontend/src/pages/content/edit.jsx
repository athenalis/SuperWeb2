import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import api from "../../lib/axios";

/* =========================
   HELPERS
========================= */
const makeInfluencerRow = () => ({
  rowId: `row_${Math.random().toString(16).slice(2)}`,
  influencer_id: "",
});

export function formatFollowers(num) {
  if (!num) return "-";
  if (num >= 1_000_000)
    return (num / 1_000_000).toFixed(1).replace(".0", "") + " jt";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(".0", "") + " rb";
  return num.toString();
}

/* =========================
   MAIN COMPONENT
========================= */
export default function EditContent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const dropdownRef = useRef(null);

  const [openPlatform, setOpenPlatform] = useState(false);
  const [loading, setLoading] = useState(false);

  // MASTER DATA
  const [platforms, setPlatforms] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [contentTypesByPlatform, setContentTypesByPlatform] = useState({});
  const [influencers, setInfluencers] = useState([]);

  // STATE STATUS SEBELUMNYA (buat warning downgrade)
  const [prevStatus, setPrevStatus] = useState(null);

  // INFLUENCER (EDITABLE LIKE CREATE)
  const [useInfluencer, setUseInfluencer] = useState(false);
  const [influencerRows, setInfluencerRows] = useState([makeInfluencerRow()]);

  // FORM
  const [form, setForm] = useState({
  title: "",
  posting_date: "",
  platform_ids: [],
  selected_content_by_platform: {},
  budget_content: "",
  budget_ads: "",
  is_ads: false,          
  ads_start_date: "",     
  ads_end_date: "",       
  description: "",
  status_id: "",
  content_links: {},
  });


  const isPosted = Number(form.status_id) === 4;
  const [refundBudget, setRefundBudget] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);

  /* =========================
     FETCH MASTER DATA
  ========================== */
  useEffect(() => {
    api
      .get("/platforms")
      .then((res) => setPlatforms(res.data))
      .catch(() => toast.error("Gagal memuat platform"));

    api
      .get("/content-statuses")
      .then((res) => setStatusOptions(res.data))
      .catch(() => toast.error("Gagal memuat status"));

    api
      .get("/content-types")
      .then((res) => setContentTypesByPlatform(res.data))
      .catch(() => toast.error("Gagal memuat jenis konten"));
  }, []);

  /* =========================
     OUTSIDE CLICK (DROPDOWN PLATFORM)
  ========================== */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenPlatform(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* =========================
     FETCH INFLUENCERS (FILTER BY PLATFORM)
  ========================== */
  useEffect(() => {
    // sesuai route kamu: Route::get('/influencers', [InfluencerController::class, 'index']);
    const params = form.platform_ids?.length
      ? { platform_ids: form.platform_ids }
      : {};
    api
      .get("/influencers", { params })
      .then((res) => setInfluencers(res.data || []))
      .catch(() => setInfluencers([]));
  }, [form.platform_ids]);

  /* =========================
     FETCH DETAIL CONTENT
  ========================== */
  useEffect(() => {
    if (!id) return;

    setLoading(true);

    api
      .get(`/content-plans/${id}`)
      .then((res) => {
        const data = res.data;

        const platformIds = [];
        const contentTypeMap = {};
        const links = {};

        (data.platforms || []).forEach((p) => {
          platformIds.push(p.id);
          contentTypeMap[p.id] = p.pivot?.content_type_id;
          if (p.pivot?.link) links[p.id] = p.pivot.link;
        });

        setForm({
          title: data.title || "",
          posting_date: data.posting_date || "",
          platform_ids: platformIds,
          selected_content_by_platform: contentTypeMap,
          budget_content: data.used_budget_with_trashed?.budget_content || "",
          budget_ads: data.used_budget_with_trashed?.budget_ads || "",
          is_ads: Boolean(data.is_ads),
          ads_start_date: data.ads_start_date || "",
          ads_end_date: data.ads_end_date || "",
          description: data.description || "",
          status_id: data.status?.id || "",
          content_links: links,
        });

        setPrevStatus(data.status?.id || null);

        // ✅ Prefill influencer -> editable like create
        if (Array.isArray(data.influencers) && data.influencers.length > 0) {
          setUseInfluencer(true);
          setInfluencerRows(
            data.influencers.map((inf) => ({
              rowId: `row_${inf.id}`,
              influencer_id: inf.id,
            }))
          );
        } else {
          setUseInfluencer(false);
          setInfluencerRows([makeInfluencerRow()]);
        }
      })
      .catch(() => toast.error("Gagal memuat konten"))
      .finally(() => setLoading(false));
  }, [id]);

  /* =========================
     DERIVED (INFLUENCER OPTIONS)
  ========================== */
  const selectedPlatforms = useMemo(
    () => (form.platform_ids || []).map(Number),
    [form.platform_ids]
  );

  const availableInfluencers = useMemo(() => {
    if (!selectedPlatforms.length) return influencers || [];
    return (influencers || []).filter((inf) => {
      if (!Array.isArray(inf.platforms)) return false;
      // bentuk data influencer bisa beda-beda; amanin:
      return inf.platforms.some((p) => {
        const pid = Number(p.id ?? p.platform_id ?? p.pivot?.platform_id);
        return selectedPlatforms.includes(pid);
      });
    });
  }, [influencers, selectedPlatforms]);

  /* =========================
     HANDLERS
  ========================== */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({
      ...p,
      [name]: name === "status_id" ? Number(value) : value,
    }));
  };

  const handlePlatformToggle = (pid, checked) => {
    if (isPosted) return;

    setForm((p) => {
      const nextPlatforms = checked
        ? [...p.platform_ids, pid]
        : p.platform_ids.filter((x) => x !== pid);

      const nextContent = { ...p.selected_content_by_platform };
      if (!checked) delete nextContent[pid];

      const nextLinks = { ...p.content_links };
      if (!checked) delete nextLinks[pid];

      return {
        ...p,
        platform_ids: nextPlatforms,
        selected_content_by_platform: nextContent,
        content_links: nextLinks,
      };
    });
  };

  const handleContentPick = (pid, typeId) => {
    if (isPosted) return;

    setForm((p) => ({
      ...p,
      selected_content_by_platform: {
        ...p.selected_content_by_platform,
        [pid]: typeId,
      },
    }));
  };

  const handleLinkChange = (pid, value) => {
    setForm((p) => ({
      ...p,
      content_links: {
        ...p.content_links,
        [pid]: value,
      },
    }));
  };

  const addInfluencerRow = () => {
    setInfluencerRows((p) => [...p, makeInfluencerRow()]);
  };

  const removeInfluencerRow = (rowId) => {
    setInfluencerRows((p) => {
      const next = p.filter((r) => r.rowId !== rowId);
      return next.length ? next : [makeInfluencerRow()];
    });
  };

  const setInfluencerInRow = (rowId, influencerId) => {
    setInfluencerRows((p) =>
      p.map((r) => (r.rowId === rowId ? { ...r, influencer_id: influencerId } : r))
    );
  };

  /* =========================
     VALIDATION
  ========================== */
  const validate = () => {
    if (!form.title) return "Judul wajib diisi";
    if (!form.posting_date) return "Tanggal wajib diisi";
    if (!form.platform_ids.length) return "Pilih minimal 1 platform";
    if (!form.budget_content) return "Budget wajib diisi";
    if (!form.status_id) return "Status wajib dipilih";
    if (form.is_ads) {
      if (!form.ads_start_date) return "Tanggal mulai Ads wajib diisi";
      if (!form.ads_end_date) return "Tanggal selesai Ads wajib diisi";
      if (!form.budget_ads || Number(form.budget_ads) <= 0)
        return "Budget Ads wajib diisi";
    }

    for (const pid of form.platform_ids) {
      if (!form.selected_content_by_platform[pid]) {
        return "Pilih konten untuk setiap platform";
      }
    }

    if (Number(form.status_id) === 4) {
      for (const pid of form.platform_ids) {
        if (!form.content_links?.[pid]) {
          const name = platforms.find((p) => p.id === pid)?.name || "platform";
          return `Link konten wajib diisi untuk ${name}`;
        }
      }
    }

    if (useInfluencer) {
      const anyPicked = influencerRows.some((r) => !!r.influencer_id);
      if (!anyPicked) return "Pilih minimal 1 influencer atau matikan 'Gunakan Influencer'";
    }

    return "";
  };

  /* =========================
     SUBMIT
  ========================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return toast.error(err);

    if (prevStatus === 4 && Number(form.status_id) !== 4) {
      const ok = window.confirm("Konten sudah Diposting. Yakin ingin mengubah status?");
      if (!ok) return;
    }

  const payload = {
    title: form.title,
    posting_date: form.posting_date,
    status_id: Number(form.status_id),
    refund_budget: Number(form.status_id) === 5 ? refundBudget : false,
    budget_content: Number(form.budget_content),
    budget_ads: form.is_ads ? Number(form.budget_ads) : 0,
    is_ads: form.is_ads,                     
    ads_start_date: form.is_ads ? form.ads_start_date : null, 
    ads_end_date: form.is_ads ? form.ads_end_date : null,     
    content_type_ids: form.selected_content_by_platform,
    links: form.content_links,
    influencer_ids: useInfluencer
      ? influencerRows.map(r => r.influencer_id).filter(Boolean)
      : [],
  };


    try {
      setLoading(true);
      await api.put(`/content-plans/${id}`, payload);
      toast.success("Perubahan berhasil disimpan");
      navigate("/content");
    } catch (err) {
      toast.error("Gagal menyimpan perubahan");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     STYLE
  ========================== */
  const baseInput =
    "w-full border rounded-lg px-6 py-3 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none";
  const baseSelect =
    "w-full appearance-none border rounded-lg px-6 py-3 pr-12 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none";
  const disabledSelect = "bg-slate-100 cursor-not-allowed";

  return (
    <div className="bg-white rounded-2xl p-8 shadow max-w-6xl mx-auto">
      <h2 className="text-4xl font-bold text-blue-900 mb-8 text-center">
        Edit Perencanaan Konten
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* JUDUL & TANGGAL */}
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Judul Konten" required>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              className={baseInput}
            />
          </Field>

          <Field label="Tanggal Konten" required>
            <input
              type="date"
              name="posting_date"
              value={form.posting_date}
              onChange={handleChange}
              className={baseInput}
            />
          </Field>
        </div>

        {/* PLATFORM */}
        <Field label="Platform" required>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => !isPosted && setOpenPlatform(!openPlatform)}
              className={`${baseSelect} ${isPosted ? "bg-slate-100 cursor-not-allowed" : ""}`}
            >
              {form.platform_ids.length
                ? platforms
                    .filter((p) => form.platform_ids.includes(p.id))
                    .map((p) => p.name)
                    .join(", ")
                : "Pilih Platform"}
            </button>

            <Icon
              icon="mdi:chevron-down"
              width={22}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            {openPlatform && !isPosted && (
              <div className="absolute z-30 mt-2 w-full bg-white border rounded-lg shadow p-3 space-y-2">
                {platforms.map((p) => (
                  <label key={p.id} className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={form.platform_ids.includes(p.id)}
                      onChange={(e) => handlePlatformToggle(p.id, e.target.checked)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Toggle Influencer (desain seperti create) */}
          {form.platform_ids.length > 0 && (
            <div className="mt-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useInfluencer}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUseInfluencer(checked);
                    setInfluencerRows(checked ? influencerRows : [makeInfluencerRow()]);
                  }}
                  className="scale-125"
                />
                <span className="font-bold text-slate-800">Gunakan Influencer</span>
                <span className="text-xs text-slate-500">(opsional)</span>
              </label>

              {useInfluencer && (
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

                  {influencerRows.map((row, idx) => {
                    const selectedInf = availableInfluencers.find(
                      (x) => Number(x.id) === Number(row.influencer_id)
                    );

                    // biar ga dobel (kecuali row yang sama)
                    const alreadyPicked = new Set(
                      influencerRows
                        .filter((r) => r.rowId !== row.rowId)
                        .map((r) => r.influencer_id)
                        .filter(Boolean)
                    );

                    const optionsForThisRow = availableInfluencers.filter(
                      (inf) => !alreadyPicked.has(inf.id) || inf.id === row.influencer_id
                    );

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
                                onChange={(e) =>
                                  setInfluencerInRow(row.rowId, Number(e.target.value))
                                }
                                className={`${baseSelect} ${
                                  optionsForThisRow.length ? "" : disabledSelect
                                }`}
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

                            {/* Preview detail influencer (tetap gaya create) */}
                            {selectedInf && (
                              <div className="mt-3 space-y-4">
                                <div className="text-sm font-bold text-slate-800">
                                  {selectedInf.name}
                                </div>

                                <div className="mt-2 space-y-2">
                                  {(selectedInf.platforms || []).map((p) => (
                                    <div
                                      key={p.id ?? `${selectedInf.id}_${p.username}`}
                                      className="flex items-center justify-between border rounded-lg px-4 py-3"
                                    >
                                      <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-slate-700">
                                          {p.platform?.name || p.name || "-"}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                          {p.username || "-"}
                                        </span>
                                      </div>
                                      <div className="text-sm font-bold text-slate-800">
                                        {formatFollowers(p.followers)}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {(selectedInf.email ||
                                  (selectedInf.contacts && selectedInf.contacts.length > 0)) && (
                                  <div className="mt-4 border-t pt-4">
                                    <div className="text-sm font-bold text-slate-700 mb-2">
                                      CP (Kontak Person)
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {selectedInf.email && (
                                        <div className="border rounded-lg px-4 py-3">
                                          <div className="text-xs font-semibold text-slate-500">
                                            Email
                                          </div>
                                          <div className="text-sm text-slate-800">
                                            {selectedInf.email}
                                          </div>
                                        </div>
                                      )}

                                      {selectedInf.contacts?.map((c, i) => (
                                        <div
                                          key={`${selectedInf.id}_cp_${i}`}
                                          className="border rounded-lg px-4 py-3"
                                        >
                                          <div className="text-xs font-semibold text-slate-500">
                                            No. Telepon
                                          </div>
                                          <div className="text-sm text-slate-800">{c}</div>
                                        </div>
                                      ))}
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

        {/* KONTEN */}
        <Field label="Konten" required>
          {form.platform_ids.map((pid) => {
            const platform = platforms.find((p) => p.id === pid);
            const types = contentTypesByPlatform[String(pid)] || [];

            return (
              <div key={pid} className="border rounded-xl p-4 mb-4">
                <div className="font-bold mb-3">{platform?.name}</div>

                <div className="grid md:grid-cols-3 gap-3">
                  {types.map((t) => (
                    <label
                      key={t.id}
                      className={`flex gap-2 border p-3 rounded-lg ${
                        isPosted ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={isPosted}
                        checked={form.selected_content_by_platform[pid] === t.id}
                        onChange={() => handleContentPick(pid, t.id)}
                      />
                      {t.name}
                    </label>
                  ))}
                </div>

                {Number(form.status_id) === 4 && (
                  <input
                    type="url"
                    placeholder={`Link ${platform?.name}`}
                    value={form.content_links?.[pid] || ""}
                    onChange={(e) => handleLinkChange(pid, e.target.value)}
                    className={`${baseInput} mt-3`}
                  />
                )}
              </div>
            );
          })}
        </Field>

        {/* STATUS */}
        <Field label="Status" required>
          <select
            name="status_id"
            value={form.status_id}
            onChange={(e) => {
              const nextStatus = Number(e.target.value);
        
              if (nextStatus === 5 && Number(form.status_id) !== 5) {
                setPendingStatus(nextStatus);
                setShowRefundModal(true);
                return;
              }
        
              setForm((p) => ({
                ...p,
                status_id: nextStatus,
              }));
            }}
            className={baseSelect}
          >
            <option value="">Pilih Status</option>
            {statusOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>

        {/* BUDGET */}

        {showRefundModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-xl font-bold text-blue-900 mb-2">
                Refund Budget?
              </h3>

              <p className="text-slate-600 mb-6">
                Apakah Anda ingin melakukan refund budget untuk konten ini?
              </p>

              <div className="flex justify-end gap-3">
                {/* TIDAK REFUND */}
                <button
                  onClick={() => {
                    setRefundBudget(false);
                    setForm((p) => ({
                      ...p,
                      status_id: pendingStatus,
                    }));
                    setShowRefundModal(false);
                    setPendingStatus(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-300
                            text-slate-600 hover:bg-slate-100 transition"
                >
                  Tidak
                </button>

                {/* REFUND */}
                <button
                  onClick={() => {
                    setRefundBudget(true);
                    setForm((p) => ({
                      ...p,
                      status_id: pendingStatus,
                    }));
                    setShowRefundModal(false);
                    setPendingStatus(null);
                  }}
                  className="px-5 py-2 rounded-lg bg-blue-900 text-white
                            hover:bg-blue-800 transition"
                >
                  Ya, Refund
                </button>
              </div>
            </div>
          </div>
        )}

      <Field label="Budget Konten" required>
        <input
          type="number"
          name="budget_content"
          value={form.budget_content}
          onChange={handleChange}
          className={baseInput}
          placeholder="Masukkan budget konten"
        />
      </Field>

      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.is_ads}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              is_ads: e.target.checked,
            }))
          }
          className="scale-125"
        />
        <span className="font-bold text-slate-800">Aktifkan Ads</span>
        <span className="text-xs text-slate-500">(opsional)</span>
      </label>

      {form.is_ads && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-xl bg-white shadow-sm">

          <Field label="Tanggal Mulai Ads" required>
            <input
              type="date"
              value={form.ads_start_date}
              onChange={(e) =>
                setForm((p) => ({ ...p, ads_start_date: e.target.value }))
              }
              className={baseInput}
            />
          </Field>

          <Field label="Tanggal Selesai Ads" required>
            <input
              type="date"
              value={form.ads_end_date}
              onChange={(e) =>
                setForm((p) => ({ ...p, ads_end_date: e.target.value }))
              }
              className={baseInput}
            />
          </Field>

          <Field label="Budget Ads" required>
            <input
              type="number"
              value={form.budget_ads}
              onChange={(e) =>
                setForm((p) => ({ ...p, budget_ads: e.target.value }))
              }
              className={baseInput}
              placeholder="Masukkan budget ads"
            />
          </Field>
        </div>
      )}


      <div className="border rounded-xl p-4 bg-slate-50">
        <div className="text-sm text-slate-500 mb-1">Total Budget</div>
        <div className="text-xl font-bold text-slate-800">
          Rp{" "}
          {(
            Number(form.budget_content || 0) +
            Number(form.is_ads ? form.budget_ads : 0)
          ).toLocaleString("id-ID")}
        </div>
      </div>


        {/* DESKRIPSI */}
        <Field label="Deskripsi">
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className={baseInput}
            rows={4}
          />
        </Field>

        {/* ACTION */}
        <div className="flex justify-end gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-900 text-white px-6 py-2 rounded-lg"
          >
            Simpan Perubahan
          </button>

          <button
            type="button"
            onClick={() => navigate("/content")}
            className="text-slate-600"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}

/* =========================
   FIELD
========================= */
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
