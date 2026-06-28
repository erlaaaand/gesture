"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { analyzeHands } from "../lib/gestureDetection";

interface UseHandTrackingOptions {
  onGestureUpdate: (data: {
    isPeaceGestureDetected: boolean;
    isPinchGestureDetected: boolean;
    indexFingerScreenPos: { x: number; y: number } | null;
  }) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  enabled: boolean;
}

export function useHandTracking({
  onGestureUpdate,
  videoRef,
  canvasRef,
  enabled,
}: UseHandTrackingOptions) {
  const handLandmarkerRef = useRef<unknown>(null);
  const animFrameRef = useRef<number>(0);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onGestureUpdateRef = useRef(onGestureUpdate);
  useEffect(() => {
    onGestureUpdateRef.current = onGestureUpdate;
  }, [onGestureUpdate]);

  // Load MediaPipe model asynchronously (client-side only)
  const loadModel = useCallback(async () => {
    if (handLandmarkerRef.current || modelLoading) return;
    setModelLoading(true);

    try {
      // Dynamically import to avoid SSR issues
      const vision = await import("@mediapipe/tasks-vision");
      const { HandLandmarker, FilesetResolver } = vision;

      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );

      const handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 4, // Multi-user support as per CLAUDE.md
      });

      handLandmarkerRef.current = handLandmarker;
      setModelLoaded(true);
    } catch (err) {
      console.error("Failed to load MediaPipe model:", err);
      setError("Gagal memuat model deteksi tangan.");
    } finally {
      setModelLoading(false);
    }
  }, [modelLoading]);

  // Main detection loop using requestAnimationFrame
  const runDetectionLoop = useCallback(() => {
    if (!enabled || !modelLoaded || !handLandmarkerRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ensure canvas matches video dimensions
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    try {
      const landmarker = handLandmarkerRef.current as {
        detectForVideo: (video: HTMLVideoElement, ts: number) => {
          landmarks: Array<Array<{ x: number; y: number; z: number }>>;
          handedness: Array<Array<{ displayName: string }>>;
        };
      };
      const results = landmarker.detectForVideo(video, performance.now());

      // Clear previous canvas drawings
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Build hands data array
      const handsData = (results.landmarks || []).map(
        (landmarkSet: Array<{ x: number; y: number; z: number }>, i: number) => ({
          landmarks: landmarkSet,
          handedness:
            results.handedness?.[i]?.[0]?.displayName || "Unknown",
        })
      );

      const gestureData = analyzeHands(handsData);
      onGestureUpdateRef.current(gestureData);

      // Draw finger cursor on canvas if index finger is detected
      if (gestureData.indexFingerScreenPos) {
        const { x, y } = gestureData.indexFingerScreenPos;
        const pixX = x * canvas.width;
        const pixY = y * canvas.height;

        // Draw cursor dot
        ctx.beginPath();
        ctx.arc(pixX, pixY, 12, 0, Math.PI * 2);
        ctx.fillStyle = gestureData.isPinchGestureDetected
          ? "rgba(139, 92, 246, 0.9)" // purple when pinching
          : "rgba(255, 255, 255, 0.85)";
        ctx.fill();
        ctx.strokeStyle = "rgba(139, 92, 246, 0.8)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    } catch (e) {
      // Silently handle frame processing errors
    }

    animFrameRef.current = requestAnimationFrame(runDetectionLoop);
  }, [enabled, modelLoaded, videoRef, canvasRef]);

  // Start loop when model is ready and enabled
  useEffect(() => {
    if (enabled && modelLoaded) {
      runDetectionLoop();
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [enabled, modelLoaded, runDetectionLoop]);

  // Load model when enabled
  useEffect(() => {
    if (enabled && !modelLoaded) {
      loadModel();
    }
  }, [enabled, modelLoaded, loadModel]);

  return { modelLoaded, modelLoading, error };
}