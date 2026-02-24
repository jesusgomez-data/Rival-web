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
    static async processMedia(mediaUrl: string, mediaType: 'video' | 'image' | string): Promise<Blob> {
        // Pre-load assets first
        await this.loadAssets().catch(err => console.error("Assets load failed", err));

        if (mediaType === 'video' || (typeof mediaType === 'string' && mediaType.includes('video'))) {
            return this.processVideo(mediaUrl);
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

    private static async processVideo(videoUrl: string): Promise<Blob> {
        const video = document.createElement('video');
        video.crossOrigin = "anonymous";
        video.src = videoUrl;
        video.muted = false; // Ensure unmuted for capture
        video.volume = 1.0;
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
        const targetWidth = video.videoWidth > 1280 ? 1280 : video.videoWidth;
        const targetHeight = (video.videoHeight / video.videoWidth) * targetWidth;
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error("Could not get canvas context");

        // Step 2: Set up AudioContext for precise capture
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
        const canvasStream = canvas.captureStream(30);
        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...destination.stream.getAudioTracks()
        ]);

        const supportedType = this.getSupportedMimeType();
        const chunks: Blob[] = [];
        const recorder = new MediaRecorder(combinedStream, {
            mimeType: supportedType,
            videoBitsPerSecond: 8000000
        });

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        return new Promise(async (resolve, reject) => {
            let isOutroStarted = false;
            const frameDuration = 1000 / 30;
            let lastFrameTime = 0;
            let processActive = true;

            const processingTimeout = setTimeout(() => {
                if (processActive) {
                    processActive = false;
                    clearInterval(fallbackLoop);
                    if (recorder.state !== 'inactive') recorder.stop();
                    reject(new Error("Video processing timed out (60s limit)"));
                }
            }, 60000);

            recorder.onstop = () => {
                clearTimeout(processingTimeout);
                const blob = new Blob(chunks, { type: supportedType });
                resolve(blob);
                video.remove();
                audioContext.close();
            };

            recorder.onerror = (e) => {
                processActive = false;
                reject(e);
            };

            const drawFrame = (time: number = performance.now()) => {
                if (!processActive || isOutroStarted) return;

                if (video.ended || video.paused && video.currentTime >= video.duration - 0.1) {
                    isOutroStarted = true;
                    this.drawOutroSequence(ctx, canvas.width, canvas.height, recorder);
                    return;
                }

                if (time - lastFrameTime >= frameDuration) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    this.drawWatermarkSync(ctx, canvas.width, canvas.height);
                    lastFrameTime = time;
                }

                if (processActive) requestAnimationFrame(drawFrame);
            };

            // Enhanced fallback loop to prevent hanging if RAF is throttled
            const fallbackLoop = setInterval(() => {
                if (!processActive) {
                    clearInterval(fallbackLoop);
                    return;
                }

                if (!isOutroStarted) {
                    drawFrame(performance.now());
                } else {
                    clearInterval(fallbackLoop);
                }
            }, 100);

            try {
                recorder.start();
                await video.play();
                requestAnimationFrame(drawFrame);
            } catch (err) {
                console.error("Video processing failed to start", err);
                processActive = false;
                clearInterval(fallbackLoop);
                if (recorder.state !== 'inactive') recorder.stop();
                reject(err);
            }
        });
    }

    private static getSupportedMimeType(): string {
        const types = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4'
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return '';
    }

    private static drawWatermarkSync(ctx: CanvasRenderingContext2D, width: number, height: number) {
        if (!this.logoImage || !this.logoImage.complete) return;

        const time = performance.now();

        // Corner switching logic (every 5 seconds)
        const corners = [
            { x: 'right', y: 'bottom' },
            { x: 'left', y: 'bottom' },
            { x: 'left', y: 'top' },
            { x: 'right', y: 'top' }
        ];
        const cornerIdx = Math.floor(time / 5000) % corners.length;
        const corner = corners[cornerIdx];

        // Breathing effect: subtle pulse in alpha and scale
        const cycle = (time % 3000) / 3000;
        const pulse = Math.sin(cycle * Math.PI * 2);
        const alpha = 0.6 + (pulse * 0.15); // 0.45 to 0.75
        const scale = 0.98 + (pulse * 0.04); // 0.94 to 1.02

        const baseSize = width * 0.14;
        const logoSize = baseSize * scale;
        const padding = 24;

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
        ctx.drawImage(this.logoImage, finalX, finalY, logoSize, logoSize);
        ctx.restore();
    }

    private static drawOutroSequence(ctx: CanvasRenderingContext2D, width: number, height: number, recorder: MediaRecorder) {
        const duration = 2500;
        const startTime = performance.now();
        const logo = this.logoImage;

        const animate = (time: number) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);

            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, width, height);

            const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.6);
            gradient.addColorStop(0, "rgba(220, 38, 38, 0.1)");
            gradient.addColorStop(1, "transparent");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            if (logo && logo.complete) {
                const baseSize = width * 0.45;
                const entryProgress = Math.min(progress / 0.3, 1);
                const scale = 0.9 + (entryProgress * 0.1);
                const alpha = entryProgress;
                const curSize = baseSize * scale;

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.drawImage(logo, (width - curSize) / 2, (height - curSize) / 2 - 40, curSize, curSize);
                ctx.restore();
            }

            const textAlpha = Math.max(0, (progress - 0.3) / 0.4);
            if (textAlpha > 0) {
                ctx.save();
                ctx.globalAlpha = textAlpha;
                ctx.fillStyle = "#FFFFFF";
                ctx.font = `900 ${Math.floor(width * 0.08)}px Inter, sans-serif`;
                ctx.textAlign = "center";
                ctx.fillText("Rivalfit.app", width / 2, height / 2 + (width * 0.28));
                ctx.restore();
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setTimeout(() => {
                    if (recorder.state !== 'inactive') recorder.stop();
                }, 500);
            }
        };
        requestAnimationFrame(animate);
    }
}
