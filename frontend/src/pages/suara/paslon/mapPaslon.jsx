import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import api from "../../../lib/axios";

/* ===================== */
/*  UTIL                 */
/* ===================== */
const fmt = (n) => Number(n || 0).toLocaleString("id-ID");

const normalizeKey = (str = "") =>
  str.toString().toUpperCase().replace(/[^A-Z0-9]/g, "");

/* ===================== */
/*  ALIAS FIX DKI        */
/* ===================== */
export const CITY_ALIAS_RAW = {
  // Jakarta
  KOTAADMJAKARTABARAT: "JAKARTABARAT",
  KOTAADMJAKARTAPUSAT: "JAKARTAPUSAT",
  KOTAADMJAKARTASELATAN: "JAKARTASELATAN",
  KOTAADMJAKARTATIMUR: "JAKARTATIMUR",
  KOTAADMJAKARTAUTARA: "JAKARTAUTARA",

  // Kepulauan Seribu (SEMUA VARIASI → SATU)
  KABADMKEPSERIBU: "KEPULAUANSERIBU",
  KABUPATENADMKEPULAUANSERIBU: "KEPULAUANSERIBU",
  ADMKEPSERIBU: "KEPULAUANSERIBU",
  KEPULAUANSERIBU: "KEPULAUANSERIBU",
};


export const normalizeCityName = (name = "") => {
  const key = name
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/\./g, "");

  return CITY_ALIAS_RAW[key] || key;
};

const CITY_ALIAS = Object.fromEntries(
  Object.entries(CITY_ALIAS_RAW).map(([k, v]) => [
    normalizeKey(k),
    normalizeKey(v),
  ])
);

const getCityKey = (name = "") => {
  const raw = normalizeKey(name);
  return CITY_ALIAS[raw] || raw;
};

const VILLAGE_ALIAS_RAW = {
  HALIMPERDANAKUSUMAH: "HALIMPERDANAKUSUMA",
  PAPANGO: "PAPANGGO",
  PALMERIEM: "PALMERIAM",
  TANJUNGPRIUK: "TANJUNGPRIOK",
  WIJAYAKESUMA: "WIJAYAKUSUMA",
  HARAPANMULYA: "HARAPANMULIA",
  PREPEDAN: "TEGALALUR",
  KAMPUNGTENGAH: "TENGAH",
};

const VILLAGE_ALIAS = Object.fromEntries(
  Object.entries(VILLAGE_ALIAS_RAW).map(([k, v]) => [
    normalizeKey(k),
    normalizeKey(v),
  ])
);

const getVillageKey = (name = "") => {
  const raw = normalizeKey(name);
  return VILLAGE_ALIAS[raw] || raw;
};

const getWinnerColor = (d) => d?.winner_color || "#e5e7eb";

/* ===================== */
/*  ZOOM WATCHER         */
/* ===================== */
function ZoomWatcher({ onChange }) {
  const map = useMap();

  useEffect(() => {
    const handler = () => {
      const z = map.getZoom();
      if (z <= 10) onChange("kota");
      else if (z <= 12) onChange("kecamatan");
      else onChange("kelurahan");
    };

    handler();
    map.on("zoomend", handler);
    return () => map.off("zoomend", handler);
  }, [map, onChange]);

  return null;
}

/* ===================== */
/*  MAIN COMPONENT       */
/* ===================== */
export default function MapPaslon({
  geoCity,
  geoDistrict,
  geoVillage,
}) {
  const mapRef = useRef();
  const [level, setLevel] = useState("kota");
  const [rows, setRows] = useState([]);

  /* ===================== */
  /*  ENDPOINT             */
  /* ===================== */
  const endpoint = useMemo(() => {
    if (level === "kota") return "/peta/paslon/kota";
    if (level === "kecamatan") return "/peta/paslon/kecamatan";
    return "/peta/paslon/kelurahan";
  }, [level]);

  /* ===================== */
  /*  FETCH DATA           */
  /* ===================== */
  useEffect(() => {
    api
      .get(endpoint)
      .then((res) => {
        console.log("API RESPONSE:", res.data);
        setRows(res.data?.data || []);
      })
      .catch((err) => {
        console.error(
          "API ERROR:",
          err.response?.status,
          err.response?.data || err.message
        );
        setRows([]);
      });
  }, [endpoint]);

  /* ===================== */
  /*  INDEX VOTE DATA      */
  /* ===================== */
  const voteMap = useMemo(() => {
    const out = {};
    rows.forEach((r) => {
      if (level === "kota") out[getCityKey(r.city)] = r;
      else if (level === "kecamatan") out[normalizeKey(r.district)] = r;
      else out[getVillageKey(r.village)] = r;
    });
    return out;
  }, [rows, level]);

  /* ===================== */
  /*  GEO DATA             */
  /* ===================== */
  const geoData =
    level === "kota"
      ? geoCity
      : level === "kecamatan"
      ? geoDistrict
      : geoVillage;

  const getGeoName = (p = {}) => {
    if (level === "kota") return p.NAMOBJ || p.WADMKK || "";
    if (level === "kecamatan") return p.WADMKC || p.NAMOBJ || "";
    return p.WADMKD || p.NAMOBJ || "";
  };

  /* ===================== */
  /*  STYLE                */
  /* ===================== */
  const styleFeature = ({ properties }) => {
    const name = getGeoName(properties);
    const key =
      level === "kota"
        ? getCityKey(name)
        : level === "kelurahan"
        ? getVillageKey(name)
        : normalizeKey(name);

    const d = voteMap[key];

    return {
      fillColor: d ? getWinnerColor(d) : "#e5e7eb",
      color: "#ffffff",
      weight: 0.6,
      fillOpacity: 0.85,
    };
  };

  /* ===================== */
  /*  TOOLTIP              */
  /* ===================== */
  const onEachFeature = (feature, layer) => {
    const name = getGeoName(feature.properties);
    const key =
      level === "kota"
        ? getCityKey(name)
        : level === "kelurahan"
        ? getVillageKey(name)
        : normalizeKey(name);

    const d = voteMap[key];

    let html = `<strong>${name}</strong>`;
    if (d) {
      html += `
        <hr/>
        <div>Paslon 01: <b>${fmt(d.suara.paslon_01)}</b></div>
        <div>Paslon 02: <b>${fmt(d.suara.paslon_02)}</b></div>
        <div>Paslon 03: <b>${fmt(d.suara.paslon_03)}</b></div>
      `;
    } else {
      html += `<div><i>Data tidak tersedia</i></div>`;
    }

    layer.bindTooltip(html, { sticky: true });
  };

  /* ===================== */
  /*  RENDER               */
  /* ===================== */
  return (
    <div className="relative w-full h-full">
      <MapContainer
        ref={mapRef}
        center={[-6.2, 106.8]}
        zoom={10}
        className="w-full h-full"
      >
        <ZoomWatcher onChange={setLevel} />

        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <GeoJSON
          key={level}
          data={geoData}
          style={styleFeature}
          onEachFeature={onEachFeature}
        />
      </MapContainer>

      <div className="absolute top-4 right-4 bg-white px-3 py-2 rounded shadow text-xs">
        Menampilkan: <b>{level.toUpperCase()}</b>
      </div>
    </div>
  );
}
