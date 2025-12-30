import { useEffect, useMemo, useState } from "react";
import api from "../../../lib/axios";
import MapAnalisis from "./mapAnalisis";

/* =========================
   CONSTANT
========================= */

const CATEGORY_MAP = {
  "Straight Ticket": "straight",
  "Split Ticket": "split",
  "Non-Partisan": "nonpartisan",
};

const PASLON_NAMES = {
  "01": "Ridwan Kamil - Suswono",
  "02": "Dharma Pongrekun - Kun Wardana",
  "03": "Pramono Anung - Rano Karno",
};

const PARTY_NAMES = {
  100001: "PKB",
  100002: "Gerindra",
  100003: "PDIP",
  100004: "Golkar",
  100005: "NasDem",
  100006: "Demokrat",
  100007: "PAN",
  100008: "PKS",
  100009: "PPP",
  100010: "Perindo",
  100011: "PSI",
  100012: "Hanura",
  100024: "UMMAT",
};

/* =========================
   MAIN
========================= */

export default function AnalisisPaslonIndex() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaslon, setSelectedPaslon] = useState(null);

  useEffect(() => {
    api.get("/analisis/straight-ticket/district").then((res) => {
      setData(res.data || []);
      setLoading(false);
    });
  }, []);

  /* =========================
     SUMMARY (ATAS)
  ========================= */
  const summary = useMemo(() => {
    const total = data.length || 1;
    const count = { straight: 0, split: 0, nonpartisan: 0 };

    data.forEach((d) => {
      const key = CATEGORY_MAP[d.category];
      if (count[key] !== undefined) count[key]++;
    });

    return {
      straight: Math.round((count.straight / total) * 100),
      split: Math.round((count.split / total) * 100),
      nonpartisan: Math.round((count.nonpartisan / total) * 100),
      count,
    };
  }, [data]);

  /* =========================
     PASLON SUMMARY (CARD)
  ========================= */
  const paslonSummary = useMemo(() => {
    const base = {
      "01": { straight: 0, split: 0 },
      "02": { straight: 0, split: 0 },
      "03": { straight: 0, split: 0 },
    };

    data.forEach((d) => {
      if (!base[d.winner_paslon]) return;
      if (d.category === "Non-Partisan") return;

      base[d.winner_paslon][CATEGORY_MAP[d.category]]++;
    });

    return base;
  }, [data]);

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">
        Analisis Pola Straight vs Split Ticket
      </h1>

      {/* ===== SUMMARY ATAS (JANGAN DIHAPUS) ===== */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard
          title="Straight Ticket"
          percent={summary.straight}
          count={summary.count.straight}
          color="green"
        />
        <SummaryCard
          title="Split Ticket"
          percent={summary.split}
          count={summary.count.split}
          color="red"
        />
        <SummaryCard
          title="Non-Partisan"
          percent={summary.nonpartisan}
          count={summary.count.nonpartisan}
          color="yellow"
        />
      </div>

      {/* ===== MAP + PASLON ===== */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7 bg-white border rounded">
          <MapAnalisis data={data} />
        </div>

        <div className="col-span-5 space-y-3">
          {["01", "02", "03"].map((p) => (
            <PaslonCard
              key={p}
              code={p}
              data={paslonSummary[p]}
              onClick={() =>
                setSelectedPaslon({
                  code: p,
                  districts: data.filter(
                    (d) =>
                      d.winner_paslon === p &&
                      d.category !== "Non-Partisan"
                  ),
                })
              }
            />
          ))}
        </div>
      </div>

      {selectedPaslon && (
        <PaslonModal
          data={selectedPaslon}
          onClose={() => setSelectedPaslon(null)}
        />
      )}
    </div>
  );
}

/* =========================
   COMPONENTS
========================= */

function SummaryCard({ title, percent, count, color }) {
  const map = {
    green: "border-green-500 bg-green-50",
    red: "border-red-500 bg-red-50",
    yellow: "border-yellow-500 bg-yellow-50",
  };

  return (
    <div className={`border-l-4 p-4 rounded ${map[color]}`}>
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-2xl font-bold">{percent}%</div>
      <div className="text-xs text-gray-500">{count} kecamatan</div>
    </div>
  );
}

function PaslonCard({ code, data, onClick }) {
  return (
    <div
      onClick={onClick}
      className="border rounded-lg p-4 bg-white hover:shadow cursor-pointer transition"
    >
      <div className="font-semibold">Paslon {code}</div>
      <div className="text-sm text-gray-600 mb-3">
        {PASLON_NAMES[code]}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-green-50 p-2 rounded">
          <div className="text-gray-500">Straight</div>
          <div className="font-semibold">{data.straight}</div>
        </div>
        <div className="bg-red-50 p-2 rounded">
          <div className="text-gray-500">Split</div>
          <div className="font-semibold">{data.split}</div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   MODAL (DROPDOWN KECAMATAN)
========================= */

function PaslonModal({ data, onClose }) {
  const [open, setOpen] = useState(null);
  const districts = data.districts || [];

  const straight = districts.filter(
    (d) => d.category === "Straight Ticket"
  );
  const split = districts.filter(
    (d) => d.category === "Split Ticket"
  );

 const renderDistrict = (d, i) => {
  const key = `${d.district}-${i}`;

  return (
    <div key={key} className="border-b last:border-b-0">
      <button
        onClick={() => setOpen(open === key ? null : key)}
        className="w-full flex justify-between items-center px-4 py-2 text-sm hover:bg-gray-50"
      >
        <span className="font-medium text-gray-800">
          {d.district}
        </span>
        <span className="text-gray-500">
          {open === key ? "▴" : "▾"}
        </span>
      </button>

    {open === key && (
      <div className="px-4 py-3 bg-gray-50 text-sm space-y-3">
        
        {/* PASLON */}
        <div>
          <div className="text-gray-500">Paslon Pemenang</div>
          <div className="font-semibold">
            {PASLON_NAMES[d.winner_paslon]}
          </div>
          <div className="text-gray-700">
            {(
              d.winner_paslon === "01"
                ? d.votes_paslon_01
                : d.winner_paslon === "02"
                ? d.votes_paslon_02
                : d.votes_paslon_03
            ).toLocaleString("id-ID")} suara
          </div>
        </div>

        {/* PARTAI */}
        <div>
          <div className="text-gray-500">Partai Dominan</div>
          <div className="font-semibold">
            {PARTY_NAMES[d.party_winner]}
          </div>
          <div className="text-gray-700">
            {d.party_votes.toLocaleString("id-ID")} suara
          </div>
        </div>

      </div>
    )}

    </div>
  );
};


  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-lg p-5 max-h-[85vh] overflow-y-auto">
        {/* HEADER */}
        <div className="flex justify-between mb-4">
          <div>
            <div className="text-sm text-gray-500">
              Paslon {data.code}
            </div>
            <div className="font-semibold text-lg">
              {PASLON_NAMES[data.code]}
            </div>
          </div>
          <button onClick={onClose} className="text-xl">×</button>
        </div>

        {/* STRAIGHT CARD */}
        <div className="border rounded-lg mb-4 bg-green-50 border-green-200">
          <div className="px-4 py-3 bg-green-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm">
                ✓
              </span>
              <div>
                <div className="font-semibold text-green-800">
                  Straight Ticket
                </div>
                <div className="text-xs text-green-700">
                  Kecamatan dengan partai dominan sesuai koalisi
                </div>
              </div>
            </div>
            <span className="px-2 py-1 rounded-full text-xs bg-green-500 text-white">
              {straight.length}
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto divide-y">
            {straight.length ? (
              straight.map(renderDistrict)
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 italic">
                Tidak ada data
              </div>
            )}
          </div>
        </div>

        {/* SPLIT CARD */}
        <div className="border rounded-lg bg-red-50 border-red-200">
          <div className="px-4 py-3 bg-red-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-sm">
                ✕
              </span>
              <div>
                <div className="font-semibold text-red-800">
                  Split Ticket
                </div>
                <div className="text-xs text-red-700">
                  Kecamatan dengan partai dominan berbeda
                </div>
              </div>
            </div>
            <span className="px-2 py-1 rounded-full text-xs bg-red-500 text-white">
              {split.length}
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto divide-y">
            {split.length ? (
              split.map(renderDistrict)
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 italic">
                Tidak ada data
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-right mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
