"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  SkipForward,
  Loader2,
  Sparkles,
} from "lucide-react";
import { getBackendUrl } from "../lib/urlHelper";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
    videoduration?: string;
  };
  onNextVideo?: () => void;
  hasNextVideo?: boolean;
}

export default function VideoPlayer({ video, onNextVideo, hasNextVideo }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Control States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  // Gesture & Ripple States
  const [gestureRipple, setGestureRipple] = useState<{
    type: "forward" | "backward";
    id: number;
  } | null>(null);
  const [centerPlayIcon, setCenterPlayIcon] = useState<{
    type: "play" | "pause";
    id: number;
  } | null>(null);

  // Autoplay End Screen Countdown State
  const [isEnded, setIsEnded] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });

  // Source URL Resolution
  const backendUrl = getBackendUrl();
  const normalizedPath = video?.filepath ? video.filepath.replace(/\\/g, "/") : "";
  const videoSrcBase = normalizedPath.startsWith("http") ? normalizedPath : `${backendUrl}/${normalizedPath}`;
  let videoSrc = videoSrcBase || "";
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    videoSrc = videoSrc.replace(/^http:/, "https:");
  }

  // 1. Video Source Reset
  useEffect(() => {
    if (videoRef.current) {
      setIsBuffering(true);
      setIsPlaying(false);
      setIsEnded(false);
      setCountdown(5);
      videoRef.current.load();
    }
  }, [videoSrc]);

  // 2. Hide Controls Timer (Auto-fade after 3s)
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // 3. Autoplay End Screen Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isEnded && hasNextVideo && onNextVideo) {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      } else {
        onNextVideo();
      }
    }
    return () => clearTimeout(timer);
  }, [isEnded, countdown, hasNextVideo, onNextVideo]);

  // 4. Track Buffer Progress
  const updateProgress = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    if (videoRef.current.buffered.length > 0 && duration > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      setBufferedPercent((bufferedEnd / duration) * 100);
    }
  };

  // 5. Global Keyboard Shortcuts (Space, F, M, Left/Right, Up/Down, J/K/L)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          e.stopPropagation();
          togglePlay();
          break;
        case "f":
          e.preventDefault();
          e.stopPropagation();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          e.stopPropagation();
          toggleMute();
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          e.stopPropagation();
          seekByAmount(-10);
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          e.stopPropagation();
          seekByAmount(10);
          break;
        case "arrowup":
          e.preventDefault();
          e.stopPropagation();
          changeVolumeBy(0.1);
          break;
        case "arrowdown":
          e.preventDefault();
          e.stopPropagation();
          changeVolumeBy(-0.1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, isMuted, volume, duration]);

  // Play / Pause Toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isEnded) {
      setIsEnded(false);
      videoRef.current.currentTime = 0;
    }

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      triggerCenterIcon("pause");
      setShowControls(true);
    } else {
      videoRef.current.play().catch((err) => console.log("Play error:", err));
      setIsPlaying(true);
      triggerCenterIcon("play");
      handleMouseMove();
    }
  };

  const triggerCenterIcon = (type: "play" | "pause") => {
    setCenterPlayIcon({ type, id: Date.now() });
    setTimeout(() => setCenterPlayIcon(null), 500);
  };

  // Seek by Amount (+10s / -10s)
  const seekByAmount = (seconds: number) => {
    if (!videoRef.current) return;
    const targetDuration = duration || videoRef.current.duration || 100;
    const newTime = Math.min(Math.max(videoRef.current.currentTime + seconds, 0), targetDuration);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setGestureRipple({
      type: seconds > 0 ? "forward" : "backward",
      id: Date.now(),
    });
    setTimeout(() => setGestureRipple(null), 500);
  };

  // Change Volume by Delta
  const changeVolumeBy = (delta: number) => {
    if (!videoRef.current) return;
    const newVol = Math.min(Math.max(volume + delta, 0), 1);
    setVolume(newVol);
    videoRef.current.volume = newVol;
    videoRef.current.muted = newVol === 0;
    setIsMuted(newVol === 0);
  };

  // Volume Slider & Mute Toggle
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
    (e.target as HTMLElement).blur();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      const targetVol = prevVolume || 0.5;
      videoRef.current.volume = targetVol;
      setVolume(targetVol);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
      setVolume(0);
      setIsMuted(true);
    }
  };

  // Scrubber Progress Bar Seek
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
    (e.target as HTMLElement).blur();
  };

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    setHoverPosition(e.clientX - rect.left);
    setHoverTime(pos * duration);
  };

  const handleScrubberMouseLeave = () => {
    setHoverTime(null);
  };

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch((err) => console.log(err));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch((err) => console.log(err));
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Double-tap Mobile Gestures (<50% rewind, >=50% skip)
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    const touch = e.changedTouches[0];
    if (!containerRef.current || !touch) return;

    const rect = containerRef.current.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const timeDiff = now - lastTapRef.current.time;

    if (timeDiff < 300 && Math.abs(touchX - lastTapRef.current.x) < 40) {
      if (touchX < rect.width / 2) {
        seekByAmount(-10);
      } else {
        seekByAmount(10);
      }
    }
    lastTapRef.current = { time: now, x: touchX };
  };

  // Format Time Helper (MM:SS or HH:MM:SS)
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return "00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onTouchEnd={handleTouchEnd}
      className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden group select-none shadow-2xl border border-zinc-900"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoSrc}
        onClick={togglePlay}
        onTimeUpdate={updateProgress}
        onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
        onWaiting={() => setIsBuffering(true)}
        onSeeking={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setIsEnded(true);
          setShowControls(true);
        }}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
      />

      {/* 1. YouTube-style Centered Loading Ring Spinner */}
      {isBuffering && !isEnded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-20">
          <Loader2 className="w-12 h-12 text-white animate-spin opacity-90" />
        </div>
      )}

      {/* 2. Center Click Play/Pause Subtle Indicator */}
      {centerPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 transition-opacity duration-200">
          <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white shadow-xl border border-white/10">
            {centerPlayIcon.type === "play" ? (
              <Play className="w-8 h-8 fill-white ml-1" />
            ) : (
              <Pause className="w-8 h-8 fill-white" />
            )}
          </div>
        </div>
      )}

      {/* 3. Subtle YouTube-style Semi-Circular Ripple Seek Badges (-10s / +10s) */}
      {gestureRipple && (
        <div
          className={`absolute top-0 bottom-0 w-1/3 flex items-center justify-center pointer-events-none z-20 transition-opacity duration-300 ${
            gestureRipple.type === "backward"
              ? "left-0 rounded-r-full bg-white/10"
              : "right-0 rounded-l-full bg-white/10"
          }`}
        >
          <div className="flex flex-col items-center gap-1 text-white bg-black/70 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur shadow-lg">
            {gestureRipple.type === "backward" ? (
              <>
                <RotateCcw className="w-6 h-6 text-white" />
                <span className="text-[11px] font-bold text-white">-10s</span>
              </>
            ) : (
              <>
                <RotateCw className="w-6 h-6 text-white" />
                <span className="text-[11px] font-bold text-white">+10s</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* 4. Autoplay Next Video End Screen Overlay */}
      {isEnded && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center text-white space-y-4 animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
            <Sparkles className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">Up Next Video</h3>
            {hasNextVideo ? (
              <p className="text-xs text-gray-300 mt-1">
                Playing next video automatically in <strong className="text-white font-bold">{countdown}s</strong>
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">You reached the end of the video.</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setIsEnded(false);
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play();
                }
              }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold border border-zinc-700 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Replay
            </button>

            {hasNextVideo && onNextVideo && (
              <button
                onClick={onNextVideo}
                className="px-5 py-2 bg-white hover:bg-gray-100 text-black font-bold rounded-xl text-xs shadow transition-transform hover:scale-105 flex items-center gap-2 cursor-pointer"
              >
                <SkipForward className="w-4 h-4 fill-black" />
                Next Video ▶
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. Custom Control Bar Overlay (YouTube Layout & Sleek Dark Styling) */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-3 md:px-5 pb-3 pt-8 transition-opacity duration-300 z-20 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Scrubber Progress Bar with Draggable Circle Thumb (●) */}
        <div className="relative group/scrubber mb-2.5">
          {/* Timestamp Hover Tooltip */}
          {hoverTime !== null && (
            <div
              style={{ left: `${hoverPosition}px` }}
              className="absolute -top-7 -translate-x-1/2 bg-black/90 text-white text-[10px] font-mono px-2 py-0.5 rounded border border-white/20 pointer-events-none whitespace-nowrap shadow-md z-30"
            >
              {formatTime(hoverTime)}
            </div>
          )}

          {/* Progress Bar Display Container */}
          <div className="relative w-full h-1 group-hover/scrubber:h-2 transition-all bg-white/20 rounded-full overflow-visible cursor-pointer">
            {/* Buffer Line */}
            <div
              style={{ width: `${bufferedPercent}%` }}
              className="absolute top-0 bottom-0 left-0 bg-white/40 rounded-full transition-all"
            />
            {/* Played Line */}
            <div
              style={{ width: `${playedPercent}%` }}
              className="absolute top-0 bottom-0 left-0 bg-red-600 rounded-full transition-all"
            />
            {/* Draggable Red Circle Thumb (●) */}
            <div
              style={{ left: `${playedPercent}%` }}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-red-600 border-2 border-white rounded-full shadow-md transition-all group-hover/scrubber:scale-125 z-20 pointer-events-none"
            />
          </div>

          {/* Invisible Interactive Range Input Overlay */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            tabIndex={-1}
            onChange={handleSeekChange}
            onMouseMove={handleScrubberMouseMove}
            onMouseLeave={handleScrubberMouseLeave}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        </div>

        {/* Toolbar Buttons Layout: Left Group & Right Group */}
        <div className="flex items-center justify-between text-white">
          {/* Left Controls Group: Play, Rewind, Skip, Next, Volume, Time */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white ml-0.5" />
              )}
            </button>

            {/* Rewind -10s */}
            <button
              onClick={() => seekByAmount(-10)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
              title="Rewind 10s (Left Arrow)"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-[11px]">10</span>
            </button>

            {/* Skip +10s */}
            <button
              onClick={() => seekByAmount(10)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
              title="Skip 10s (Right Arrow)"
            >
              <RotateCw className="w-4 h-4" />
              <span className="text-[11px]">10</span>
            </button>

            {/* Next Video Button */}
            {hasNextVideo && onNextVideo && (
              <button
                onClick={onNextVideo}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                title="Next Video"
              >
                <SkipForward className="w-4 h-4 fill-white" />
                <span className="text-[11px] hidden sm:inline">Next</span>
              </button>
            )}

            {/* Expandable Volume Control */}
            <div className="flex items-center group/vol">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
                title={isMuted ? "Unmute (M)" : "Mute (M)"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-red-500" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <div className="w-0 group-hover/vol:w-16 md:group-hover/vol:w-20 transition-all duration-200 overflow-hidden flex items-center ml-1">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  tabIndex={-1}
                  onChange={handleVolumeChange}
                  className="w-full h-1 bg-white/40 accent-white rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Formatted Time Display */}
            <div className="text-[11px] md:text-xs font-mono text-gray-200 ml-1 select-none">
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1 text-gray-500">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls Group: Fullscreen */}
          <div className="flex items-center">
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
