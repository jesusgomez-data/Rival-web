"use client";

import React from 'react';

export default function RouteMap({ path, className, color = "white", strokeWidth = 8, showStart = true }: {
    path: { lat: number; lon: number }[],
    className?: string,
    color?: string,
    strokeWidth?: number,
    showStart?: boolean
}) {
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

    const svgPath = path.map((p, i) => {
        const x = xOffset + (p.lon - minLon) * scale;
        const y = 400 - (yOffset + (p.lat - minLat) * scale); // Invert Y
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");

    return (
        <svg viewBox="0 0 400 400" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d={svgPath}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-lg"
            />
            {showStart && (
                <circle cx={xOffset + (path[0].lon - minLon) * scale} cy={400 - (yOffset + (path[0].lat - minLat) * scale)} r="10" fill={color} />
            )}
            <circle cx={xOffset + (path[path.length - 1].lon - minLon) * scale} cy={400 - (yOffset + (path[path.length - 1].lat - minLat) * scale)} r="14" fill={color} opacity="0.4" />
            <circle cx={xOffset + (path[path.length - 1].lon - minLon) * scale} cy={400 - (yOffset + (path[path.length - 1].lat - minLat) * scale)} r="6" fill={color} />
        </svg>
    );
}
