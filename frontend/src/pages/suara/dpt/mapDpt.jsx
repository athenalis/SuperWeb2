import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents } from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* =======================
   LEGEND CONTROL
======================= */
function LegendControl({ legend, title = "Daerah Prioritas DPT" }) {
  const map = useMap();

  useEffect(() => {
    if (!legend?.length) return;

    const legendControl = L.control({ position: "bottomright" });

    legendControl.onAdd = () => {
      const container = L.DomUtil.create("div");

      Object.assign(container.style, {
        background: "#ffffff",
        padding: "10px 12px",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        fontSize: "12px",
        lineHeight: "1.3",
        minWidth: "200px",
      });

      container.innerHTML = `
        <div style="margin-bottom:8px">
          <div style="font-weight:700;font-size:13px">
            ${title}
          </div>
          <div style="font-size:11px;color:#6B7280">
            Berdasarkan kepadatan DPT/km²
          </div>
        </div>

        <div style="display:flex">
          <div style="
            display:flex;
            flex-direction:column;
            margin-right:8px;
          ">
            ${legend
              .map(
                ({ color }) => `
                  <div style="
                    width:18px;
                    height:20px;
                    background:${color};
                  "></div>
                `
              )
              .join("")}
          </div>

          <div style="display:flex;flex-direction:column">
            ${legend
              .map(
                ({ label }) => `
                  <div style="
                    height:20px;
                    display:flex;
                    align-items:center;
                  ">
                    ${label}
                  </div>
                `
              )
              .join("")}
          </div>
        </div>
      `;

      return container;
    };

    legendControl.addTo(map);

    return () => {
      legendControl.remove();
    };
  }, [map, legend, title]);

  return null;
}

function BoxZoomTooltip() {
  useMapEvents({
    boxzoomend(e) {
      const bounds = e.boxZoomBounds;
      if (!bounds) return;

      const center = bounds.getCenter();

      this.openTooltip(
        `
        <div style="font-size:12px">
          <b>Area Terpilih</b><br/>
          Ini hasil box select
        </div>
        `,
        center,
        {
          sticky: true,
          direction: "top",
        }
      );
    },
  });

  return null;
}


/* =======================
   MAP COMPONENT
======================= */
export default function MapPeta({ dptKelurahan = {}, legend = [] }) {
  const [geojson, setGeojson] = useState(null);
  const [selectedLayer, setSelectedLayer] = useState(null);

  /* fetch geojson kelurahan */
  useEffect(() => {
    fetch("/data/id31_dki_jakarta_village.geojson")
      .then((res) => res.json())
      .then(setGeojson);
  }, []);

  if (!geojson) {
    return (
      <div className="h-[500px] flex items-center justify-center">
        Loading peta...
      </div>
    );
  }

  /* =======================
     NORMALIZATION (SYNC BACKEND)
     backend: mb_strtoupper + remove space
  ======================= */
  const normalizeKey = (value = "") =>
    value.replace(/\s+/g, "").toUpperCase();

  const VILLAGE_ALIAS = {
    HALIMPERDANAKUSUMAH: "HALIMPERDANAKUSUMA",
    PAPANGO: "PAPANGGO",
    KAMPUNGTENGAH: "TENGAH",
    PALMERIEM: "PALMERIAM",
    TANJUNGPRIUK: "TANJUNGPRIOK",
    WIJAYAKESUMA: "WIJAYAKUSUMA",
    HARAPANMULYA: "HARAPANMULIA",
    PREPEDAN: "TEGALALUR",

    KALIANYAR: "KALIANYAR",
    RAWABADAKSELATAN: "RAWABADAKSELATAN",
    RAWABADAKUTARA: "RAWABADAKUTARA",
  };

  const getKelurahanData = (geoName) => {
    if (!geoName) return null;

    const rawKey = normalizeKey(geoName);
    const finalKey = VILLAGE_ALIAS[rawKey] || rawKey;

    return dptKelurahan[finalKey] || null;
  };

  /* =======================
     MAP STYLE
  ======================= */
  const styleFeature = ({ properties }) => {
    const data = getKelurahanData(properties?.village);

    return {
      fillColor: data?.color || "#e5e7eb",
      color: "#ffffff",
      weight: 0.4,
      fillOpacity: 0.85,
    };
  };

  const highlightStyle = {
    color: "#111827",
    weight: 3,
    opacity: 1,
    fillOpacity: 0.75, 
    dashArray: "0",
  };

  const resetHighlight = (layer, feature) => {
    layer.setStyle(styleFeature(feature));
  };

  /* =======================
     TOOLTIP
  ======================= */
  const onEachFeature = (feature, layer) => {
  const geoName = feature?.properties?.village || "";
  const data = getKelurahanData(geoName);

  /* TOOLTIP (punyamu, tidak diubah) */
  const priorityText = data?.priority || "Tidak Diklasifikasikan";

  layer.bindTooltip(
    `
    <div style="font-size:12px;min-width:200px;line-height:1.6">
      
      <!-- NAMA KECAMATAN / KELURAHAN -->
      <div style="font-weight:700;font-size:14px;margin-bottom:6px">
        ${data?.name || geoName}
      </div>

      <!-- WARNA + PRIORITAS -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="
          width:12px;
          height:12px;
          background:${data?.color || "#9CA3AF"};
          border-radius:3px;
          display:inline-block;
        "></span>

        <span style="font-weight:600">
          ${priorityText}
        </span>
      </div>

      <!-- KEPADATAN -->
      <div>
        Kepadatan :
        <b>${data?.density?.toLocaleString("id-ID") || 0}</b>
        DPT/km²
      </div>

      <!-- LUAS -->
      <div>
        Luas :
        <b>${data?.area ?? 0}</b> km²
      </div>

      <!-- DPT -->
      <div>
        DPT :
        <b>${data?.total_dpt?.toLocaleString("id-ID") || 0}</b>
      </div>

    </div>
    `,
    {
      sticky: true,
      direction: "top",
      opacity: 1,
      className: "custom-leaflet-tooltip",
    }
  );

  /* ===== EVENT HOVER ===== */
  layer.on({
    mouseover: () => {
      layer.setStyle(highlightStyle);
      layer.bringToFront();
    },

    mouseout: () => {
      if (selectedLayer !== layer) {
        resetHighlight(layer, feature);
      }
    },

    click: () => {
      if (selectedLayer && selectedLayer !== layer) {
        selectedLayer.setStyle(
          styleFeature(selectedLayer.feature)
        );
        selectedLayer.closeTooltip();
      }

      layer.setStyle({
        ...highlightStyle,
        weight: 3,
      });

      layer.bringToFront();
      layer.openTooltip();
      setSelectedLayer(layer);
    },
  });
};

  /* =======================
     RENDER MAP
  ======================= */
  return (
    <MapContainer
      center={[-6.2, 106.8]}
      zoom={12}
      boxZoom={false}          // ⬅️ MATIKAN KOTAK
      doubleClickZoom={false} // ⬅️ optional tapi disarankan
      className="h-[500px] w-full rounded-xl"
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <GeoJSON
        key={JSON.stringify(dptKelurahan)}
        data={geojson}
        style={styleFeature}
        onEachFeature={onEachFeature}
      />

      <LegendControl legend={legend} />
    </MapContainer>
  );
}
