"use client";

/**
 * VideoProcessor Utility
 * Handles client-side video/image processing to apply watermarks and append outros.
 * Optimized for performance and stability to avoid lag and flickering.
 */
export class VideoProcessor {
    private static LOGO_URL = "/logo_transparent.svg";
    private static logoImage: HTMLImageElement | null = null;

    /**
     * Pre-loads the logo image and ensures font is loaded.
     */
    private static async loadAssets(): Promise<HTMLImageElement> {
        // Wait for font
        try {
            if (document.fonts) {
                await document.fonts.load('900 12px Inter');
            }
        } catch (e) {
            console.warn("Font loading failed", e);
        }

        if (this.logoImage && this.logoImage.complete) return this.logoImage;

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = this.LOGO_URL;
            img.onload = () => {
                this.logoImage = img;
                resolve(img);
            };
            img.onerror = () => reject(new Error("Failed to load logo"));
        });
    }

    /**
     * Processes a video or image to add branding.
     */
    static async processMedia(
        mediaUrl: string,
        mediaType: 'video' | 'image' | string,
        onProgress?: (percent: number) => void
    ): Promise<Blob> {
        // Pre-load assets first
        await this.loadAssets().catch(err => console.error("Assets load failed", err));

        if (mediaType === 'video' || (typeof mediaType === 'string' && mediaType.includes('video'))) {
            return this.processVideo(mediaUrl, onProgress);
        } else {
            return this.processImage(mediaUrl);
        }
    }

    private static async processImage(imageUrl: string): Promise<Blob> {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageUrl;
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context");

        ctx.drawImage(img, 0, 0);
        this.drawWatermarkSync(ctx, canvas.width, canvas.height);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else throw new Error("Canvas toBlob failed");
            }, 'image/jpeg', 0.95);
        });
    }

    private static async processVideo(videoUrl: string, onProgress?: (percent: number) => void): Promise<Blob> {
        console.log("[VideoProcessor] Pre-fetching video for CORS bypass...");
        let finalUrl = videoUrl;
        let isLocalBlob = false;

        try {
            const res = await fetch(videoUrl);
            const blob = await res.blob();
            finalUrl = URL.createObjectURL(blob);
            isLocalBlob = true;
        } catch (e) {
            console.warn("[VideoProcessor] Pre-fetch failed, attempting direct capture...", e);
        }

        const video = document.createElement('video');
        video.crossOrigin = "anonymous";
        video.src = finalUrl;
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        video.style.position = 'fixed';
        video.style.top = '-9999px';
        video.style.left = '-9999px';
        video.style.visibility = 'hidden';
        document.body.appendChild(video);

        // Step 1: Wait for metadata with timeout
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Video loading timeout")), 15000);
            video.onloadedmetadata = () => {
                clearTimeout(timeout);
                resolve();
            };
            video.onerror = (e) => {
                clearTimeout(timeout);
                reject(new Error("Video source error"));
            };
            if (video.readyState >= 1) {
                clearTimeout(timeout);
                resolve();
            }
        });

        const canvas = document.createElement('canvas');
        // Optimization: Cap at 720p for processing stability
        const MAX_WIDTH = 1280;
        const targetWidth = video.videoWidth > MAX_WIDTH ? MAX_WIDTH : video.videoWidth;
        const targetHeight = (video.videoHeight / video.videoWidth) * targetWidth;
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error("Could not get canvas context");

        // Step 2: Set up AudioContext for precise capture
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Ensure destination is created before source
        const destination = audioContext.createMediaStreamDestination();
        const source = audioContext.createMediaElementSource(video);

        // Connect to destination stream for recording
        source.connect(destination);

        // Connect to a GainNode with 0 volume to keep it physically silent during processing but "active"
        const silentGain = audioContext.createGain();
        silentGain.gain.value = 0;
        source.connect(silentGain);
        silentGain.connect(audioContext.destination);

        // Force resume AudioContext
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        // Step 3: Combine Canvas and Audio streams
        const canvasStream = canvas.captureStream(25);

        // Combine tracks into a new MediaStream
        const combinedStream = new MediaStream();
        canvasStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));

        // Get audio tracks from destination
        const audioTracks = destination.stream.getAudioTracks();
        console.log(`[VideoProcessor] Audio tracks found: ${audioTracks.length}`);
        audioTracks.forEach(track => combinedStream.addTrack(track));

        const supportedType = this.getSupportedMimeType();
        const chunks: Blob[] = [];
        const recorder = new MediaRecorder(combinedStream, {
            mimeType: supportedType,
            videoBitsPerSecond: 4000000 // Slightly lower for guaranteed stability
        });

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        return new Promise(async (resolve, reject) => {
            let isOutroStarted = false;
            let processActive = true;
            let frameCount = 0;

            const processingTimeout = setTimeout(() => {
                if (processActive) {
                    processActive = false;
                    if (recorder.state !== 'inactive') recorder.stop();
                    reject(new Error("Video processing timed out (90s limit)"));
                }
            }, 90000);

            recorder.onstop = () => {
                clearTimeout(processingTimeout);
                const blob = new Blob(chunks, { type: supportedType });
                resolve(blob);
                video.remove();
                audioContext.close();
                if (isLocalBlob) URL.revokeObjectURL(finalUrl);
            };

            const drawLoop = () => {
                if (!processActive) return;

                if (video.ended || (video.currentTime >= video.duration - 0.1)) {
                    if (!isOutroStarted) {
                        isOutroStarted = true;
                        this.drawOutroSequence(ctx, canvas.width, canvas.height, recorder);
                    }
                    return;
                }

                // Smooth frame drawing
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                this.drawWatermarkSync(ctx, canvas.width, canvas.height);

                // Report progress
                if (onProgress && video.duration) {
                    const percent = Math.min(99, (video.currentTime / video.duration) * 100);
                    onProgress(percent);
                }

                frameCount++;
                requestAnimationFrame(drawLoop);
            };

            try {
                // Ensure everything is ready
                video.currentTime = 0;
                video.muted = false;
                video.volume = 1.0;

                if (audioContext.state === 'suspended') await audioContext.resume();

                // Small delay to let audio tracks "warm up"
                await new Promise(r => setTimeout(r, 200));

                recorder.start(200); // 200ms blocks
                await video.play();
                requestAnimationFrame(drawLoop);
            } catch (err) {
                console.error("Video processing failed", err);
                processActive = false;
                if (recorder.state !== 'inactive') recorder.stop();
                reject(err);
            }
        });
    }

    private static getSupportedMimeType(): string {
        const types = [
            'video/mp4;codecs=avc1,mp4a.40.2',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4'
        ];
        for (const type of types) {
            if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
                console.log(`[VideoProcessor] Using MimeType: ${type}`);
                return type;
            }
        }
        return '';
    }

    /**
     * Helper to download or share a blob.
     * Uses navigator.share on mobile if available.
     */
    static async downloadBlob(blob: Blob, filename: string) {
        console.log(`[VideoProcessor] Initiating download/share for ${filename} (${blob.type}, ${blob.size} bytes)`);

        try {
            const file = new File([blob], filename, { type: blob.type });
            const canShare = !!navigator.share && (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }));

            if (canShare) {
                await navigator.share({
                    files: [file],
                    title: 'Rival Fit',
                    text: 'Mira mi entrenamiento en Rival Fit #RivalFit'
                });
                return;
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error("[VideoProcessor] Share failed, falling back to download", err);
            } else {
                return;
            }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    private static drawWatermarkSync(ctx: CanvasRenderingContext2D, width: number, height: number) {
        if (!this.logoImage || !this.logoImage.complete) return;

        const time = performance.now();
        const corners = [
            { x: 'right', y: 'bottom' },
            { x: 'left', y: 'bottom' },
            { x: 'left', y: 'top' },
            { x: 'right', y: 'top' }
        ];
        const cornerIdx = Math.floor(time / 5000) % corners.length;
        const corner = corners[cornerIdx];

        const cycle = (time % 3000) / 3000;
        const pulse = Math.sin(cycle * Math.PI * 2);
        const alpha = 0.5 + (pulse * 0.1);
        const scale = 0.98 + (pulse * 0.02);

        // Responsive sizing
        const padding = width * 0.04;
        const logoSize = width * 0.04 * scale;
        const fontSize = width * 0.025;
        const boxPaddingH = width * 0.02;
        const boxPaddingV = width * 0.012;
        
        ctx.font = `italic 900 ${fontSize}px Inter, sans-serif`;
        const text = "rivalfit.app";
        const textWidth = ctx.measureText(text).width;
        
        const boxWidth = logoSize + textWidth + (boxPaddingH * 3);
        const boxHeight = Math.max(logoSize, fontSize) + (boxPaddingV * 2);

        let finalX = 0;
        let finalY = 0;

        if (corner.x === 'right') {
            finalX = width - boxWidth - padding;
        } else {
            finalX = padding;
        }

        if (corner.y === 'bottom') {
            finalY = height - boxHeight - padding;
        } else {
            finalY = padding;
        }

        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Draw Glassmorphic Box
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 15;
        
        // Round Rect implementation
        const r = 8;
        ctx.beginPath();
        ctx.moveTo(finalX + r, finalY);
        ctx.lineTo(finalX + boxWidth - r, finalY);
        ctx.quadraticCurveTo(finalX + boxWidth, finalY, finalX + boxWidth, finalY + r);
        ctx.lineTo(finalX + boxWidth, finalY + boxHeight - r);
        ctx.quadraticCurveTo(finalX + boxWidth, finalY + boxHeight, finalX + boxWidth - r, finalY + boxHeight);
        ctx.lineTo(finalX + r, finalY + boxHeight);
        ctx.quadraticCurveTo(finalX, finalY + boxHeight, finalX, finalY + boxHeight - r);
        ctx.lineTo(finalX, finalY + r);
        ctx.quadraticCurveTo(finalX, finalY, finalX + r, finalY);
        ctx.closePath();
        ctx.fill();
        
        // Draw Logo
        ctx.drawImage(this.logoImage, finalX + boxPaddingH, finalY + (boxHeight - logoSize) / 2, logoSize, logoSize);
        
        // Draw Text
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(text, finalX + logoSize + (boxPaddingH * 1.5), finalY + boxHeight / 2);
        
        ctx.restore();
    }

    private static drawOutroSequence(ctx: CanvasRenderingContext2D, width: number, height: number, recorder: MediaRecorder) {
        const duration = 3000; // 3 seconds outro
        const startTime = performance.now();
        const logo = this.logoImage;

        const animate = (time: number) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Clear with deep black
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, width, height);

            // Subtle red radial glow
            const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.8);
            gradient.addColorStop(0, "rgba(220, 38, 38, 0.15)");
            gradient.addColorStop(1, "transparent");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            if (logo && logo.complete) {
                // Logo animation: fade in and slight scale up
                const logoProgress = Math.min(progress / 0.4, 1);
                const logoSize = (width * 0.4) * (0.95 + (logoProgress * 0.05));
                ctx.save();
                ctx.globalAlpha = logoProgress;
                ctx.drawImage(logo, (width - logoSize) / 2, (height - logoSize) / 2 - 40, logoSize, logoSize);
                ctx.restore();
            }

            // Text animation: fade in after logo
            const textAlpha = Math.max(0, (progress - 0.4) / 0.4);
            if (textAlpha > 0) {
                ctx.save();
                ctx.globalAlpha = textAlpha;
                ctx.fillStyle = "#FFFFFF";
                ctx.font = `italic 900 ${Math.floor(width * 0.08)}px Inter, sans-serif`;
                ctx.textAlign = "center";
                ctx.fillText("rivalfit.app", width / 2, height / 2 + (width * 0.25));
                ctx.restore();
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Final flush and stop
                setTimeout(() => {
                    if (recorder.state !== 'inactive') recorder.stop();
                }, 100);
            }
        };
        requestAnimationFrame(animate);
    }
}