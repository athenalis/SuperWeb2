import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { useEffect, useMemo, useRef } from "react";
import "leaflet/dist/leaflet.css";

const fmt = n => Number(n || 0).toLocaleString("id-ID");

const normalizeKey = (str = "") =>
  str
    .toString()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");


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

export default function KelurahanMap({
  geoVillage,
  geoSeribu,
  suaraKelurahan,
}) {
  const mapRef = useRef();

  const villageVotes = useMemo(() => {
    const out = {};
    Object.entries(suaraKelurahan || {}).forEach(([name, vote]) => {
      out[getVillageKey(name)] = vote;
    });
    return out;
  }, [suaraKelurahan]);

  useEffect(() => {
    console.log("🔍 SAMPLE DB:", Object.entries(villageVotes)[0]);
  }, [villageVotes]);

  const getWinnerColor = ({ paslon_01 = 0, paslon_02 = 0, paslon_03 = 0 }) => {
    const max = Math.max(paslon_01, paslon_02, paslon_03);
    if (max === paslon_01) return "#FFD100";
    if (max === paslon_02) return "#16a34a";
    return "#C40000";
  };

  const getGeoVillageName = (properties = {}) => {
    return (
      properties.village ||
      properties.NAMOBJ ||
      properties.WADMKD ||
      properties.NAME ||
      ""
    );
  };

  const getKelurahanData = (name = "") => {
    const key = getVillageKey(name);
    return villageVotes[key] || null;
  };


  const styleFeature = ({ properties }) => {
    const name = getGeoVillageName(properties);
    const data = getKelurahanData(name);

    return {
      fillColor: data ? getWinnerColor(data) : "#e5e7eb",
      color: "#ffffff",
      weight: 0.4,
      fillOpacity: 0.85,
    };
  };


const onEachFeature = (feature, layer) => {
  const p = feature.properties;
  const name = p.village || p.NAMOBJ || p.WADMKD || "Unknown";
  const key = getVillageKey(name);
  const v = villageVotes[key];

  let html = `
    <div style="
      font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 12px;
      min-width: 200px;
    ">
      <div style="
        font-weight: 600;
        font-size: 13px;
        margin-bottom: 6px;
      ">
        ${name}
      </div>
  `;

  if (v) {
    html += `
      <div style="
        border-top: 1px solid #e5e7eb;
        padding-top: 6px;
        line-height: 1.5;
      ">
        ${[
          ["#FFD100", "Ridwan Kamil – Suswono", v.paslon_01],
          ["#16a34a", "Dharma Pongrekun – Kun Wardana Abyoto", v.paslon_02],
          ["#C40000", "Pramono Anung Wibowo – Rano Karno", v.paslon_03],
        ]
          .map(
            ([color, label, value]) => `
              <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 4px;
              ">
                <div style="
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  color: #374151;
                ">
                  <span style="
                    width: 8px;
                    height: 8px;
                    border-radius: 999px;
                    background: ${color};
                    display: inline-block;
                  "></span>
                  <span>${label}</span>
                </div>

                <strong style="color:#111827">
                  ${fmt(value)}
                </strong>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  } else {
    html += `
      <div style="
        margin-top: 6px;
        color: #6b7280;
        font-style: italic;
      ">
        Data tidak tersedia
      </div>
    `;
  }

  html += `</div>`;

  layer.bindTooltip(html, {
    sticky: true,
    direction: "top",
    opacity: 0.95,
  });

  layer.on({
    mouseover: () =>
      layer.setStyle({
        weight: 1.5,
      }),
    mouseout: () =>
      layer.setStyle({
        weight: 0.7,
      }),
  });
};


  return (
    <div className="relative w-full h-full">
      <MapContainer
        ref={mapRef}
        center={[-6.2, 106.8]}
        zoom={11}
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <GeoJSON
          data={geoVillage}
          style={styleFeature}
          onEachFeature={onEachFeature}
        />
      </MapContainer>

      {geoSeribu && (
        <div className="absolute bottom-3 right-3 w-44 h-44 bg-white border rounded shadow">
          <MapContainer
            center={[-5.8, 106.6]}
            zoom={9}
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
            className="h-full w-full"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <GeoJSON
              data={geoSeribu}
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
          </MapContainer>
        </div>
      )}

      <div
        className="
        absolute bottom-4 right-4
        bg-white/90 backdrop-blur
        rounded-xl shadow-lg
        px-4 py-3 text-xs
        space-y-2 z-[500]
      "
      >
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-[#FFD100]" />
          <span>Ridwan Kamil - Suswono (Paslon 01)</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-[#16a34a]" />
          <span>Dharma Pongrekun - Kun Wardana Abyoto (Paslon 02)</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-[#C40000]" />
          <span>Pramono Anung Wibowo - Rano Karno (Paslon 03)</span>
        </div>
      </div>

    </div>
  );
}
