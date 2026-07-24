"use client";

import React, { useId } from 'react';

export default function RouteMap({ path, className, color = "white", strokeWidth = 8, showStart = true, showGrid = false }: {
    path: { lat: number; lon: number }[],
    className?: string,
    color?: string,
    strokeWidth?: number,
    showStart?: boolean,
    showGrid?: boolean
}) {
    const uid = useId().replace(/:/g, '');
    if (!path || path.length < 2) return null;

    // Fixed aspect ratio 1:1 for the map square
    const width = 400;
    const height = 400;
    const padding = 50;

    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    path.forEach(p => {
        if (p.lat < minLat) minLat = p.lat;
        if (p.lat > maxLat) maxLat = p.lat;
        if (p.lon < minLon) minLon = p.lon;
        if (p.lon > maxLon) maxLon = p.lon;
    });

    const latDiff = maxLat - minLat;
    const lonDiff = maxLon - minLon;
    const maxDiff = Math.max(latDiff, lonDiff) || 0.00001;

    // Calculate scale to fit in the box while preserving aspect ratio
    const scale = (400 - padding * 2) / maxDiff;

    // Centering offsets
    const xOffset = (400 - (lonDiff * scale)) / 2;
    const yOffset = (400 - (latDiff * scale)) / 2;

    const toX = (lon: number) => xOffset + (lon - minLon) * scale;
    const toY = (lat: number) => 400 - (yOffset + (lat - minLat) * scale);

    const svgPath = path.map((p, i) => {
        const x = toX(p.lon);
        const y = toY(p.lat);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");

    const startX = toX(path[0].lon), startY = toY(path[0].lat);
    const endX = toX(path[path.length - 1].lon), endY = toY(path[path.length - 1].lat);

    return (
        <svg viewBox="0 0 400 400" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id={`routeGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.55" />
                    <stop offset="100%" stopColor={color} stopOpacity="1" />
                </linearGradient>
                <pattern id={`routeDots-${uid}`} width="22" height="22" patternUnits="userSpaceOnUse">
                    <circle cx="1.5" cy="1.5" r="1.5" fill={color} fillOpacity="0.08" />
                </pattern>
            </defs>

            {showGrid && <rect x="0" y="0" width="400" height="400" fill={`url(#routeDots-${uid})`} />}

            {/* Soft outer glow pass, then the crisp route line on top */}
            <path d={svgPath} stroke={color} strokeOpacity="0.25" strokeWidth={strokeWidth + 10} strokeLinecap="round" strokeLinejoin="round" />
            <path
                d={svgPath}
                stroke={`url(#routeGrad-${uid})`}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-lg"
            />

            {showStart && (
                <>
                    <circle cx={startX} cy={startY} r={strokeWidth * 1.6} fill="#22c55e" fillOpacity="0.25" />
                    <circle cx={startX} cy={startY} r={strokeWidth * 0.75} fill="#22c55e" stroke="#000" strokeOpacity="0.25" strokeWidth="1.5" />
                </>
            )}
            <circle cx={endX} cy={endY} r={strokeWidth * 1.8} fill={color} opacity="0.3" />
            <circle cx={endX} cy={endY} r={strokeWidth * 0.9} fill={color} stroke="#000" strokeOpacity="0.25" strokeWidth="1.5" />
        </svg>
    );
}
