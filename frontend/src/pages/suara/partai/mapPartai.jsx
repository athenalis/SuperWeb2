import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

/* ======================
   UTIL
====================== */
const fmt = (n) => Number(n || 0).toLocaleString("id-ID");


const normalizeKey = (str = "") =>
  str
    .toString()
    .toUpperCase()
    .replace(/KECAMATAN/g, "")
    .replace(/[^A-Z]/g, "");

/* ======================
   SINGKATAN PARTAI
====================== */
const partyAbbr = {
  "Partai Kebangkitan Bangsa": "PKB",
  "Partai Gerakan Indonesia Raya": "GERINDRA",
  "Partai Demokrasi Indonesia Perjuangan": "PDI-P",
  "Partai Golongan Karya": "GOLKAR",
  "Partai Gelombang Rakyat Indonesia": "GELORA",
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
   ALIAS KECAMATAN
====================== */
const DISTRICT_ALIAS_RAW = {
  TANJUNGPRIUK: "TANJUNGPRIOK",
  GROGOLPETAMBURAN: "GROGOLPERTAMBURAN",
};

const DISTRICT_ALIAS = Object.fromEntries(
  Object.entries(DISTRICT_ALIAS_RAW).map(([k, v]) => [
    normalizeKey(k),
    normalizeKey(v),
  ])
);

const getDistrictKey = (name = "") => {
  const raw = normalizeKey(name);
  return DISTRICT_ALIAS[raw] || raw;
};

/* ======================
   AMBIL NAMA DARI GEOJSON
================GEOJSON ISINYA KELURAHAN
====================== */
const getGeoDistrictName = (p = {}) =>
  p.district || p.WADMKC || p.NAMOBJ || p.NAME || "";

export default function MapPartai({ data }) {
  const mapRef = useRef();
  const [geojson, setGeojson] = useState(null);
const districtLayersRef = useRef({});
  /* ======================
     LOAD GEOJSON
  ====================== */
  useEffect(() => {
    fetch("/data/id31_dki_jakarta_district.geojson")
      .then((res) => res.json())
      .then(setGeojson);
  }, []);

  /* ======================
     MAP DATA API
  ====================== */
  const districtData = useMemo(() => {
    const out = {};
    (data || []).forEach((d) => {
      out[getDistrictKey(d.district)] = d;
    });
    return out;
  }, [data]);

  /* ======================
     STYLE POLYGON
  ====================== */
  const styleFeature = ({ properties }) => {
    const key = getDistrictKey(getGeoDistrictName(properties));
    const d = districtData[key];

    return {
      fillColor: d?.winner_color || "#e5e7eb",
      color: "#ffffff",
      weight: 0.5,
      fillOpacity: 0.9,
    };
  };

  /* ======================
     TOOLTIP + HOVER
     (NO SELECT BOX)
  ====================== */
const onEachFeature = (feature, layer) => {
  const name = getGeoDistrictName(feature.properties);
  const key = getDistrictKey(name);
  const d = districtData[key];

  // 🧠 simpan layer per kecamatan
  if (!districtLayersRef.current[key]) {
    districtLayersRef.current[key] = [];
  }
  districtLayersRef.current[key].push(layer);

  let html = `
    <div style="font-family:system-ui;font-size:12px">
      <div style="font-weight:600;margin-bottom:4px">${name}</div>
  `;

  if (d) {
    const winner = d.parties?.find(
      (p) => p.party === d.winner_party
    );

    html += `
      <div style="display:flex;justify-content:space-between;gap:12px">
        <span>${partyAbbr[d.winner_party] || d.winner_party}</span>
        <b>${fmt(winner?.jumlah)} suara</b>
      </div>
    `;
  } else {
    html += `<i style="color:#6b7280">Data tidak tersedia</i>`;
  }

  html += `</div>`;

  layer.bindTooltip(html, {
    sticky: true,
    opacity: 0.95,
  });

  // 🔥 HOVER = SEMUA KELURAHAN DALAM 1 KECAMATAN
  layer.on("mouseover", () => {
    districtLayersRef.current[key]?.forEach((l) => {
      l.setStyle({
        weight: 2,
        color: "#000",
        fillOpacity: 1,
      });
      l.bringToFront();
    });
  });

  layer.on("mouseout", () => {
    districtLayersRef.current[key]?.forEach((l) => {
      l.setStyle(styleFeature(l.feature));
    });
  });
};


  return (
    <div className="relative w-full h-full">
      <MapContainer
        ref={mapRef}
        center={[-6.2, 106.8]}
        zoom={10}
        keyboard={false}
        className="h-full w-full outline-none"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {geojson && (
          <GeoJSON
            key={JSON.stringify(districtData)}
            data={geojson}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>

      {/* ======================
          LEGENDA PARTAI
      ====================== */}
      <div
        className="
          absolute bottom-3 right-3
          bg-white/90 backdrop-blur
          rounded-lg shadow-md
          px-3 py-2 text-[10px]
          z-[500]
        "
      >
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {[
            ["#00764A", "PKB"],
            ["#990001", "GERINDRA"],
            ["#D52027", "PDI-P"],
            ["#FFF051", "GOLKAR"],
            ["#242464", "NASDEM"],
            ["#FF6800", "GELORA"],
            ["#02CCFF", "BURUH"],
            ["#FC5100", "PKS"],
            ["#FE0000", "PKN"],
            ["#EE9B11", "HANURA"],
            ["#01274D", "PAN"],
            ["#0054A3", "PPP"],
            ["#00331C", "PERINDO"],
            ["#004C9A", "PSI"],
            ["#E62128", "UMMAT"],
            ["#243E80", "GARDA"],
            ["#036302", "PBB"],
            ["#000000", "DEMOKRAT"],
          ].map(([c, t]) => (
            <div key={t} className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded"
                style={{ backgroundColor: c }}
              />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
