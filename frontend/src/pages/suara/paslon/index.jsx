import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import api from "../../../lib/axios";
import PetaSuaraMap  from "./mapPaslon";
import { createPortal } from "react-dom";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const normalize = (str = "") =>
  str.toUpperCase().replace(/\s+/g, " ").replace(/[.,]/g, "").trim();

export default function PaslonIndex() {
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);

  const [selectedCityCode, setSelectedCityCode] = useState("");
  const [selectedDistrictCode, setSelectedDistrictCode] = useState("");
  const [mapLevel, setMapLevel] = useState("city");

  const [chartRows, setChartRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showDetail, setShowDetail] = useState(false);

  const [petaData, setPetaData] = useState([]);
  const [geoCity, setGeoCity] = useState(null);
  const [geoVillage, setGeoVillage] = useState(null);
  const [geoSeribu, setGeoSeribu] = useState(null);
  const [geoDistrict, setGeoDistrict] = useState(null);

  /* LOAD CITIES */
  useEffect(() => {
    api.get("/wilayah/cities/31")
      .then(res => setCities(res.data || []))
      .catch(() => setCities([]));
  }, []);

  /* LOAD DISTRICTS */
  useEffect(() => {
    if (!selectedCityCode) {
      setDistricts([]);
      return;
    }

    api.get(`/wilayah/districts/${selectedCityCode}`)
      .then(res => setDistricts(res.data || []))
      .catch(() => setDistricts([]));
  }, [selectedCityCode]);

  /* LOAD CHART */
  useEffect(() => {
    setLoading(false);

    const params = {};
    if (selectedCityCode) params.city_code = selectedCityCode;
    if (selectedDistrictCode) params.district_code = selectedDistrictCode;

    api.get("/suara/diagram-paslon", { params })
      .then(res => setChartRows(res.data || []))
      .catch(() => setChartRows([]))
      .finally(() => setLoading(false));
  }, [selectedCityCode, selectedDistrictCode]);

  const labels = useMemo(
    () => chartRows.map(r => r.city || r.district || r.village),
    [chartRows]
  );

  const chartData = {
    labels,
    datasets: [
      { label: "Paslon 01", data: chartRows.map(r => r.paslon_01 || 0), backgroundColor: "#FFD100" },
      { label: "Paslon 02", data: chartRows.map(r => r.paslon_02 || 0), backgroundColor: "#16a34a" },
      { label: "Paslon 03", data: chartRows.map(r => r.paslon_03 || 0), backgroundColor: "#C40000" },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } },
    scales: { y: { beginAtZero: true } },
  };

  /* GEOJSON */
useEffect(() => {
  Promise.all([
    fetch("/data/id31_dki_jakarta.geojson").then(r => r.json()),
    fetch("/data/district.geojson").then(r => r.json()),
    fetch("/data/id31_dki_jakarta_village.geojson").then(r => r.json()),
  ]).then(([city, district, village, seribu]) => {
    setGeoCity(city);
    setGeoDistrict(district);
    setGeoVillage(village);
    setGeoSeribu(seribu);
  });
}, []);

const isMapReady =
  geoCity &&
  geoDistrict &&
  geoVillage &&
  geoCity.features?.length > 0;

  return (
    <div className="space-y-4">

      {/* HEADER & FILTER */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-4 space-y-3">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">
          Perolehan Suara Gubernur
        </h1>

        <div className="flex flex-col md:flex-row gap-3">
          <select
            className="border rounded-lg px-4 py-2"
            value={selectedCityCode}
            onChange={(e) => setSelectedCityCode(e.target.value)}
          >
            <option value="">Semua Kab/Kota (DKI)</option>
            {cities.map(c => (
              <option key={c.city_code} value={c.city_code}>{c.city}</option>
            ))}
          </select>

          <select
            className="border rounded-lg px-4 py-2"
            value={selectedDistrictCode}
            onChange={(e) => setSelectedDistrictCode(e.target.value)}
          >
            <option value="">Semua Kecamatan</option>
            {districts.map(d => (
              <option key={d.district_code} value={d.district_code}>{d.district}</option>
            ))}
          </select>

          <button
            onClick={() => setShowDetail(true)}
            className="border border-blue-600 text-blue-600 rounded-lg px-4 py-2
                       hover:bg-blue-600 hover:text-white transition"
          >
            Detail
          </button>
        </div>
      </div>

      {/* ================= GRID CHART + MAP ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* CHART */}
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-4 h-[500px] flex flex-col">
          <h3 className="font-semibold mb-2">Rekapitulasi Suara Paslon</h3>

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
            Peta Sebaran Pemenang Paslon
          </div>

          <div className="h-[420px]">
            {isMapReady && (
              <PetaSuaraMap
                apiBase={import.meta.env.VITE_API_URL}
                geoCity={geoCity}
                geoDistrict={geoDistrict}
                geoVillage={geoVillage}
                geoSeribu={geoSeribu}
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

            <div className="relative bg-white w-full max-w-4xl max-h-[80vh]
                            rounded-2xl shadow-2xl p-6 overflow-auto z-10">
              <h2 className="text-lg font-semibold mb-4">
                Detail Perolehan Suara
              </h2>

              <table className="w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">Wilayah</th>
                    <th className="px-4 py-2 text-center">01</th>
                    <th className="px-4 py-2 text-center">02</th>
                    <th className="px-4 py-2 text-center">03</th>
                  </tr>
                </thead>
                <tbody>
                  {chartRows.map((r, i) => (
                    <tr key={i} className="border-t text-center">
                      <td className="px-4 py-2 text-left">
                        {r.city || r.district || r.village}
                      </td>
                      <td className="px-4 py-2">{r.paslon_01}</td>
                      <td className="px-4 py-2">{r.paslon_02}</td>
                      <td className="px-4 py-2 font-semibold">{r.paslon_03}</td>
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
