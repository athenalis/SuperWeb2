import { useEffect, useMemo, useState } from "react";
import api from "../../../lib/axios";
import MapPeta from "./mapDpt";

export default function DptIndex() {
  const [petaData, setPetaData] = useState([]);
  const [legend, setLegend] = useState([]);

  /* ======================
     LOAD PETA DPT
  ====================== */
  useEffect(() => {
    api.get("/peta/dpt-villages").then((res) => {
      setPetaData(res.data.data || []);
      setLegend(res.data.legend || []);
    });
  }, []);

  /* ======================
     Mapping by NAMA KELURAHAN
  ====================== */
  const normalizeKey = (value = "") =>
  value.replace(/\s+/g, "").toUpperCase();

  const dptKelurahanByName = useMemo(() => {
    const obj = {};

    petaData.forEach((d) => {
      if (d.village) {
        const key = normalizeKey(d.village);

        obj[key] = {
          name: d.village,          // tampil di tooltip
          area: d.area_km2,
          total_dpt: d.total_dpt,
          density: d.density,
          color: d.color,
          priority: d.priority,
        };
      }
    });

    return obj;
  }, [petaData]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold text-blue-900">
          Peta Persebaran Daerah Prioritas DPT
        </h1>
        {/* <p className="text-slate-600">Peta terfilter berdasarkan kelurahan</p> */}
      </div>

      {/* MAP */}
      <div className="relative z-20 bg-white rounded-xl shadow p-6">
        <MapPeta dptKelurahan={dptKelurahanByName} legend={legend} />
      </div>
    </div>
  );
}
