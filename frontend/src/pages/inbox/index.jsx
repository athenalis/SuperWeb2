import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";

export default function InboxIndex() {

    const navigate = useNavigate();
  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">
          Pesan Masuk
        </h1>
        <p className="text-sm text-slate-500">
          Daftar pesan dari admin atau sistem
        </p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-blue-700
                     hover:text-blue-900 transition"
        >
          <Icon icon="mdi:arrow-left" width={18} />
          Kembali
        </button>
      </div>

      {/* EMPTY STATE */}
      <div className="bg-white border rounded-xl p-10 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
          <Icon
            icon="mdi:inbox-outline"
            width={32}
            className="text-blue-700"
          />
        </div>

        <h2 className="text-lg font-semibold text-slate-700">
          Belum ada pesan masuk
        </h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Jika ada pesan baru dari admin atau sistem, pesan tersebut
          akan muncul di sini.
        </p>
      </div>
    </div>
  );
}
