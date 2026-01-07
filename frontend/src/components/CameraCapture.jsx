import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";

export default function CameraCapture({ onCapture, onClose }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    /* SIMULASI DETEKSI */
    const [isDetected, setIsDetected] = useState(false);
    const [scanLine, setScanLine] = useState(true);

    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        let timer;
        if (!loading && !error) {
            // Simulate scanning process: after 2.5s, "detect" the KTP
            timer = setTimeout(() => {
                setIsDetected(true);
                setScanLine(false);
            }, 2500);
        }
        return () => clearTimeout(timer);
    }, [loading, error]);

    const startCamera = async () => {
        setLoading(true);
        setError("");
        try {
            const constraints = {
                video: {
                    facingMode: "environment",
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            };

            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setLoading(false);
        } catch (err) {
            console.error("Camera Error:", err);
            setError("Gagal mengakses kamera. Pastikan izin kamera aktif.");
            setLoading(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const takePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `ktp_${Date.now()}.jpg`, { type: "image/jpeg" });
                onCapture(file);
                stopCamera();
                onClose();
            }
        }, "image/jpeg", 0.8);
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
            {/* HEADER */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
                <button onClick={onClose} className="text-white p-2 rounded-full hover:bg-white/20">
                    <Icon icon="mdi:close" width="32" />
                </button>
                <span className="text-white font-semibold">Ambil Foto KTP</span>
                <div className="w-10"></div>
            </div>

            {/* VIDEO */}
            <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
                {loading && <div className="text-white flex flex-col items-center"><Icon icon="mdi:loading" className="animate-spin mb-2" width="32" /> Membuka Kamera...</div>}

                {error ? (
                    <div className="text-white text-center p-6">
                        <Icon icon="mdi:camera-off" width="48" className="mx-auto mb-4 text-red-500" />
                        <p>{error}</p>
                        <button onClick={onClose} className="mt-4 px-4 py-2 bg-white text-black rounded-lg">Tutup</button>
                    </div>
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                )}

                {/* OVERLAY GUIDE */}
                {!error && !loading && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        {/* Darkened Area outside box */}
                        <div className={`absolute inset-0 border-[50px] md:border-[150px] transition-colors duration-500 box-border w-full h-full z-0 ${isDetected ? 'border-black/70' : 'border-black/50'}`}></div>

                        {/* KTP Frame */}
                        <div className={`relative z-10 w-[85%] aspect-[1.58/1] md:w-[500px] border-2 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-all duration-500 ${isDetected ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)]' : 'border-white'}`}>

                            {/* Corner Markers */}
                            <div className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 -mt-1 -ml-1 rounded-tl-xl transition-colors ${isDetected ? 'border-green-500' : 'border-blue-500'}`}></div>
                            <div className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 -mt-1 -mr-1 rounded-tr-xl transition-colors ${isDetected ? 'border-green-500' : 'border-blue-500'}`}></div>
                            <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 -mb-1 -ml-1 rounded-bl-xl transition-colors ${isDetected ? 'border-green-500' : 'border-blue-500'}`}></div>
                            <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 -mb-1 -mr-1 rounded-br-xl transition-colors ${isDetected ? 'border-green-500' : 'border-blue-500'}`}></div>

                            {/* SCAN LINE ANIMATION */}
                            {scanLine && (
                                <div className="absolute top-0 left-2 right-2 h-0.5 bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
                            )}

                            {/* Hint Text */}
                            <div className="absolute -bottom-24 left-0 right-0 text-center">
                                <p className={`text-lg font-bold drop-shadow-md transition-colors ${isDetected ? 'text-green-400' : 'text-white'}`}>
                                    {isDetected ? "KTP TERDETEKSI!" : "Posisikan KTP di sini"}
                                </p>
                                <p className="text-sm mt-1 text-gray-200 opacity-80">
                                    {isDetected ? "Pastikan gambar jelas & tidak buram" : "Sedang memindai..."}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* FOOTER CONTROLS */}
            {!error && !loading && (
                <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center items-center bg-gradient-to-t from-black/80 to-transparent z-20">
                    <button
                        onClick={takePhoto}
                        className={`w-20 h-20 rounded-full border-4 flex items-center justify-center active:scale-95 transition-all shadow-lg ${isDetected ? 'border-green-500 bg-green-500/20 shadow-green-500/30' : 'border-white bg-white/20'}`}
                    >
                        <div className={`w-16 h-16 rounded-full transition-colors duration-300 ${isDetected ? 'bg-green-400' : 'bg-white'}`}></div>
                    </button>
                </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
        </div>
    );
}
