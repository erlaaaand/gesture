"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  RefObject,
  useMemo,
} from "react";
import MusicPlayer from "../components/MusicPlayer";
import CameraFeed, { CameraFeedHandle } from "../components/CameraFeed";
import { useHandTracking } from "../hook/useHandTracking";
import { playlist, Track } from "../lib/playlist";
import { Camera, Hand, Droplets } from "lucide-react";


// ─── Types ────────────────────────────────────────────────────────────────────
type ButtonKey = "prev" | "playPause" | "next";

interface HoverState {
  prev: number;
  playPause: number;
  next: number;
}

// ─── Audio Engine ─────────────────────────────────────────────────────────────
function useAudioEngine(
  currentIndex: number,
  setCurrentIndex: (i: number) => void,
  setIsPlaying: (v: boolean) => void
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio();
      a.volume = 0.8;
      a.preload = "auto";
      audioRef.current = a;
    }
    return audioRef.current;
  }, []);

  // Load + seek to startAt whenever the track changes
  useEffect(() => {
    const track = playlist[currentIndex];
    if (!track.src) return;
    const audio = getAudio();
    audio.pause();
    audio.src = track.src;
    const onMeta = () => {
      audio.currentTime = track.startAt ?? 0;
    };
    audio.addEventListener("loadedmetadata", onMeta, { once: true });
    audio.load();
    return () => audio.removeEventListener("loadedmetadata", onMeta);
  }, [currentIndex, getAudio]);

  const play = useCallback(() => {
    const audio = getAudio();
    const track = playlist[currentIndex];
    if (!track.src) {
      setIsPlaying(true);
      return;
    }
    // Ensure we are at the right seek position before playing
    const doPlay = () => {
      // Only seek if we haven't started yet (currentTime near 0 or before startAt)
      if (audio.currentTime < (track.startAt ?? 0)) {
        audio.currentTime = track.startAt ?? 0;
      }
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(true));
    };
    if (audio.readyState >= 2) {
      doPlay();
    } else {
      audio.addEventListener("loadedmetadata", doPlay, { once: true });
    }
  }, [currentIndex, getAudio, setIsPlaying]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, [setIsPlaying]);

  const next = useCallback(() => {
    const nextIdx = (currentIndex + 1) % playlist.length;
    setCurrentIndex(nextIdx);
    setIsPlaying(true);
  }, [currentIndex, setCurrentIndex, setIsPlaying]);

  const prev = useCallback(() => {
    const prevIdx = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prevIdx);
    setIsPlaying(true);
  }, [currentIndex, setCurrentIndex, setIsPlaying]);

  return { play, pause, next, prev, audioRef };
}

// ─── Instant Trigger Manager ──────────────────────────────────────────────────
// Triggers the action immediately when a finger enters a button zone.
// A cooldown prevents the same button from firing again within 800ms.
const TRIGGER_COOLDOWN_MS = 800;

function useDwellManager(onTrigger: (button: ButtonKey) => void) {
  const cooldownRef = useRef<Record<ButtonKey, number>>({
    prev: 0,
    playPause: 0,
    next: 0,
  });
  const [hoverState, setHoverState] = useState<HoverState>({
    prev: 0,
    playPause: 0,
    next: 0,
  });
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  const enterButton = useCallback((key: ButtonKey) => {
    const now = performance.now();
    if (now - cooldownRef.current[key] < TRIGGER_COOLDOWN_MS) return;
    cooldownRef.current[key] = now;
    // Trigger immediately — no waiting
    onTriggerRef.current(key);
    // Show visual "active" state briefly
    setHoverState((prev) => ({ ...prev, [key]: 1 }));
    setTimeout(() => {
      setHoverState((prev) => ({ ...prev, [key]: 0 }));
    }, 200);
  }, []);

  const leaveButton = useCallback((key: ButtonKey) => {
    setHoverState((prev) => ({ ...prev, [key]: 0 }));
  }, []);

  const handlePinchTrigger = useCallback((key: ButtonKey) => {
    const now = performance.now();
    if (now - cooldownRef.current[key] < TRIGGER_COOLDOWN_MS) return;
    cooldownRef.current[key] = now;
    onTriggerRef.current(key);
    setHoverState((prev) => ({ ...prev, [key]: 1 }));
    setTimeout(() => {
      setHoverState((prev) => ({ ...prev, [key]: 0 }));
    }, 200);
  }, []);

  return { hoverState, enterButton, leaveButton, handlePinchTrigger };
}

// ─── Collision Detection ───────────────────────────────────────────────────────
function useCollisionDetection(
  buttonRefs: Record<ButtonKey, RefObject<HTMLButtonElement | null>>,
  onEnter: (key: ButtonKey) => void,
  onLeave: (key: ButtonKey) => void,
  onPinch: (key: ButtonKey) => void
) {
  const activeButtonRef = useRef<ButtonKey | null>(null);

  const checkCollision = useCallback(
    (
      fingerPos: { x: number; y: number } | null,
      isPinching: boolean
    ) => {
      if (!fingerPos) {
        if (activeButtonRef.current) {
          onLeave(activeButtonRef.current);
          activeButtonRef.current = null;
        }
        return;
      }

      // Convert normalized coords (with mirror) to viewport pixel coords
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pixX = (1 - fingerPos.x) * vw;
      const pixY = fingerPos.y * vh;

      let hitButton: ButtonKey | null = null;

      for (const key of ["prev", "playPause", "next"] as ButtonKey[]) {
        const el = buttonRefs[key].current;
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (
          pixX >= rect.left &&
          pixX <= rect.right &&
          pixY >= rect.top &&
          pixY <= rect.bottom
        ) {
          hitButton = key;
          break;
        }
      }

      if (hitButton !== activeButtonRef.current) {
        if (activeButtonRef.current) onLeave(activeButtonRef.current);
        if (hitButton) onEnter(hitButton);
        activeButtonRef.current = hitButton;
      }

      if (isPinching && hitButton) {
        onPinch(hitButton);
      }
    },
    [buttonRefs, onEnter, onLeave, onPinch]
  );

  return { checkCollision };
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function Home() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBlurActive, setIsBlurActive] = useState(false);
  const [isPeaceDetected, setIsPeaceDetected] = useState(false);
  const [gestureEnabled, setGestureEnabled] = useState(false);
  const [fingerPos, setFingerPos] = useState<{ x: number; y: number } | null>(
    null
  );

  const currentTrack: Track = playlist[currentIndex];

  // ── Refs ───────────────────────────────────────────────────────────────────
  const cameraRef = useRef<CameraFeedHandle>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const prevBtnRef = useRef<HTMLButtonElement>(null);
  const playPauseBtnRef = useRef<HTMLButtonElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const buttonRefs = useMemo<Record<ButtonKey, RefObject<HTMLButtonElement | null>>>(() => ({
    prev: prevBtnRef,
    playPause: playPauseBtnRef,
    next: nextBtnRef,
  }), []);

  // ── Audio Engine ───────────────────────────────────────────────────────────
  const { play, pause, next, prev, audioRef } = useAudioEngine(
    currentIndex,
    setCurrentIndex,
    setIsPlaying
  );

  // ── Button trigger handler ─────────────────────────────────────────────────
  const handleButtonTrigger = useCallback(
    (key: ButtonKey) => {
      if (key === "playPause") {
        if (isPlayingRef.current) pause();
        else play();
      } else if (key === "next") {
        next();
      } else {
        prev();
      }
    },
    [play, pause, next, prev]
  );

  // ── Dwell Manager ──────────────────────────────────────────────────────────
  const { hoverState, enterButton, leaveButton, handlePinchTrigger } =
    useDwellManager(handleButtonTrigger);

  // ── Collision Detection ────────────────────────────────────────────────────
  const { checkCollision } = useCollisionDetection(
    buttonRefs,
    enterButton,
    leaveButton,
    handlePinchTrigger
  );

  // ── Gesture Update Handler (Integration Agent core logic) ──────────────────
  const handleGestureUpdate = useCallback(
    (data: {
      isPeaceGestureDetected: boolean;
      isPinchGestureDetected: boolean;
      indexFingerScreenPos: { x: number; y: number } | null;
    }) => {
      const { isPeaceGestureDetected, isPinchGestureDetected, indexFingerScreenPos } =
        data;

      setIsPeaceDetected(isPeaceGestureDetected);
      setFingerPos(indexFingerScreenPos);

      // ── CORE LOGIC: blur only if BOTH conditions are true ──────────────────
      // Condition 1: isAudioPlaying === true
      // Condition 2: isPeaceGestureDetected === true
      setIsBlurActive(isPlayingRef.current && isPeaceGestureDetected);

      // ── Collision Detection for virtual button control ────────────────────
      checkCollision(indexFingerScreenPos, isPinchGestureDetected);
    },
    [checkCollision]
  );

  // ── Hand Tracking Hook ─────────────────────────────────────────────────────
  const { modelLoaded, modelLoading, error } = useHandTracking({
    onGestureUpdate: handleGestureUpdate,
    videoRef: videoRef as RefObject<HTMLVideoElement | null>,
    canvasRef: canvasRef as RefObject<HTMLCanvasElement | null>,
    enabled: gestureEnabled,
  });

  // ── Video ready callback ───────────────────────────────────────────────────
  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    videoRef.current = video;
  }, []);

  // ── Sync blur state when playing state changes ────────────────────────────
  useEffect(() => {
    if (!isPlaying) setIsBlurActive(false);
  }, [isPlaying]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col items-center justify-between min-h-screen w-full overflow-hidden" style={{ background: "#f5f0e8" }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header
        className="relative z-10 w-full flex items-center justify-between px-5 py-3"
        style={{ background: "#1a1a1a", borderBottom: "3px solid #1a1a1a" }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: "#888", fontSize: "12px", fontWeight: 500 }}>
            · Virtual Touch
          </span>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2">
          <span
            style={{
              padding: "2px 10px",
              background: "#fff",
              border: "2px solid #ffe44e",
              color: "#1a1a1a",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              visibility: isBlurActive ? "visible" : "hidden",
            }}
          >
            <span className="flex items-center gap-1.5">
              <Droplets size={14} strokeWidth={3} /> BLUR ON
            </span>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: 8,
                height: 8,
                background: modelLoaded ? "#44ff88" : modelLoading ? "#ffe44e" : "#555",
                border: "2px solid " + (modelLoaded ? "#44ff88" : modelLoading ? "#ffe44e" : "#555"),
              }}
            />
            <span style={{ color: "#aaa", fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>
              {modelLoaded ? "AI READY" : modelLoading ? "LOADING…" : "AI OFF"}
            </span>
          </div>
        </div>
      </header>

      {/* ── Main content: Camera (background) + Player (overlay) ─────────── */}
      <main className="relative flex-1 w-full flex items-center justify-center">
        {/* Camera Feed — full width background */}
        {gestureEnabled && (
          <div className="absolute inset-0">
            <CameraFeed
              ref={cameraRef}
              isBlurActive={isBlurActive}
              canvasRef={canvasRef as RefObject<HTMLCanvasElement | null>}
              onVideoReady={handleVideoReady}
            />
          </div>
        )}

        {/* Placeholder when camera is off */}
        {!gestureEnabled && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#e8e3d8" }}>
            <div className="text-center" style={{ opacity: 0.4 }}>
              <div className="flex justify-center mb-2">
                <Camera size={64} strokeWidth={2} color="#1a1a1a" />
              </div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a", textTransform: "uppercase", letterSpacing: "1px", marginTop: "8px" }}>
                Aktifkan Gesture
              </p>
            </div>
          </div>
        )}

        {/* ── Music Player Card (foreground, top-left) ──────────────────────── */}
        <div style={{ position: "absolute", top: "16px", left: "16px", zIndex: 20 }}>
          <MusicPlayer
            currentTrack={currentTrack}
            currentIndex={currentIndex}
            isPlaying={isPlaying}
            onPlay={play}
            onPause={pause}
            onNext={next}
            onPrev={prev}
            onTrackChange={(i, _track) => setCurrentIndex(i)}
            onPlayingChange={setIsPlaying}
            hoverState={hoverState}
            buttonRefs={buttonRefs}
            audioRef={audioRef}
          />
        </div>
      </main>

      {/* ── Footer Controls ────────────────────────────────────────────────── */}
      <footer
        className="relative z-10 w-full px-5 py-3 flex items-center justify-between gap-4"
        style={{ background: "#1a1a1a", borderTop: "3px solid #1a1a1a" }}
      >
        {/* Gesture toggle button */}
        <button
          id="gesture-toggle-btn"
          onClick={() => setGestureEnabled((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            background: gestureEnabled ? "#ffe44e" : "#333",
            border: "3px solid " + (gestureEnabled ? "#ffe44e" : "#555"),
            boxShadow: gestureEnabled ? "3px 3px 0px #fff" : "3px 3px 0px #555",
            color: gestureEnabled ? "#1a1a1a" : "#aaa",
            fontWeight: 800,
            fontSize: "12px",
            textTransform: "uppercase" as const,
            letterSpacing: "0.5px",
            cursor: "pointer",
            transition: "all 0.1s",
          }}
        >
          {gestureEnabled ? (
            <span className="flex items-center gap-2"><Hand size={16} strokeWidth={3} /> GESTURE ON</span>
          ) : (
            <span className="flex items-center gap-2"><Hand size={16} strokeWidth={3} /> AKTIFKAN GESTURE</span>
          )}
        </button>
      </footer>

      {/* ── Error message ─────────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            padding: "10px 18px",
            background: "#ff4444",
            border: "3px solid #1a1a1a",
            boxShadow: "4px 4px 0px #1a1a1a",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 800,
            textTransform: "uppercase",
          }}
        >
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}

