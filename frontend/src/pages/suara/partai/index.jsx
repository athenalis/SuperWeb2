import { useEffect, useMemo, useState } from "react";
import api from "../../../lib/axios";
import MapPartai from "./mapPartai";
import { createPortal } from "react-dom";
import ReactECharts from "echarts-for-react";
import { Icon } from "@iconify/react";

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

  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCityName, setSelectedCityName] = useState("");     // For map filtering (city level)
  const [selectedDistrictName, setSelectedDistrictName] = useState(""); // For map filtering (district level)

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

  /* ======================
     GEOJSON - Load semua 3 level
  ====================== */
  const [geoCity, setGeoCity] = useState(null);
  const [geoDistrict, setGeoDistrict] = useState(null);
  const [geoVillage, setGeoVillage] = useState(null);
  const [geoSeribu, setGeoSeribu] = useState(null);

  useEffect(() => {
    fetch("/data/id31_dki_jakarta.geojson").then((r) => r.json()).then(setGeoCity);
    fetch("/data/district.geojson").then((r) => r.json()).then(setGeoDistrict);
    fetch("/data/id31_dki_jakarta_village.geojson").then((r) => r.json()).then(setGeoVillage);
    fetch("/data/id31_dki_jakarta_kepseribu.geojson").then((r) => r.json()).then(setGeoSeribu);
  }, []);

  /* ======================
     DATA - API Suara
  ====================== */
  const [petaDataKota, setPetaDataKota] = useState([]);
  const [petaDataKecamatan, setPetaDataKecamatan] = useState([]);

  useEffect(() => {
    api.get("/peta/partai/kota").then((res) => setPetaDataKota(res.data.data || []));
    api.get("/peta/partai/kecamatan").then((res) => setPetaDataKecamatan(res.data.data || []));
  }, []);

  /* ======================
     DATA PROCESSING
  ====================== */
  const normalize = (str = "") =>
    str
      .toString()
      .toUpperCase()
      .replace(/[^A-Z]/g, "");

  const suaraKota = useMemo(() => {
    const o = {};
    petaDataKota.forEach((d) => {
      if (!d.city || !d.winner_party) return;
      o[normalize(d.city)] = d;
    });
    return o;
  }, [petaDataKota]);

  const suaraKecamatan = useMemo(() => {
    const o = {};
    petaDataKecamatan.forEach((d) => {
      if (!d.district || !d.winner_party) return;
      o[normalize(d.district)] = d;
    });
    return o;
  }, [petaDataKecamatan]);

  // Build district-to-city mapping from API data
  const districtToCity = useMemo(() => {
    const mapping = {};
    petaDataKecamatan.forEach((d) => {
      if (d.district && d.city) {
        mapping[normalize(d.district)] = normalize(d.city);
      }
    });
    return mapping;
  }, [petaDataKecamatan]);

  const isMapReady =
    geoCity &&
    geoDistrict &&
    (Object.keys(suaraKota).length > 0 ||
      Object.keys(suaraKecamatan).length > 0);

  /* =========================================
     HANDLE MAP CLICK
  ========================================= */
  const handleMapClick = (name, level) => {
    const raw = normalize(name);

    if (level === "kota") {
      // Find city by name and set selectedCity
      const found = cities.find((c) => normalize(c.city) === raw);
      if (found) {
        setSelectedCity(found.city_code);
        setSelectedDistrict("");
        setSelectedCityName(name);
        setSelectedDistrictName(""); // Clear district filter when city is clicked
      }
    } else if (level === "kecamatan") {
      // Find district by name and set selectedDistrict
      const found = districts.find((d) => normalize(d.district) === raw);
      if (found) {
        setSelectedDistrict(found.district_code);
        setSelectedDistrictName(name); // Set for single district highlighting
      }
    }
  };

  /* =========================================
     HANDLE LEVEL CHANGE (zoom out reset)
  ========================================= */
  const handleLevelChange = (level) => {
    // When zoomed out to city level, reset selections
    if (level === "kota") {
      setSelectedCity("");
      setSelectedDistrict("");
      setSelectedCityName("");
      setSelectedDistrictName("");
    }
  };

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
// helper biar warna lebih soft
const soften = (hex = "#94a3b8") => `${hex}CC`;

const echartOption = useMemo(() => ({
  tooltip: {
    trigger: "axis",
    axisPointer: {
      type: "shadow",
      shadowStyle: {
        color: "rgba(0,0,0,0.04)",
      },
    },
    backgroundColor: "#0f172a",
    textStyle: { color: "#fff" },
    padding: [8, 12],
    formatter: (params) => {
      const p = params[0];
      return `
        <div style="font-size:12px;opacity:.8">${p.name}</div>
        <div style="font-size:16px;font-weight:600">
          ${p.value.toLocaleString("id-ID")}
        </div>
      `;
    },
  },

  grid: {
    left: 50,
    right: 20,
    top: 20,
    bottom: 70,
  },

  xAxis: {
    type: "category",
    data: labels,
    axisLabel: {
      interval: 0,
      rotate: 30,
      color: "#64748b",
    },
  },

  yAxis: {
    type: "value",
    axisLabel: {
      formatter: (v) => v.toLocaleString("id-ID"),
      color: "#64748b",
    },
    splitLine: {
      lineStyle: { color: "#e5e7eb" },
    },
  },

  series: [
    {
      type: "bar",
      barMaxWidth: 42,
      emphasis: {
        focus: "series", // ⬅️ BAR LAIN FADED SAAT HOVER
      },
      data: values.map((v, i) => ({
        value: v,
        itemStyle: {
          color: soften(colors[i]),
          borderRadius: [6, 6, 0, 0],
        },
        emphasis: {
          itemStyle: {
            color: colors[i], // hover = solid
          },
        },
      })),
    },
  ],
}), [labels, values, colors]);

  return (
    <div className="space-y-4">

      {/* ================= HEADER & FILTER ================= */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-4 space-y-3">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">
          Perolehan Suara Partai
        </h1>

        <div className="flex flex-col md:flex-row gap-3">

        {/* FILTER KOTA */}
        <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-white">
          <Icon
            icon="mdi:office-building"
            className="text-slate-500 w-5 h-5 shrink-0"
          />
          <select
            className="bg-transparent outline-none flex-1 cursor-pointer text-sm"
            value={selectedCity}
            onChange={(e) => {
              const cityCode = e.target.value;
              setSelectedCity(cityCode);
              setSelectedDistrict("");

              if (cityCode) {
                const found = cities.find(c => c.city_code === cityCode);
                if (found) {
                  setSelectedCityName(found.city);
                  setSelectedDistrictName("");
                }
              } else {
                setSelectedCityName("");
                setSelectedDistrictName("");
              }
            }}
          >
            <option value="">Semua Kab/Kota (DKI)</option>
            {cities.map(c => (
              <option key={c.city_code} value={c.city_code}>
                {c.city}
              </option>
            ))}
          </select>
        </div>

        {/* FILTER KECAMATAN */}
        <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-white">
          <Icon
            icon="mdi:map-marker-outline"
            className="text-slate-500 w-5 h-5 shrink-0"
          />
          <select
            className="bg-transparent outline-none flex-1 cursor-pointer text-sm"
            value={selectedDistrict}
            onChange={(e) => {
              const districtCode = e.target.value;
              setSelectedDistrict(districtCode);

              if (districtCode) {
                const found = districts.find(d => d.district_code === districtCode);
                if (found) {
                  setSelectedDistrictName(found.district);
                }
              } else {
                setSelectedDistrictName("");
              }
            }}
          >
            <option value="">Semua Kecamatan</option>
            {districts.map(d => (
              <option key={d.district_code} value={d.district_code}>
                {d.district}
              </option>
            ))}
          </select>
        </div>

        {/* DETAIL BUTTON */}
        <button
          onClick={() => setShowDetail(true)}
          className="
            border border-blue-600 text-blue-600
            rounded-lg px-4 py-2
            hover:bg-blue-600 hover:text-white
            transition
          "
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
            <ReactECharts
              option={echartOption}
              style={{ width: "100%", height: "100%" }}
            />
            </div>
          )}
        </div>

        {/* MAP */}
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold">
            Peta Sebaran Pemenang Suara Partai
          </div>

          <div className="h-[420px]">
            {isMapReady && (
              <MapPartai
                geoCity={geoCity}
                geoDistrict={geoDistrict}
                geoSeribu={geoSeribu}
                suaraKota={suaraKota}
                suaraKecamatan={suaraKecamatan}
                selectedCityName={selectedCityName}
                selectedDistrictName={selectedDistrictName}
                onRegionClick={handleMapClick}
                onLevelChange={handleLevelChange}
              />
            )}
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
                <thead className="bg-slate-100">
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
