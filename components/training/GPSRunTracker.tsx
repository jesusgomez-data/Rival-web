"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Play, Pause, Square, Satellite, Loader2 } from "lucide-react";
import RouteMap from "./RouteMap";

// Misma formula Haversine que usaba el tracker de sesion en vivo (ya
// retirado de navegacion) — se reutiliza aqui, integrada directamente
// en la creacion del post de WOD en vez de una seccion aparte.
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function formatPace(secondsPerKm: number) {
    if (!isFinite(secondsPerKm) || secondsPerKm <= 0) return '--:--';
    const m = Math.floor(secondsPerKm / 60);
    const s = Math.round(secondsPerKm % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
}

function formatTime(totalSeconds: number) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    const mm = m < 10 ? '0' + m : m;
    const ss = s < 10 ? '0' + s : s;
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export interface GPSRunResult {
    distanceMeters: number;
    durationSeconds: number;
    paceLabel: string; // "M:SS /km" average
    elevationGain: number;
    path: { lat: number; lon: number }[];
    splits: { km: number; paceSecondsPerKm: number }[];
}

export default function GPSRunTracker({ onFinish, onClose }: {
    onFinish: (result: GPSRunResult) => void;
    onClose: () => void;
}) {
    const [status, setStatus] = useState<'searching' | 'tracking' | 'paused'>('searching');
    const [distance, setDistance] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [elevationGain, setElevationGain] = useState(0);
    const [path, setPath] = useState<{ lat: number; lon: number }[]>([]);
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const distanceRef = useRef(0);
    const pathRef = useRef<{ lat: number; lon: number }[]>([]);
    const lastPosRef = useRef<{ lat: number; lon: number; alt?: number | null } | null>(null);
    const splitsRef = useRef<{ km: number; paceSecondsPerKm: number }[]>([]);
    const lastSplitDistRef = useRef(0);
    const lastSplitTimeRef = useRef(Date.now());
    const startedAtRef = useRef<number | null>(null);
    const pausedAccumRef = useRef(0);
    const pauseStartRef = useRef<number | null>(null);

    // Reloj — actualiza el tiempo transcurrido cada segundo mientras se rastrea
    useEffect(() => {
        if (status !== 'tracking') return;
        const t = setInterval(() => {
            if (!startedAtRef.current) return;
            setElapsed(Math.floor((Date.now() - startedAtRef.current - pausedAccumRef.current) / 1000));
        }, 1000);
        return () => clearInterval(t);
    }, [status]);

    // GPS watch
    useEffect(() => {
        if (typeof window === 'undefined' || !('geolocation' in navigator)) {
            setError('Este dispositivo no soporta GPS.');
            return;
        }
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, accuracy: acc, altitude } = pos.coords;

                if (status === 'searching' && acc < 60) {
                    setStatus('tracking');
                    startedAtRef.current = Date.now();
                    if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
                }
                if (acc > 50) return;
                setAccuracy(acc);

                if (lastPosRef.current) {
                    const d = calculateDistance(lastPosRef.current.lat, lastPosRef.current.lon, latitude, longitude);
                    if (status === 'tracking' && d > 3 && d < 40 && acc < 35) {
                        const prevKm = Math.floor(distanceRef.current / 1000);
                        distanceRef.current += d;
                        setDistance(distanceRef.current);
                        pathRef.current = [...pathRef.current, { lat: latitude, lon: longitude }];
                        setPath(pathRef.current);

                        const newKm = Math.floor(distanceRef.current / 1000);
                        if (newKm > prevKm && newKm >= 1) {
                            const now = Date.now();
                            const elapsedMs = now - lastSplitTimeRef.current;
                            const distSinceLastSplit = distanceRef.current - lastSplitDistRef.current;
                            if (distSinceLastSplit > 0 && elapsedMs > 0) {
                                const paceSecondsPerKm = (elapsedMs / 1000 / distSinceLastSplit) * 1000;
                                splitsRef.current = [...splitsRef.current, { km: newKm, paceSecondsPerKm }];
                            }
                            lastSplitDistRef.current = newKm * 1000;
                            lastSplitTimeRef.current = now;
                        }

                        if (altitude !== null && acc < 25 && lastPosRef.current.alt !== undefined && lastPosRef.current.alt !== null) {
                            const diff = altitude - lastPosRef.current.alt;
                            if (diff > 0.4 && diff < 15) setElevationGain(prev => prev + diff);
                        }
                    }
                }
                lastPosRef.current = { lat: latitude, lon: longitude, alt: altitude };
            },
            (err) => {
                if (err.code === 1) setError('Acceso a GPS denegado. Habilita los permisos de ubicación.');
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
        return () => navigator.geolocation.clearWatch(watchId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status === 'searching']);

    const togglePause = () => {
        if (status === 'tracking') {
            pauseStartRef.current = Date.now();
            setStatus('paused');
        } else if (status === 'paused') {
            if (pauseStartRef.current) pausedAccumRef.current += Date.now() - pauseStartRef.current;
            setStatus('tracking');
        }
    };

    const handleFinish = () => {
        const avgPaceSecondsPerKm = distanceRef.current > 0
            ? elapsed / (distanceRef.current / 1000)
            : 0;
        onFinish({
            distanceMeters: distanceRef.current,
            durationSeconds: elapsed,
            paceLabel: `${formatPace(avgPaceSecondsPerKm)} /KM`,
            elevationGain: Math.round(elevationGain),
            path: pathRef.current,
            splits: splitsRef.current,
        });
    };

    const km = (distance / 1000).toFixed(2);
    const avgPace = distance > 0 ? formatPace(elapsed / (distance / 1000)) : '--:--';

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-2">
                    <Satellite className={`w-4 h-4 ${status === 'searching' ? 'text-yellow-500 animate-pulse' : 'text-green-500'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        {status === 'searching' ? 'Buscando GPS…' : status === 'paused' ? 'En pausa' : `Señal ${accuracy ? Math.round(accuracy) + 'm' : ''}`}
                    </span>
                </div>
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {error ? (
                <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
                    <p className="text-white font-bold">{error}</p>
                    <button onClick={onClose} className="px-6 py-3 bg-brand-red text-white rounded-xl font-black text-xs uppercase tracking-widest">Cerrar</button>
                </div>
            ) : status === 'searching' ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                    <Loader2 className="w-12 h-12 text-brand-red animate-spin" />
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest text-center px-8">Buscando señal GPS, sal al exterior para mejor precisión…</p>
                </div>
            ) : (
                <>
                    {/* Main stat */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-8">
                        <div className="text-center">
                            <div className="text-white font-black italic text-8xl tracking-tighter leading-none">{km}</div>
                            <div className="text-brand-red font-black text-sm uppercase tracking-[0.3em] mt-2">KM</div>
                        </div>
                        <div className="flex items-center gap-10">
                            <div className="text-center">
                                <div className="text-white font-black text-2xl italic">{formatTime(elapsed)}</div>
                                <div className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mt-1">Tiempo</div>
                            </div>
                            <div className="w-px h-10 bg-white/10" />
                            <div className="text-center">
                                <div className="text-white font-black text-2xl italic">{avgPace}</div>
                                <div className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mt-1">Ritmo /KM</div>
                            </div>
                        </div>
                        {path.length >= 2 && (
                            <div className="w-40 h-40 opacity-80">
                                <RouteMap path={path} color="#ef4444" strokeWidth={10} className="w-full h-full" />
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="px-8 pb-10 flex items-center justify-center gap-6">
                        <button
                            onClick={togglePause}
                            className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white"
                        >
                            {status === 'paused' ? <Play className="w-6 h-6 ml-0.5" /> : <Pause className="w-6 h-6" />}
                        </button>
                        <button
                            onClick={handleFinish}
                            disabled={distance < 20}
                            className="flex-1 max-w-xs py-5 bg-brand-red disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-glow"
                        >
                            <Square className="w-4 h-4 fill-current" /> Finalizar
                        </button>
                    </div>
                </>
            )}
        </div>,
        document.body
    );
}
