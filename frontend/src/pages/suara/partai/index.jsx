import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import api from "../../../lib/axios";
import MapPartai from "./mapPartai";
import { createPortal } from "react-dom";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

/* ======================
   SINGKATAN PARTAI
====================== */
const partyAbbr = {
  "Partai Kebangkitan Bangsa": "PKB",
  "Partai Gerakan Indonesia Raya": "GERINDRA",
  "Partai Demokrasi Indonesia Perjuangan": "PDI-P",
  "Partai Golongan Karya": "GOLKAR",
  "Partai Gelombang Rakyat Indonesia": "Gelora",
  "Partai NasDem": "NASDEM",
  "Partai Buruh": "BURUH",
  "Partai Keadilan Sejahtera": "PKS",
  "Partai Kebangkitan Nusantara": "PKN",
  "Partai Hati Nurani Rakyat": "HANURA",
  "Partai Amanat Nasional": "PAN",
  "Partai Persatuan Pembangunan": "PPP",
  "PARTAI PERINDO": "PERINDO",
  "Partai Solidaritas Indonesia": "PSI",
  "Partai Ummat": "UMMAT",
  "Partai Garda Republik Indonesia": "GARDA",
  "Partai Bulan Bintang": "PBB",
  "Partai Demokrat": "DEMOKRAT",
};

/* ======================
   WARNA PARTAI
====================== */
const partyColors = {
  "100001": "#00764A",
  "100002": "#990001",
  "100003": "#D52027",
  "100004": "#FFF051",
  "100005": "#242464",
  "100006": "#FF6800",
  "100007": "#02CCFF",
  "100008": "#FC5100",
  "100009": "#FE0000",
  "100010": "#EE9B11",
  "100011": "#01274D",
  "100012": "#0054A3",
  "100013": "#00331C",
  "100014": "#004C9A",
  "100015": "#E62128",
  "100016": "#243E80",
  "100017": "#036302",
  "100024": "#000000",
};



export default function PartaiIndex() {
  /* ======================
     STATE DROPDOWN
  ====================== */
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [data, setData] = useState([]);

  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");

  /* ======================
     STATE DATA
  ====================== */
  const [chartRows, setChartRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);

  /* ======================
     LOAD CITIES
  ====================== */
  useEffect(() => {
    api.get("/wilayah/cities/31")
      .then(res => setCities(res.data || []))
      .catch(() => setCities([]));
  }, []);

  /* ======================
     LOAD DISTRICTS
  ====================== */
  useEffect(() => {
    if (!selectedCity) {
      setDistricts([]);
      return;
    }

    api.get(`/wilayah/districts/${selectedCity}`)
      .then(res => setDistricts(res.data || []))
      .catch(() => setDistricts([]));
  }, [selectedCity]);

  /* ======================
     LOAD CHART DATA
  ====================== */
  useEffect(() => {
    setLoading(false);

    api.get("/suara/diagram-partai", {
      params: {
        city_code: selectedCity || undefined,
        district_code: selectedDistrict || undefined,
      },
    })
      .then(res => {
        const rows = Array.isArray(res.data) ? res.data : [];
        rows.sort((a, b) => a.total_suara - b.total_suara);
        setChartRows(rows);
      })
      .finally(() => setLoading(false));
  }, [selectedCity, selectedDistrict]);

useEffect(() => {
  api.get("/peta/partai/kecamatan").then((res) => {
    console.log("API RESPONSE:", res.data);

    // ⬇️ AMAN UNTUK SEMUA FORMAT
    setData(Array.isArray(res.data) ? res.data : res.data.data ?? []);
  });
}, []);

  /* ======================
     CHART PREP
  ====================== */
  const labels = useMemo(
    () => chartRows.map(r => partyAbbr[r.party] || r.party),
    [chartRows]
  );

  const values = useMemo(
    () => chartRows.map(r => r.total_suara),
    [chartRows]
  );

  const colors = useMemo(
    () => chartRows.map(
      r => partyColors[String(r.party_code)] || "#94a3b8"
    ),
    [chartRows]
  );

  const chartData = {
    labels,
    datasets: [{ data: values, backgroundColor: colors }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${ctx.label}: ${ctx.raw.toLocaleString("id-ID")}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: v => v.toLocaleString("id-ID") },
      },
    },
  };

  return (
    <div className="space-y-4">

      {/* ================= HEADER & FILTER ================= */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-4 space-y-3">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">
          Perolehan Suara Partai
        </h1>

        <div className="flex flex-col md:flex-row gap-3">
          <select
            className="border rounded-lg px-4 py-2"
            value={selectedCity}
            onChange={(e) => {
              setSelectedCity(e.target.value);
              setSelectedDistrict("");
            }}
          >
            <option value="">Semua Kab/Kota (DKI)</option>
            {cities.map(c => (
              <option key={c.city_code} value={c.city_code}>
                {c.city}
              </option>
            ))}
          </select>

          <select
            className="border rounded-lg px-4 py-2"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
          >
            <option value="">Semua Kecamatan</option>
            {districts.map(d => (
              <option key={d.district_code} value={d.district_code}>
                {d.district}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowDetail(true)}
            className="border border-blue-600 text-blue-600 rounded-lg px-4 py-2
                       hover:bg-blue-600 hover:text-white transition md:ml-auto"
          >
            Detail
          </button>
        </div>
      </div>

      {/* ================= GRID CHART + MAP ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* CHART */}
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-4 h-[500px] flex flex-col">
          <h3 className="font-semibold mb-2">
            Rekapitulasi Suara Partai
          </h3>

          {loading ? (
            <div className="text-center text-slate-500 mt-10">
              Memuat chart…
            </div>
          ) : (
            <div className="flex-1">
              <Bar data={chartData} options={chartOptions} />
            </div>
          )}
        </div>

        {/* MAP */}
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold">
            Peta Sebaran Pemenang Suara Partai
          </div>

          <div className="h-[400px]">
            <MapPartai data={data} />
          </div>
        </div>
      </div>

      {/* ================= MODAL DETAIL ================= */}
      {showDetail &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowDetail(false)}
            />

            <div className="relative bg-white w-full max-w-3xl max-h-[80vh]
                            rounded-2xl shadow-2xl p-6 overflow-auto z-10">
              <h2 className="text-lg font-semibold mb-4">
                Detail Perolehan Suara Partai
              </h2>

              <table className="w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">Partai</th>
                    <th className="px-4 py-2 text-right">Total Suara</th>
                  </tr>
                </thead>
                <tbody>
                  {chartRows.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2">{row.party}</td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {row.total_suara.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowDetail(false)}
                  className="px-5 py-2 rounded-lg bg-blue-900 text-white hover:bg-blue-800"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>,
          document.getElementById("modal-root")
        )
      }
    </div>
  );
}
