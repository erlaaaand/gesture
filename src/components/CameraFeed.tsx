"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

interface CameraFeedProps {
  isBlurActive: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onVideoReady?: (video: HTMLVideoElement) => void;
}

export interface CameraFeedHandle {
  videoElement: HTMLVideoElement | null;
}

const CameraFeed = forwardRef<CameraFeedHandle, CameraFeedProps>(
  ({ isBlurActive, canvasRef, onVideoReady }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useImperativeHandle(ref, () => ({
      get videoElement() {
        return videoRef.current;
      },
    }));

    useEffect(() => {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, facingMode: "user" },
            audio: false,
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              if (videoRef.current && onVideoReady) {
                onVideoReady(videoRef.current);
              }
            };
          }
        } catch (err) {
          console.error("Camera access denied:", err);
        }
      };

      startCamera();

      return () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };
    }, [onVideoReady]);

    return (
      <div className="relative w-full h-full overflow-hidden">
        {/* Video feed - mirrored for natural feel */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={[
            "w-full h-full object-cover",
            "scale-x-[-1]", // Mirror transform
            "transition-all duration-500 ease-in-out",
            isBlurActive ? "blur-xl brightness-75" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />

        {/* Canvas overlay for hand landmark visualization */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none scale-x-[-1]"
        />

      </div>
    );
  }
);

CameraFeed.displayName = "CameraFeed";
export default CameraFeed;