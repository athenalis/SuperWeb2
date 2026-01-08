import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import api from "../../lib/axios";

/* =========================
   HELPERS
========================= */
const renderLink = (link) => {
  if (!link) return "-";
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-700 underline break-all"
    >
      {link}
    </a>
  );
};

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatRupiah = (value) => {
  if (value === null || value === undefined) return "-";
  const num = Number(value);
  if (isNaN(num) || num === 0) return "-";
  return `Rp ${num.toLocaleString("id-ID")}`;
};

export function formatFollowers(num) {
  if (!num) return "-";
  if (num >= 1_000_000)
    return (num / 1_000_000).toFixed(1).replace(".0", "") + " jt";
  if (num >= 1_000)
    return (num / 1_000).toFixed(1).replace(".0", "") + " rb";
  return num.toString();
}

const calcAdsDuration = (start, end) => {
  if (!start || !end) return "-";
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff =
    Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? `${diff} hari` : "-";
};

function Section({ title, children }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="w-1.5 h-6 bg-blue-900 rounded-full" />
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Grid({ children }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>;
}

function Field({ label, value, full = false }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <div className="border rounded-lg px-5 py-4 space-y-1 bg-white">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className="text-base text-slate-800">
          {value === null || value === undefined || value === "" ? "-" : value}
        </div>
      </div>
    </div>
  );
}

/* =========================
   MAIN COMPONENT
========================= */
export default function DetailContent() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .get(`/content-plans/${id}`)
      .then((res) => setData(res.data))
      .catch(() => setError("Gagal memuat detail konten"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-center py-10">Loading...</p>;
  if (error || !data)
    return <p className="text-center py-10 text-red-600">{error}</p>;

  /* =========================
     CONTENT TYPE BY PLATFORM
  ========================= */
  const getContentTypeName = (cp) => {
    return cp.content_type?.name || "-";
  };

  /* =========================
     BUDGET
  ========================= */
  const budgetContent = Number(data.budget_with_trashed?.budget_content ?? 0);

  const budgetAds = data.content_platforms?.reduce(
    (sum, cp) => sum + Number(cp.ads?.budget_ads ?? 0),
    0
  );

  const totalBudget = budgetContent + budgetAds;

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-6xl bg-white rounded-xl shadow p-4 sm:p-6 md:p-8 space-y-8 md:space-y-10">
        {/* HEADER */}
        <div className="relative pt-2 md:pt-4">
          <div className="flex items-center md:block">
            <h1
              className="
                text-2xl md:text-3xl font-bold text-blue-900
                text-left md:text-center
                pr-12 md:pr-0
              "
            >
              Detail Perencanaan Konten
            </h1>
          </div>

          <button
            onClick={() => navigate(`/content/${id}/edit`)}
            className="
              absolute right-0
              top-1/2 -translate-y-1/2
              w-10 h-10 md:w-11 md:h-11
              flex items-center justify-center
              rounded-lg border border-blue-900
              text-blue-900
              hover:bg-blue-900 hover:text-white
              transition
            "
          >
            <Icon icon="solar:pen-outline" width={18} />
          </button>
        </div>

        {/* INFORMASI */}
        <Section title="Informasi Konten">
          <Grid>
            <Field label="Judul Konten" value={data.title} />
            <Field label="Tanggal Konten" value={formatDate(data.posting_date)} />
            <Field
              label="Platform"
              value={data.content_platforms
                ?.map((cp) => cp.platform?.name)
                .join(", ")}
            />
          </Grid>
        </Section>

        {/* KONTEN */}
        <Section title="Konten">
          <div className="space-y-4">
            {data.content_platforms.map((cp) => (
              <div
                key={cp.id}
                className="border rounded-xl px-5 py-4 space-y-3 bg-white"
              >
                <div className="flex justify-between items-center">
                  <div className="font-semibold text-slate-800">
                    {cp.platform?.name}
                  </div>
                  <div className="text-sm text-slate-600">
                    {getContentTypeName(cp)}
                  </div>
                </div>

                <div className="border-t pt-3 space-y-1">
                  <div className="text-xs font-medium text-slate-500">
                    Link Konten
                  </div>
                  <div className="text-sm">
                    {renderLink(cp.link)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* INFLUENCER */}
        {data.influencers?.length > 0 && (
          <Section title="Influencer">
            <div className="space-y-4">
              {data.influencers.map((inf, idx) => (
                <div key={inf.id} className="border rounded-xl p-4 space-y-4">
                  <div className="font-bold">
                    Influencer {idx + 1}: {inf.name}
                  </div>

                  {/* PLATFORM & FOLLOWERS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {inf.platforms?.map((p) => (
                      <div
                        key={p.id}
                        className="flex justify-between border rounded-lg px-4 py-3"
                      >
                        <div>
                          <div className="font-semibold">
                            {p.platform?.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {p.username}
                          </div>
                        </div>
                        <div className="font-bold">
                          {formatFollowers(p.followers)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CP */}
                  {(inf.email || inf.contacts?.length > 0) && (
                    <div className="border-t pt-4">
                      <div className="font-bold mb-2">
                        CP (Kontak Person)
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {inf.email && (
                          <div className="border rounded-lg px-4 py-3">
                            <div className="text-xs text-slate-500">Email</div>
                            <div>{inf.email}</div>
                          </div>
                        )}

                        {inf.contacts?.map((c, i) => (
                          <div key={i} className="border rounded-lg px-4 py-3">
                            <div className="text-xs text-slate-500">
                              No. Telepon
                            </div>
                            <div>{c}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* BUDGET & ADS */}
        <Section title="Budget & Ads">
          <Grid>
            <Field
              label="Budget Konten"
              value={formatRupiah(budgetContent)}
            />
            <Field
              label="Total Budget Ads"
              value={formatRupiah(budgetAds)}
            />
            <Field
              label="Total Budget"
              value={formatRupiah(totalBudget)}
              full
            />
          </Grid>

          {/* ADS PER PLATFORM */}
          <div className="space-y-4 pt-6">
            {data.content_platforms
              .filter((cp) => cp.ads)
              .map((cp) => (
                <div
                  key={cp.id}
                  className="border rounded-xl px-5 py-4 bg-white space-y-3"
                >
                  <div className="flex justify-between">
                    <div className="font-semibold">
                      {cp.platform?.name}
                    </div>
                    <div className="text-sm font-medium">
                      {formatRupiah(cp.ads?.budget_ads)}
                    </div>
                  </div>

                  <Grid>
                    <Field
                      label="Ads Mulai"
                      value={formatDate(cp.ads?.start_date)}
                    />
                    <Field
                      label="Ads Selesai"
                      value={formatDate(cp.ads?.end_date)}
                    />
                    <Field
                      label="Durasi Ads"
                      value={calcAdsDuration(
                        cp.ads?.start_date,
                        cp.ads?.end_date
                      )}
                      full
                    />
                  </Grid>
                </div>
              ))}
          </div>
        </Section>

        {/* STATUS */}
        <Section title="Status">
          <div className="border rounded-xl px-6 py-4">
            <span className="px-4 py-1.5 rounded-full bg-slate-100 font-semibold">
              {data.status?.label}
            </span>
          </div>
        </Section>

        {/* DESKRIPSI */}
        <Section title="Deskripsi">
          <Field label="Keterangan" value={data.description} full />
        </Section>

        <div className="flex justify-end">
          <button
            onClick={() => navigate("/content")}
            className="px-5 py-2.5 bg-slate-200 rounded-lg"
          >
            Kembali
          </button>
        </div>
      </div>
    </div>
  );
}
