"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Track } from "../lib/playlist";

interface MusicPlayerProps {
  currentTrack: Track;
  currentIndex: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onTrackChange: (index: number, track: Track) => void;
  onPlayingChange: (playing: boolean) => void;
  hoverState: { prev: number; playPause: number; next: number };
  buttonRefs: {
    prev: React.RefObject<HTMLButtonElement | null>;
    playPause: React.RefObject<HTMLButtonElement | null>;
    next: React.RefObject<HTMLButtonElement | null>;
  };
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

function formatTime(secs: number): string {
  if (!isFinite(secs) || isNaN(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MusicPlayer({
  currentTrack,
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrev,
  hoverState,
  buttonRefs,
  audioRef,
}: MusicPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const rafRef = useRef<number>(0);

  // Poll audio currentTime via rAF for smooth progress
  useEffect(() => {
    const tick = () => {
      const audio = audioRef.current;
      if (audio && !isDragging) {
        setCurrentTime(audio.currentTime);
        if (audio.duration && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [audioRef, isDragging]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setDragValue(val);
    setCurrentTime(val);
  }, []);

  const commitSeek = useCallback((val: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
    setCurrentTime(val);
    setIsDragging(false);
  }, [audioRef]);

  const displayTime = isDragging ? dragValue : currentTime;
  const progress = duration > 0 ? displayTime / duration : 0;

  return (
    <>
      <style>{`
        @keyframes nb-bar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
        .nb-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          background: transparent;
          cursor: pointer;
          outline: none;
          position: relative;
          z-index: 2;
        }
        .nb-slider::-webkit-slider-runnable-track {
          height: 6px;
          background: #ddd;
          border: 2px solid #1a1a1a;
        }
        .nb-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          background: #ffe44e;
          border: 2px solid #1a1a1a;
          margin-top: -6px;
          cursor: pointer;
          box-shadow: 1px 1px 0 #1a1a1a;
        }
        .nb-slider:hover::-webkit-slider-thumb {
          background: #ffd700;
          width: 16px;
          height: 16px;
          margin-top: -7px;
        }
        .nb-slider::-moz-range-track {
          height: 6px;
          background: #ddd;
          border: 2px solid #1a1a1a;
        }
        .nb-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: #ffe44e;
          border: 2px solid #1a1a1a;
          border-radius: 0;
          cursor: pointer;
        }
      `}</style>

      {/* ── Compact horizontal card ─────────────────────────────────── */}
      <div
        style={{
          background: "#f5f0e8",
          border: "3px solid #1a1a1a",
          boxShadow: "5px 5px 0px #1a1a1a",
          padding: "10px 12px",
          width: "300px",
          fontFamily: "'Space Grotesk', 'Inter', sans-serif",
        }}
      >
        {/* Row 1: Album art + song info */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* Album art — small square */}
          <div
            style={{
              width: "52px",
              height: "52px",
              border: "2px solid #1a1a1a",
              flexShrink: 0,
              overflow: "hidden",
              position: "relative",
              background: "#ddd",
              boxShadow: "2px 2px 0px #1a1a1a",
            }}
          >
            <Image
              src={currentTrack.albumImage}
              alt={currentTrack.title}
              fill
              style={{ objectFit: "cover" }}
              unoptimized
            />
          </div>

          {/* Song info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 900,
                fontSize: "12px",
                color: "#1a1a1a",
                letterSpacing: "-0.2px",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.2,
              }}
            >
              {currentTrack.title}
            </div>
            <div style={{ fontWeight: 500, fontSize: "10px", color: "#666", marginTop: "2px" }}>
              {currentTrack.artist}
            </div>
            {/* Time + playing bars */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#1a1a1a",
                  background: "#ffe44e",
                  border: "1.5px solid #1a1a1a",
                  padding: "0 4px",
                  letterSpacing: "0.3px",
                  whiteSpace: "nowrap",
                }}
              >
                {formatTime(displayTime)} / {formatTime(duration)}
              </span>
              {isPlaying && (
                <div style={{ display: "flex", gap: "2px", alignItems: "flex-end", height: "12px" }}>
                  {[55, 100, 35, 75].map((h, i) => (
                    <span
                      key={i}
                      style={{
                        width: "2px",
                        background: "#1a1a1a",
                        display: "block",
                        height: `${h}%`,
                        animation: `nb-bar 0.7s ease-in-out ${i * 0.12}s infinite alternate`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Seek slider */}
        <div style={{ marginTop: "8px" }}>
          <input
            type="range"
            className="nb-slider"
            min={0}
            max={duration || 100}
            step={0.1}
            value={isDragging ? dragValue : displayTime}
            onMouseDown={() => { setIsDragging(true); setDragValue(displayTime); }}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setDragValue(val);
              setCurrentTime(val);
            }}
            onMouseUp={(e) => commitSeek(parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => commitSeek(parseFloat((e.currentTarget as HTMLInputElement).value))}
            style={{
              background: `linear-gradient(to right, #ffe44e ${progress * 100}%, #ddd ${progress * 100}%)`,
            }}
          />
        </div>

        {/* Row 3: Control buttons — centered */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "8px" }}>
          <ControlButton
            ref={buttonRefs.prev}
            onClick={onPrev}
            hoverProgress={hoverState.prev}
            aria-label="Previous track"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </ControlButton>

          <ControlButton
            ref={buttonRefs.playPause}
            onClick={isPlaying ? onPause : onPlay}
            hoverProgress={hoverState.playPause}
            primary
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </ControlButton>

          <ControlButton
            ref={buttonRefs.next}
            onClick={onNext}
            hoverProgress={hoverState.next}
            aria-label="Next track"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </ControlButton>
        </div>
      </div>
    </>
  );
}

// ─── Control Button ─────────────────────────────────────────────────────────────
interface ControlButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  hoverProgress: number;
  primary?: boolean;
  children: React.ReactNode;
}

const ControlButton = React.forwardRef<HTMLButtonElement, ControlButtonProps>(
  ({ hoverProgress, primary, children, style, onMouseEnter, onMouseLeave, ...props }, ref) => {
    const [isHovered, setIsHovered] = useState(false);
    const size = primary ? 48 : 36;
    const radius = size / 2 - 3;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - hoverProgress);
    const isActive = hoverProgress > 0 || isHovered;

    return (
      <button
        ref={ref}
        onMouseEnter={(e) => { setIsHovered(true); onMouseEnter?.(e); }}
        onMouseLeave={(e) => { setIsHovered(false); onMouseLeave?.(e); }}
        style={{
          position: "relative",
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: primary ? (isHovered ? "#ffd700" : "#ffe44e") : (isHovered ? "#e8e8e8" : "#fff"),
          border: "3px solid #1a1a1a",
          boxShadow: isActive ? "0 0 0 0" : "3px 3px 0px #1a1a1a",
          cursor: "pointer",
          color: "#1a1a1a",
          transition: "box-shadow 0.08s, transform 0.08s, background 0.08s",
          outline: "none",
          borderRadius: "0px",
          transform: isActive ? "translate(2px, 2px)" : "none",
          ...style,
        }}
        {...props}
      >
        {children}

        {/* Dwell progress ring */}
        {hoverProgress > 0 && (
          <svg
            style={{ position: "absolute", inset: 0, pointerEvents: "none", transform: "rotate(-90deg)" }}
            width={size}
            height={size}
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#1a1a1a"
              strokeWidth={2.5}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
            />
          </svg>
        )}
      </button>
    );
  }
);
ControlButton.displayName = "ControlButton";