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
        const video = document.createElement('video');
        video.crossOrigin = "anonymous";
        video.src = videoUrl;
        video.muted = true; // Use true for initial processing to avoid autoplay blocks
        video.playsInline = true;
        video.preload = "auto";

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
        // Optimization: Cap at 720p (1280px wide) for processing stability on mobile
        const MAX_WIDTH = 1280;
        const targetWidth = video.videoWidth > MAX_WIDTH ? MAX_WIDTH : video.videoWidth;
        const targetHeight = (video.videoHeight / video.videoWidth) * targetWidth;
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        if (!ctx) throw new Error("Could not get canvas context");

        // Step 2: Set up AudioContext for precise capture
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        const destination = audioContext.createMediaStreamDestination();
        const source = audioContext.createMediaElementSource(video);

        // Connect to destination stream for recording
        source.connect(destination);

        // Connect to a GainNode with 0 volume to keep it physically silent but "active" for processing
        const silentGain = audioContext.createGain();
        silentGain.gain.value = 0;
        source.connect(silentGain);
        silentGain.connect(audioContext.destination);

        // Step 3: Combine Canvas and Audio streams
        // Use 25fps for better stability across devices
        const canvasStream = canvas.captureStream(25);
        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...destination.stream.getAudioTracks()
        ]);

        const supportedType = this.getSupportedMimeType();
        const chunks: Blob[] = [];
        const recorder = new MediaRecorder(combinedStream, {
            mimeType: supportedType,
            videoBitsPerSecond: 8000000 // Optimized bitrate (8Mbps) for stability
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
                recorder.start();
                video.muted = false;
                video.volume = 1.0;
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
            'video/mp4;codecs=avc1', // H.264 for widest compatibility
            'video/mp4',
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm'
        ];
        for (const type of types) {
            if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type;
        }
        return 'video/webm';
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
        const alpha = 0.6 + (pulse * 0.15);
        const scale = 0.98 + (pulse * 0.04);

        const baseSize = width * 0.14;
        const logoSize = baseSize * scale;
        const padding = width * 0.05;

        let finalX = 0;
        let finalY = 0;

        if (corner.x === 'right') {
            finalX = width - baseSize - padding + (baseSize - logoSize) / 2;
        } else {
            finalX = padding + (baseSize - logoSize) / 2;
        }

        if (corner.y === 'bottom') {
            finalY = height - baseSize - padding + (baseSize - logoSize) / 2;
        } else {
            finalY = padding + (baseSize - logoSize) / 2;
        }

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.drawImage(this.logoImage, finalX, finalY, logoSize, logoSize);
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