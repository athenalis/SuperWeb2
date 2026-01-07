import { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Icon } from "@iconify/react";
import axios from "../../../lib/axios";
import { useParams, useNavigate } from "react-router-dom";

/* =========================
   ICON MAPPING
========================= */
const getPlatformIcon = (name) => {
  switch (name.toLowerCase()) {
    case "youtube":
      return "logos:youtube-icon";
    case "tiktok":
      return "logos:tiktok-icon";
    case "instagram":
      return "skill-icons:instagram";
    case "facebook":
      return "logos:facebook";
    case "x":
      return "devicon:twitter";
    default:
      return "mdi:web";
  }
};

const formatDateID = (rawDate, short = false) => {
  if (!rawDate) return "";

  let y, m, d;

  if (rawDate.includes("-")) {
    [y, m, d] = rawDate.split("-");
  } else {
    [d, m, y] = rawDate.split("/");
    y = y.length === 2 ? "20" + y : y;
  }

  return new Date(`${y}-${m}-${d}`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: short ? "short" : "long",
    year: "numeric",
  });
};

export default function AnalyticContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const contentPlanId = id;

  const [platforms, setPlatforms] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState(null);

  const [chartRaw, setChartRaw] = useState({});
  const [reports, setReports] = useState({});
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [chartMeta, setChartMeta] = useState({
    status: "ready",
    message: null,
  });
  const [content, setContent] = useState(null);

  const [form, setForm] = useState({
    date: "",
    views: "",
    likes: "",
  });

  const [errors, setErrors] = useState({
    views: "",
    likes: "",
  });

  const [reportPage, setReportPage] = useState(1);
  const reportPerPage = 5;


  /* =========================
     FETCH ANALYTICS
  ========================= */
  const fetchAnalytics = async () => {
    const res = await axios.get(
      `/content-plans/${contentPlanId}/analytics`
    );

    setPlatforms(res.data.platforms_available || []);
    setChartRaw(res.data.chart || {});
    setReports(res.data.reports || {});
    setContent(res.data.content || null);

    setChartMeta(res.data.chart_meta || {
      status: "ready",
      message: null,
    });

    if (res.data.platforms_available?.length > 0) {
      setSelectedPlatform(res.data.platforms_available[0].platform_id);
    }
  };

  useEffect(() => {
    if (!contentPlanId) return;
    fetchAnalytics();
  }, [contentPlanId]);

  useEffect(() => {
    setReportPage(1);
  }, [selectedPlatform]);


  /* =========================
     CHART DATA (FALLBACK)
  ========================= */
  const chartData = useMemo(() => {
    if (!selectedPlatform) {
      return { labels: [], views: [], likes: [] };
    }

    const source =
      chartRaw?.[selectedPlatform]?.data?.length > 0
        ? chartRaw[selectedPlatform].data
        : reports?.[selectedPlatform]?.data || [];

    return {
      labels: source.map((d) => d.date),
      views: source.map((d) => d.views),
      likes: source.map((d) => d.likes),
    };
  }, [selectedPlatform, chartRaw, reports]);

  const lastRecord = useMemo(() => {
    if (!selectedPlatform) return null;

    const data = reports?.[selectedPlatform]?.data || [];
    if (data.length === 0) return null;

    return data[data.length - 1];
  }, [reports, selectedPlatform]);

  /* =========================
     STATUS CHECK
  ========================= */
  const isNotPosted =
    content &&
    content.status_label?.trim().toLowerCase() !== "diposting";

  const hasNoData =
    chartData.labels.length === 0 &&
    chartData.views.length === 0 &&
    chartData.likes.length === 0;

  const isDisabled = isNotPosted;

  /* =========================
     VALIDATION
  ========================= */
  const validateInput = (name, value) => {
    if (!lastRecord) return "";

    // ⬅️ INI PENTING
    if (value === "") return "";

    if (name === "views" && Number(value) < lastRecord.views) {
      return "Jumlah Views tidak boleh kurang dari jumlah sebelumnya";
    }

    if (name === "likes" && Number(value) < lastRecord.likes) {
      return "Jumlah Likes tidak boleh kurang dari jumlah sebelumnya";
    }

    return "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    const errorMsg = validateInput(name, value);

    setErrors((prev) => ({
      ...prev,
      [name]: errorMsg,
    }));
  };

  /* =========================
     SUBMIT
  ========================= */
  const handleSubmit = async () => {
    if (!form.date || !form.views || !form.likes) return;

    if (errors.views || errors.likes) {
      alert("Periksa kembali data yang dimasukkan");
      return;
    }

    await axios.post(
      `/content-plans/${contentPlanId}/analytics/record`,
      {
        platform_id: selectedPlatform,
        recorded_at: form.date,
        views: Number(form.views),
        likes: Number(form.likes),
      }
    );

    setForm({ date: "", views: "", likes: "" });
    setErrors({ views: "", likes: "" });
    fetchAnalytics();
  };

  /* =========================
     TREND CALCULATION
  ========================= */
  const getTrendDiff = (data, index, key) => {
    if (index === 0) return null;

    // selisih hari ini
    const currentDelta =
      data[index][key] - data[index - 1][key];

    // hari ke-2 masih banding ke hari pertama
    if (index === 1) {
      return {
        diff: currentDelta,
        isUp: currentDelta >= 0,
      };
    }

    // selisih hari sebelumnya
    const prevDelta =
      data[index - 1][key] - data[index - 2][key];

    return {
      diff: currentDelta,
      isUp: currentDelta >= prevDelta,
    };
  };

  const formatDateShort = (dateStr) => {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  /* =========================
   CHART OPTION
========================= */
  const option = useMemo(() => {
    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "#0f172a",
        borderRadius: 10,
        padding: [10, 14],
        textStyle: {
          color: "#e5e7eb",
          fontSize: 12,
          fontWeight: 500,
        },
        extraCssText: "box-shadow: 0 10px 25px rgba(0,0,0,0.35);",

        formatter: (params) => {
          // ===== Format tanggal Indonesia =====
          const rawDate = params[0].axisValue;
          let y, m, d;

          if (rawDate.includes("-")) {
            [y, m, d] = rawDate.split("-");
          } else {
            [d, m, y] = rawDate.split("/");
            y = "20" + y;
          }

          const dateLabel = new Date(`${y}-${m}-${d}`).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });

          let html = `
          <div style="margin-bottom:6px; font-weight:600;">
            ${dateLabel}
          </div>
        `;

          params.forEach(p => {
            const dotColor = p.seriesName === "Views"
              ? "#3b82f6"
              : "#ef4444";

            html += `
            <div style="display:flex; align-items:center; gap:8px; margin:4px 0;">
              <span style="
                width:8px;
                height:8px;
                border-radius:50%;
                background:${dotColor};
                display:inline-block;
              "></span>

              <span style="min-width:48px;">
                ${p.seriesName}
              </span>

              <span style="font-weight:600; margin-left:auto;">
                ${Number(p.value).toLocaleString("id-ID")}
              </span>
            </div>
          `;
          });
          return html;
        }
      },

      grid: { left: 60, right: 30, top: 40, bottom: 40 },

      xAxis: {
        type: "category",
        data: chartData.labels,
        boundaryGap: false,
        axisLabel: {
          color: "#28282B",
          formatter: (value) => formatDateShort(value),
        },
      },

      yAxis: {
        type: "value",
        scale: true,
        minInterval: 1,
        axisLabel: {
          color: "#28282B",
          formatter: (v) => {
            if (v >= 1_000_000) return v / 1_000_000 + "M";
            if (v >= 1_000) return v / 1_000 + "K";
            return v;
          },
        },
        splitLine: { lineStyle: { color: "#e5e7eb" } },
      },

      series: [
        {
          name: "Views",
          type: "line",
          smooth: true,
          data: chartData.views,
          symbol: "none",
          lineStyle: { color: "#ef4444", width: 3 },
          areaStyle: { color: "rgba(239,68,68,0.2)" },
        },
        {
          name: "Likes",
          type: "line",
          smooth: true,
          data: chartData.likes,
          symbol: "none",
          lineStyle: { color: "#3b82f6", width: 3 },
          areaStyle: { color: "rgba(59,130,246,0.2)" },
        },
      ],
    };
  }, [chartData]);

  const activePlatform = useMemo(() => {
    return platforms.find(
      (p) => p.platform_id === selectedPlatform
    );
  }, [platforms, selectedPlatform]);

  const handleUpdate = async () => {
    if (!editData?.id) {
      alert("ID data tidak ditemukan");
      return;
    }

    setSaving(true);

    await axios.put(
      `/content-plans/${contentPlanId}/analytics/record/${editData.id}`,
      {
        recorded_at: editData.date,      // 🗓️ sekarang editable
        views: Number(editData.views),
        likes: Number(editData.likes),
      }
    );

    setSaving(false);
    setIsEditOpen(false);
    fetchAnalytics();
  };

  const hasInvalidMetric =
    Boolean(errors.views) || Boolean(errors.likes);

  const reportData = reports[selectedPlatform]?.data || [];

  const paginatedReport = useMemo(() => {
    const start = (reportPage - 1) * reportPerPage;
    return reportData.slice(start, start + reportPerPage);
  }, [reportData, reportPage]);

  const reportTotalPage = Math.max(
    1,
    Math.ceil(reportData.length / reportPerPage)
  );


  if (content && isNotPosted) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-center gap-5">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-700">
            Data Tidak Ditemukan
          </h2>
          <p className="text-slate-500 text-base">
            Konten ini belum diposting sehingga belum memiliki data analitik
          </p>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="mt-3 px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
        >
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-4 space-y-6">

      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl border border-slate-300 flex items-center justify-center hover:bg-slate-100"
          >
            <Icon icon="mdi:arrow-left" />
          </button>

          <h3 className="font-semibold text-lg">
            Analisis Konten
            {content?.title && (
              <span className="text-slate-500 font-semibold">
                {" "}{content.title}
              </span>
            )}
          </h3>
        </div>

        <div className="flex gap-2">
          {platforms.map((p) => (
            <button
              key={p.platform_id}
              onClick={() => setSelectedPlatform(p.platform_id)}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center
                ${selectedPlatform === p.platform_id
                  ? "border-slate-500 shadow-md"
                  : "border-slate-300 opacity-60 hover:opacity-100"
                }`}
            >
              <Icon
                icon={getPlatformIcon(p.platform_name)}
                className="text-xl"
              />
            </button>
          ))}
        </div>
      </div>

      {/* ===== CHART ===== */}
      {chartMeta.status === "empty" ? (
        <div className="h-[360px] flex items-center justify-center text-slate-500">
          {chartMeta.message}
        </div>
      ) : (
        <ReactECharts
          option={option}
          style={{ height: 360 }}
          notMerge
          lazyUpdate
        />
      )}

      {/* ===== INPUT ===== */}
      <div
        className={`rounded-xl border p-4
    ${isDisabled
            ? "bg-slate-100 border-slate-200 opacity-60"
            : "bg-slate-50 border-slate-200"
          }`}
      >
        {activePlatform && (
          <div className="flex items-center gap-3 mb-5">
            <Icon
              icon={getPlatformIcon(activePlatform.platform_name)}
              className="text-xl"
            />
            <h4 className="font-semibold">
              Tambah Data Konten{" "}
              <span className="font-semibold">
                {activePlatform.platform_name}
              </span>
            </h4>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">

          {/* TANGGAL */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Tanggal</label>

            <input
              type="date"
              name="date"
              disabled={isDisabled}
              className="border rounded-lg px-3 h-[42px]"
              value={form.date}
              onChange={handleChange}
            />

            <span className="text-xs min-h-[16px] text-transparent">placeholder</span>
          </div>

          {/* VIEWS */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">
              Jumlah Views
            </label>

            <input
              type="number"
              name="views"
              disabled={isDisabled}
              className="border rounded-lg px-3 h-[42px]"
              value={form.views}
              placeholder="Jumlah views saat ini"
              onChange={handleChange}
            />

            <span className="text-xs min-h-[16px] text-transparent">placeholder</span>
          </div>

          {/* LIKES */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">
              Jumlah Likes
            </label>

            <input
              type="number"
              name="likes"
              disabled={isDisabled}
              className="border rounded-lg px-3 h-[42px]"
              value={form.likes}
              placeholder="Jumlah likes saat ini"
              onChange={handleChange}
            />

            <span className="text-xs min-h-[16px] text-transparent">placeholder</span>
          </div>

          {/* BUTTON */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-transparent">Action</label>

            <button
              disabled={isDisabled || hasInvalidMetric}
              onClick={handleSubmit}
              className="h-[42px] bg-blue-900 text-white rounded-lg px-4 hover:bg-blue-800 disabled:opacity-50"
            >
              Tambah
            </button>

            <span className="text-xs min-h-[16px] text-transparent">placeholder</span>
          </div>

        </div>

        <p className="mt-2 text-xs text-red-500">
          * Jumlah Views atau Likes tidak boleh kurang dari jumlah sebelumnya
        </p>
      </div>

      {/* ===== TABLE REPORT ===== */}
      {selectedPlatform && reports[selectedPlatform] && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-100 px-4 py-3 font-semibold">
            Report – {reports[selectedPlatform].platform_name}
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Tanggal</th>
                <th className="px-4 py-2 text-left">Views</th>
                <th className="px-4 py-2 text-left">Likes</th>
                <th className="px-4 py-2 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReport.map((row, i) => {
                const globalIndex = (reportPage - 1) * reportPerPage + i;

                const viewsTrend = getTrendDiff(reportData, globalIndex, "views");
                const likesTrend = getTrendDiff(reportData, globalIndex, "likes");
                return (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-2 text-left">{formatDateID(row.date)}</td>

                    {/* ===== VIEWS ===== */}
                    <td className="px-4 py-2 text-left">
                      <div className="flex items-center gap-2">
                        <span>{row.views.toLocaleString("id-ID")}</span>

                        {viewsTrend && (
                          <span
                            className={`flex items-center gap-1 text-xs font-medium ${viewsTrend.isUp
                              ? "text-green-600"
                              : "text-red-500"
                              }`}
                          >
                            <Icon
                              icon={
                                viewsTrend.isUp
                                  ? "mdi:arrow-up-bold"
                                  : "mdi:arrow-down-bold"
                              }
                            />
                            {Math.abs(viewsTrend.diff).toLocaleString("id-ID")}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* ===== LIKES ===== */}
                    <td className="px-4 py-2 text-left">
                      <div className="flex items-center gap-2">
                        <span>{row.likes.toLocaleString("id-ID")}</span>

                        {likesTrend && (
                          <span
                            className={`flex items-center gap-1 text-xs font-medium ${likesTrend.isUp
                              ? "text-green-600"
                              : "text-red-500"
                              }`}
                          >
                            <Icon
                              icon={
                                likesTrend.isUp
                                  ? "mdi:arrow-up-bold"
                                  : "mdi:arrow-down-bold"
                              }
                            />
                            {Math.abs(likesTrend.diff).toLocaleString("id-ID")}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-2">
                      <button
                        onClick={() => {
                          console.log("ROW DATA:", row);

                          setEditData({
                            id: row.record_id,
                            date: row.date,
                            views: row.views,
                            likes: row.likes
                          });

                          setIsEditOpen(true);
                        }}
                        className="p-2 rounded-lg hover:bg-slate-100"
                      >
                        <Icon icon="solar:pen-outline" width={20} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {reports[selectedPlatform].data.length === 0 && (
                <tr>
                  <td colSpan="3" className="p-0">
                    <div className="h-24 flex items-center justify-center text-slate-500">
                      Belum Ada Data
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {reportTotalPage > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
              <span className="text-slate-500">
                Halaman {reportPage} dari {reportTotalPage}
              </span>

              <div className="flex gap-2">
                <button
                  disabled={reportPage === 1}
                  onClick={() => setReportPage((p) => p - 1)}
                  className="px-3 py-1 border rounded-lg disabled:opacity-50"
                >
                  Prev
                </button>

                {Array.from({ length: reportTotalPage }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setReportPage(p)}
                    className={`px-3 py-1 border rounded-lg ${p === reportPage
                        ? "bg-slate-900 text-white"
                        : "hover:bg-slate-100"
                      }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  disabled={reportPage === reportTotalPage}
                  onClick={() => setReportPage((p) => p + 1)}
                  className="px-3 py-1 border rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isEditOpen && editData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl w-[380px] p-6 space-y-4 shadow-xl">

            <h3 className="font-semibold text-lg">Edit Data</h3>

            <div className="space-y-3">
              <div>
                <label className="text-sm">Tanggal</label>
                <input
                  type="date"
                  value={editData.date}
                  onChange={(e) =>
                    setEditData({ ...editData, date: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 h-[42px]"
                />
              </div>

              <div>
                <label className="text-sm">Views</label>
                <input
                  type="number"
                  value={editData.views}
                  onChange={(e) =>
                    setEditData({ ...editData, views: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 h-[42px]"
                />
              </div>

              <div>
                <label className="text-sm">Likes</label>
                <input
                  type="number"
                  value={editData.likes}
                  onChange={(e) =>
                    setEditData({ ...editData, likes: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 h-[42px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 rounded-lg border hover:bg-slate-100"
              >
                Batal
              </button>

              <button
                disabled={saving}
                onClick={handleUpdate}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
