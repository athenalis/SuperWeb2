import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import api from "../../lib/axios";
import { toast } from "react-hot-toast";

export default function SingleVisitView({ notification, onComplete }) {
    const [visit, setVisit] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectComment, setRejectComment] = useState("");

    const kunjunganId = notification?.data?.kunjungan_id;

    useEffect(() => {
        if (kunjunganId) {
            fetchVisitDetail();
        }
    }, [kunjunganId]);

    const fetchVisitDetail = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/kunjungan/${kunjunganId}`);
            if (res.data.success) {
                setVisit(res.data.data);
            }
        } catch (err) {
            if (err.response && err.response.status === 404) {
                toast.error("Data kunjungan ini sudah dihapus");
                setVisit(null);
            } else {
                console.error("Failed to fetch visit detail", err);
                toast.error("Gagal memuat detail kunjungan");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        try {
            const res = await api.post(`/kunjungan/${visit.id}/verifikasi`, {
                status: 'accepted'
            });
            if (res.data.success) {
                toast.success("Kunjungan disetujui");
                // Refresh data to update status and hide buttons
                await fetchVisitDetail();
            }
        } catch (err) {
            toast.error("Gagal menyetujui kunjungan");
        }
    };

    const handleReject = async () => {
        if (!rejectComment.trim()) {
            toast.error("Catatan revisi wajib diisi");
            return;
        }

        try {
            const res = await api.post(`/kunjungan/${visit.id}/verifikasi`, {
                status: 'rejected',
                keterangan: rejectComment
            });
            if (res.data.success) {
                toast.success("Kunjungan ditandai untuk revisi");
                setShowRejectForm(false);
                setRejectComment("");
                // Refresh data to update status and hide buttons
                await fetchVisitDetail();
            }
        } catch (err) {
            toast.error("Gagal menandai kunjungan");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Icon icon="svg-spinners:180-ring-with-bg" width="40" className="mb-3" />
                <p>Memuat detail kunjungan...</p>
            </div>
        );
    }

    if (!visit) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Icon icon="mdi:alert-circle-outline" width="48" className="mb-2 opacity-30" />
                <p>Data kunjungan tidak ditemukan</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white rounded-r-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onComplete}
                        className="md:hidden p-1 -ml-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/50 transition mr-1"
                    >
                        <Icon icon="mdi:arrow-left" width={24} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Detail Kunjungan</h2>
                        <p className="text-sm text-slate-500">
                            Relawan: <span className="font-semibold text-blue-900">{visit.relawan?.nama || '-'}</span>
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchVisitDetail}
                    className="p-2 text-slate-400 hover:text-blue-600 transition"
                    title="Refresh Data"
                >
                    <Icon icon="mdi:refresh" width="20" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
                    {/* Foto Display */}
                    <div className="flex flex-col md:flex-row gap-6 mb-6">
                        <div className="w-full md:w-32 h-48 md:h-32 bg-slate-100 rounded-lg flex-shrink-0 overflow-hidden border border-slate-200">
                            {visit.foto_ktp ? (
                                <img
                                    src={`${(import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:9000/api`).replace('/api', '')}/storage/${visit.foto_ktp}`}
                                    alt="KTP"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <Icon icon="mdi:image-off" width="32" />
                                </div>
                            )}
                        </div>

                        {/* Info Utama */}
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold text-slate-800 mb-3">{visit.nama}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-slate-500">NIK:</span>
                                    <p className="font-semibold text-slate-800 break-all">{visit.nik}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Umur:</span>
                                    <p className="font-semibold text-slate-800">{visit.umur} tahun</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Pendidikan:</span>
                                    <p className="font-semibold text-slate-800">{visit.pendidikan}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Pekerjaan:</span>
                                    <p className="font-semibold text-slate-800">{visit.pekerjaan}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <span className="text-slate-500">Penghasilan:</span>
                                    <p className="font-semibold text-slate-800">{visit.penghasilan}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <span className="text-slate-500 flex items-center gap-1">
                                        <Icon icon="mdi:map-marker-outline" width="14" /> Alamat:
                                    </span>
                                    <p className="font-semibold text-slate-800">{visit.alamat}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Anggota Keluarga */}
                    {visit.family_form?.members && visit.family_form.members.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <Icon icon="mdi:account-group" width="18" />
                                Anggota Keluarga ({visit.family_form.members.length})
                            </h4>
                            <div className="space-y-2">
                                {visit.family_form.members.map((member, idx) => (
                                    <div key={idx} className="bg-slate-50 rounded-lg p-3 text-sm">
                                        <div className="font-semibold text-slate-800">{member.nama}</div>
                                        <div className="text-slate-600">
                                            NIK: {member.nik} | {member.hubungan} | {member.umur} tahun
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons or Status */}
                    {visit.status_verifikasi && visit.status_verifikasi !== 'pending' ? (
                        /* Already verified - show status */
                        <div className="mt-6 p-4 rounded-lg text-center">
                            {visit.status_verifikasi === 'accepted' ? (
                                <div className="bg-green-50 border border-green-200 text-green-800 py-3 rounded-lg flex items-center justify-center gap-2">
                                    <Icon icon="mdi:check-circle" width={20} />
                                    <span className="font-semibold">Sudah Disetujui</span>
                                </div>
                            ) : visit.status_verifikasi === 'rejected' ? (
                                <div className="bg-red-50 border border-red-200 text-red-800 py-3 rounded-lg">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <Icon icon="mdi:close-circle" width={20} />
                                        <span className="font-semibold">Sudah Ditandai untuk Revisi</span>
                                    </div>
                                    {visit.komentar_verifikasi && (
                                        <p className="text-sm mt-2 text-red-700">
                                            Catatan: {visit.komentar_verifikasi}
                                        </p>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        /* Not verified yet - show action buttons */
                        <>
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleApprove}
                                    className="flex-1 bg-green-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <Icon icon="mdi:check" width={18} /> Terima
                                </button>
                                <button
                                    onClick={() => setShowRejectForm(true)}
                                    className="flex-1 bg-white border border-red-200 text-red-600 py-3 rounded-lg text-sm font-semibold hover:bg-red-50 transition flex items-center justify-center gap-2"
                                >
                                    <Icon icon="mdi:close" width={18} /> Tandai
                                </button>
                            </div>

                            {/* Comment Form */}
                            {showRejectForm && (
                                <div className="mt-4 pt-4 border-t border-orange-50">
                                    <label className="block text-xs font-bold text-orange-800 mb-2">
                                        Catatan Revisi (Wajib):
                                    </label>
                                    <textarea
                                        className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                        placeholder="Jelaskan apa yang perlu diperbaiki..."
                                        value={rejectComment}
                                        onChange={(e) => setRejectComment(e.target.value)}
                                        rows={4}
                                        autoFocus
                                    />
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={handleReject}
                                            className="bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-orange-700 transition"
                                        >
                                            Tandai untuk Revisi
                                        </button>
                                        <button
                                            onClick={() => { setShowRejectForm(false); setRejectComment(""); }}
                                            className="text-slate-400 hover:text-slate-600 px-3"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
