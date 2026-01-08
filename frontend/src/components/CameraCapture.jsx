import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";

export default function CameraCapture({ onCapture, onClose }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    /* STATIC UI */
    // Removed fake simulation

    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startCamera = async () => {
        setLoading(true);
        setError("");
        try {
            // Optimization: Use HD (720p) instead of FHD (1080p)
            const constraints = {
                video: {
                    facingMode: "environment",
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
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
            setError("Gagal mengakses kamera. Periksa izin browser.");
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
        }, "image/jpeg", 0.85);
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
            {/* HEADER */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
                <button onClick={onClose} className="text-white p-2 rounded-full hover:bg-white/20">
                    <Icon icon="mdi:close" width="32" />
                </button>
                <span className="text-white font-semibold">Foto KTP</span>
                <div className="w-10"></div>
            </div>

            {/* VIDEO Viewport */}
            <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
                {loading && (
                    <div className="text-white flex flex-col items-center">
                        <Icon icon="mdi:loading" className="animate-spin mb-2" width="32" />
                        <span className="text-sm">Membuka Kamera...</span>
                    </div>
                )}

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

                {/* OVERLAY LAYER */}
                {!error && !loading && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        {/* Dimmed Background */}
                        <div className="absolute inset-0 border-[50px] md:border-[150px] border-black/50 box-border w-full h-full z-0"></div>

                        {/* KTP Frame */}
                        <div className="relative z-10 w-[85%] aspect-[1.58/1] md:w-[500px] border-2 border-white rounded-xl">
                            {/* Corners */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 -mt-1 -ml-1 rounded-tl-xl border-blue-500"></div>
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 -mt-1 -mr-1 rounded-tr-xl border-blue-500"></div>
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 -mb-1 -ml-1 rounded-bl-xl border-blue-500"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 -mb-1 -mr-1 rounded-br-xl border-blue-500"></div>

                            {/* Scan Line Animation */}
                            <div className="absolute top-0 left-2 right-2 h-0.5 bg-blue-400 opacity-80 animate-scan-fast"></div>

                            {/* Feedback Text */}
                            <div className="absolute -bottom-20 left-0 right-0 text-center">
                                <p className="text-lg font-bold drop-shadow-sm text-white">
                                    Posisikan KTP dalam kotak
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SHUTTER BUTTON */}
            {!error && !loading && (
                <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-center items-center bg-black/40 backdrop-blur-sm z-20">
                    <button
                        onClick={takePhoto}
                        className="w-16 h-16 rounded-full border-4 border-white bg-white/10 flex items-center justify-center active:scale-95 transition-all"
                    >
                        <div className="w-12 h-12 rounded-full bg-white"></div>
                    </button>
                </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            {/* Optimized Animations - Using Transform */}
            <style>{`
        @keyframes scan-fast {
          0% { transform: translateY(0); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(200px); opacity: 0; } /* Adjust 200px based on container if possible, but % usually relative to line. Using % relative to parent height is safer */
          /* Actually, percentage top is better for responsive box */
        }
        .animate-scan-fast {
          animation: scan-vertical 2s linear infinite;
        }
        @keyframes scan-vertical {
           0% { top: 2%; opacity: 0; }
           10% { opacity: 1; }
           90% { opacity: 1; }
           100% { top: 98%; opacity: 0; }
        }
      `}</style>
        </div>
    );
}
