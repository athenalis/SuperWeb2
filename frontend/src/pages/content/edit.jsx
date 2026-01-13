import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import api from "../../lib/axios";

/* =========================
   HELPERS
========================= */
const MAX_BUDGET = 999_999_999_999;

const formatRupiahInput = (value) => {
  if (!value) return "";
  const number = Number(value);
  if (isNaN(number)) return "";

  return number
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseRupiahInput = (value, prevValue = "") => {
  const raw = value.replace(/\D/g, "");
  if (!raw) return "";

  const num = Number(raw);

  if (num > MAX_BUDGET) {
    return prevValue;
  }

  return raw;
};

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
   MAIN
========================= */
export default function EditContent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const dropdownRef = useRef(null);

  const [openPlatform, setOpenPlatform] = useState(false);
  const [loading, setLoading] = useState(false);

  const [platforms, setPlatforms] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [contentTypesByPlatform, setContentTypesByPlatform] = useState({});
  const [influencers, setInfluencers] = useState([]);

  const [prevStatus, setPrevStatus] = useState(null);

  const [useInfluencer, setUseInfluencer] = useState(false);
  const [influencerRows, setInfluencerRows] = useState([makeInfluencerRow()]);

  const [form, setForm] = useState({
    title: "",
    posting_date: "",
    platform_ids: [],
    selected_content_by_platform: {},
    budget_content: "",
    is_ads: false,
    ads_by_platform: {}, // <-- per platform
    description: "",
    status_id: "",
    content_links: {},
  });

  const isPosted = Number(form.status_id) === 4;

  const [refundBudget, setRefundBudget] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);

  /* =========================
     MASTER DATA
  ========================== */
  useEffect(() => {
    api.get("/platforms").then((r) => setPlatforms(r.data));
    api.get("/content-statuses").then((r) => setStatusOptions(r.data));
    api.get("/content-types").then((r) => setContentTypesByPlatform(r.data));
  }, []);

  /* =========================
     OUTSIDE CLICK
  ========================== */
  useEffect(() => {
    const h = (e) =>
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target) &&
      setOpenPlatform(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* =========================
     INFLUENCERS
  ========================== */
  useEffect(() => {
    const params = form.platform_ids.length
      ? { platform_ids: form.platform_ids }
      : {};
    api.get("/influencers", { params }).then((r) => setInfluencers(r.data || []));
  }, [form.platform_ids]);

  /* =========================
     FETCH DETAIL
  ========================== */
  useEffect(() => {
    if (!id) return;

    setLoading(true);

    api.get(`/content-plans/${id}`)
      .then((res) => {
        const data = res.data.data ?? res.data;

        const platformIdsSet = new Set();
        const contentTypeMap = {};
        const links = {};
        const adsMap = {};

        (data.content_platforms || []).forEach((cp) => {
          platformIdsSet.add(cp.platform_id);

          if (!contentTypeMap[cp.platform_id]) {
            contentTypeMap[cp.platform_id] = {};
          }

          contentTypeMap[cp.platform_id][cp.content_type_id] = {
            is_collaborator: !!cp.is_collaborator,
          };
        });

        setForm({
          title: data.title ?? "",
          posting_date: data.posting_date ? data.posting_date.slice(0, 10) : "", // FIX
          platform_ids: Array.from(platformIdsSet),
          selected_content_by_platform: contentTypeMap,
          budget_content: data.budget_with_trashed?.budget_content ?? "",
          is_ads: Object.keys(adsMap).length > 0,
          ads_by_platform: adsMap, // ads per platform
          description: data.description ?? "",
          status_id: data.status_id ?? "",
          content_links: {}, //
        });

        setPrevStatus(data.status_id ?? null);

        if (data.influencers?.length) {
          setUseInfluencer(true);
          setInfluencerRows(
            data.influencers.map((inf) => ({
              rowId: `row_${inf.id}`,
              influencer_id: inf.id,
            }))
          );
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  /* =========================
     DERIVED
  ========================== */
  const selectedPlatforms = useMemo(
    () => form.platform_ids.map(Number),
    [form.platform_ids]
  );

  const availableInfluencers = useMemo(() => {
    return influencers.filter((inf) =>
      inf.platforms?.some((p) =>
        selectedPlatforms.includes(Number(p.id ?? p.platform_id))
      )
    );
  }, [influencers, selectedPlatforms]);

  // FIX: Hitung total budget ads
  const totalAdsBudget = useMemo(
    () =>
      Object.values(form.ads_by_platform || {}).reduce(
        (sum, ad) => sum + Number(ad.budget_ads || 0),
        0
      ),
    [form.ads_by_platform]
  );

  /* =========================
   INFLUENCER ROW HANDLERS
========================= */
  const addInfluencerRow = () => {
    setInfluencerRows((prev) => [...prev, makeInfluencerRow()]);
  };

  const removeInfluencerRow = (rowId) => {
    setInfluencerRows((prev) => prev.filter((r) => r.rowId !== rowId));
  };

  const setInfluencerInRow = (rowId, influencer_id) => {
    setInfluencerRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, influencer_id } : r))
    );
  };

  /* =========================
     HANDLERS
  ========================== */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  /* =========================
   HANDLE CONTENT PICK
========================= */
  const handleContentPick = (platformId, contentTypeId) => {
    setForm((prev) => {
      const prevPlatform = prev.selected_content_by_platform[platformId] || {};

      const exists = !!prevPlatform[contentTypeId];

      const nextPlatform = { ...prevPlatform };

      if (exists) {
        delete nextPlatform[contentTypeId];
      } else {
        nextPlatform[contentTypeId] = {
          is_collaborator: false,
        };
      }

      return {
        ...prev,
        selected_content_by_platform: {
          ...prev.selected_content_by_platform,
          [platformId]: nextPlatform,
        },
      };
    });
  };


  /* =========================
     HANDLE LINK CHANGE (optional)
  ========================= */
  const handleLinkChange = (platformId, contentTypeId, value) => {
  setForm((prev) => ({
    ...prev,
    content_links: {
      ...prev.content_links,
      [platformId]: {
        ...(prev.content_links?.[platformId] || {}),
        [contentTypeId]: value,
      },
    },
  }));
};


  /* =========================
     SUBMIT
  ========================== */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔥 VALIDASI ADS
    if (form.is_ads) {
      const adsPlatforms = Object.entries(form.ads_by_platform).filter(
        ([pid, ad]) => ad && ad.is_ads
      );

      for (const [pid, ad] of adsPlatforms) {
        if (!ad.start_date || !ad.end_date || ad.budget_ads === "") {
          toast.error(
            `Platform ${platforms.find(p => p.id === Number(pid))?.name} harus mengisi semua kolom Ads`
          );
          return;
        }
      }
    }

    // 🔥 Pastikan ads_by_platform sesuai struktur BE
    const adsPayload = form.is_ads
      ? Object.fromEntries(
        Object.entries(form.ads_by_platform).map(([pid, ad]) => [
          pid,
          {
            start_date: ad.start_date,
            end_date: ad.end_date,
            budget_ads: Number(ad.budget_ads || 0),
          },
        ])
      )
      : {};

    const payload = {
      title: form.title,
      posting_date: form.posting_date,
      status_id: Number(form.status_id),
      description: form.description,
      refund_budget: Number(form.status_id) === 5 ? refundBudget : false,
      budget_content: Number(form.budget_content),
      is_ads: form.is_ads,
      content_types: form.selected_content_by_platform, 
      links: form.content_links,
      influencer_ids: useInfluencer
        ? influencerRows.map((r) => r.influencer_id).filter(Boolean)
        : [],
      ads_by_platform: adsPayload,
    };

    console.log("payload PUT:", payload); // ✅ cek dulu di console sebelum submit

    try {
      setLoading(true);
      await api.put(`/content-plans/${id}`, payload);
      toast.success("Perubahan berhasil disimpan");
      navigate(`/content/${id}`);
    } catch (err) {
      console.error("PUT Error:", err.response?.data || err.message);
      toast.error("Gagal menyimpan perubahan");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     UI
  ========================== */
  const baseInput =
    "w-full border rounded-lg px-6 py-3 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none";
  const baseSelect =
    "w-full appearance-none border rounded-lg px-6 py-3 pr-12 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none";

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
                                className={`${baseSelect} ${optionsForThisRow.length ? "" : disabledSelect
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

                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {(selectedInf.platforms || []).map((p) => (
                                    <div
                                      key={p.id ?? `${selectedInf.id}_${p.username}`}
                                      className="flex items-center justify-between border rounded-lg px-4 py-3 min-h-[72px]"
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
                  {types.map((t) => {
                    const platformName = platform?.name;
                    const isStory = t.name?.toLowerCase() === "story";
                    const isX = platformName?.toLowerCase() === "x";

                    const selected =
                      form.selected_content_by_platform?.[pid]?.[t.id];

                    const canUseCollaborator = selected && !isStory && !isX;

                    return (
                      <div
                        key={t.id}
                        className={`border p-3 rounded-lg space-y-2
                          ${selected ? "border-blue-600 bg-blue-50" : ""}
                        `}
                      >
                        {/* PILIH KONTEN */}
                        <label className="flex gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!selected}
                            disabled={isPosted}
                            onChange={() => handleContentPick(pid, t.id)}
                          />
                          <span>{t.name}</span>
                        </label>

                        {/* COLLABORATOR */}
                        {selected && (
                          <div className="pl-6 text-sm space-y-1">
                            {canUseCollaborator && (
                              <label className="flex gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selected.is_collaborator}
                                  onChange={(e) =>
                                    setForm((prev) => ({
                                      ...prev,
                                      selected_content_by_platform: {
                                        ...prev.selected_content_by_platform,
                                        [pid]: {
                                          ...prev.selected_content_by_platform[pid],
                                          [t.id]: {
                                            ...prev.selected_content_by_platform[pid][t.id],
                                            is_collaborator: e.target.checked,
                                          },
                                        },
                                      },
                                    }))
                                  }
                                />
                                Aktifkan collaborator
                              </label>
                            )}

                            {isStory && (
                              <div className="text-xs text-red-500">
                                Story tidak mendukung collaborator
                              </div>
                            )}

                            {isX && (
                              <div className="text-xs text-red-500">
                                Platform X tidak mendukung collaborator
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {Number(form.status_id) === 4 &&
                Object.entries(form.selected_content_by_platform?.[pid] || {}).map(
                  ([contentTypeId]) => {
                    const contentType = types.find(
                      (t) => String(t.id) === String(contentTypeId)
                    );

                    return (
                      <input
                        key={contentTypeId}
                        type="url"
                        placeholder={`Link ${platform?.name} - ${contentType?.name}`}
                        value={form.content_links?.[pid]?.[contentTypeId] || ""}
                        onChange={(e) =>
                          handleLinkChange(pid, contentTypeId, e.target.value)
                        }
                        className={`${baseInput} mt-3`}
                      />
                    );
                  }
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
            type="text"
            inputMode="numeric"
            name="budget_content"
            value={formatRupiahInput(form.budget_content)}
            onChange={(e) => {
              setForm((prev) => ({
                ...prev,
                budget_content: parseRupiahInput(
                  e.target.value,
                  prev.budget_content
                ),
              }));
            }}
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
          <div className="space-y-4 mt-4">
            {form.platform_ids.map((pid) => {
              const platform = platforms.find((p) => p.id === pid);
              const ads = form.ads_by_platform[pid] || {
                is_ads: false,
                start_date: "",
                end_date: "",
                budget_ads: "",
              };

              return (
                <div key={pid} className="grid md:grid-cols-4 gap-4 border rounded-xl p-4 bg-white shadow-sm">
                  <div className="font-bold">{platform?.name} <span className="text-xs text-slate-500">(opsional)</span></div>

                  {/* Tanggal Mulai Ads */}
                  <div className="mb-3">
                    <label className="block font-bold text-slate-800 mb-1">
                      Tanggal Mulai Ads
                    </label>
                    <input
                      type="date"
                      value={ads.start_date}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          ads_by_platform: {
                            ...p.ads_by_platform,
                            [pid]: { ...ads, start_date: e.target.value },
                          },
                        }))
                      }
                      className={baseInput}
                      min={form.posting_date} // tidak bisa sebelum tanggal konten
                    />
                  </div>

                  {/* Tanggal Selesai Ads */}
                  <div className="mb-3">
                    <label className="block font-bold text-slate-800 mb-1">
                      Tanggal Selesai Ads
                    </label>
                    <input
                      type="date"
                      value={ads.end_date}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          ads_by_platform: {
                            ...p.ads_by_platform,
                            [pid]: { ...ads, end_date: e.target.value },
                          },
                        }))
                      }
                      className={baseInput}
                      min={ads.start_date || form.posting_date} // tidak bisa sebelum start date
                    />
                  </div>

                  {/* Budget Ads */}
                  <div className="mb-3">
                    <label className="block font-bold text-slate-800 mb-1">
                      Budget Ads
                    </label>
                    <input
                      type="number"
                      value={ads.budget_ads}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          ads_by_platform: {
                            ...p.ads_by_platform,
                            [pid]: { ...ads, budget_ads: e.target.value },
                          },
                        }))
                      }
                      className={baseInput}
                      placeholder="Masukkan budget ads"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TOTAL BUDGET */}
        <div className="border rounded-xl p-4 bg-slate-50">
          <div className="text-sm text-slate-500 mb-1">Total Budget</div>
          <div className="text-xl font-bold text-slate-800">
            Rp{" "}
            {(
              Number(form.budget_content || 0) + totalAdsBudget
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
            onClick={() => navigate(`/content/${id}`)}
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