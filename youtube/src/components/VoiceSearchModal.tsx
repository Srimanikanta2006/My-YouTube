"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, X, RefreshCw, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "./ui/button";

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (transcript: string) => void;
}

export default function VoiceSearchModal({
  isOpen,
  onClose,
  onSearch,
}: VoiceSearchModalProps) {
  const [status, setStatus] = useState<
    "listening" | "searching" | "success" | "denied" | "unsupported" | "no_speech"
  >("listening");
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus("unsupported");
      return;
    }

    setStatus("listening");
    setTranscript("");

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let finalResult = "";

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        finalResult = currentTranscript;
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setStatus("denied");
        } else if (event.error === "no-speech") {
          setStatus("no_speech");
        }
      };

      recognition.onend = () => {
        if (finalResult.trim()) {
          setStatus("searching");
          setTimeout(() => {
            setStatus("success");
            setTimeout(() => {
              onSearch(finalResult.trim());
            }, 300);
          }, 500);
        } else {
          setStatus("no_speech");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setStatus("no_speech");
    }
  };

  const handleRequestMicAndStart = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop());
          startListening();
        })
        .catch(() => {
          setStatus("denied");
        });
    } else {
      startListening();
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleRequestMicAndStart();
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300 font-sans">
      {/* Top-Right X Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-3 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer z-50"
        title="Close"
        aria-label="Close voice search"
      >
        <X className="w-7 h-7" />
      </button>

      <div className="flex flex-col items-center text-center space-y-8 animate-in zoom-in-95 duration-200 max-w-lg w-full px-4 select-none">
        {/* 1. Listening State */}
        {status === "listening" && (
          <>
            <div className="relative my-4 flex items-center justify-center">
              {/* Soft Red Pulse & Expanding Outer Rings */}
              <div className="w-28 h-28 rounded-full bg-red-600/30 animate-ping absolute inset-0" />
              <div className="w-28 h-28 rounded-full bg-red-600/20 animate-pulse absolute inset-0 scale-125" />
              
              {/* Main Glowing Red Mic Button */}
              <div className="w-28 h-28 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_60px_rgba(220,38,38,0.7)] relative z-10 transition-all duration-300 animate-pulse">
                <Mic className="w-14 h-14 text-white" />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Listening...
              </h3>
              <div className="min-h-[56px] flex items-center justify-center">
                {transcript ? (
                  <p className="text-xl md:text-2xl font-bold text-white leading-snug animate-in fade-in duration-150">
                    "{transcript}"
                  </p>
                ) : (
                  <p className="text-sm md:text-base font-medium text-white/60 tracking-wide">
                    Say something to search YouTube...
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* 2. Searching Loading State */}
        {status === "searching" && (
          <div className="py-8 flex flex-col items-center space-y-5 animate-in fade-in duration-150">
            <Loader2 className="w-14 h-14 text-red-500 animate-spin" />
            <h3 className="text-2xl font-bold text-white">
              Searching...
            </h3>
            {transcript && (
              <p className="text-lg text-white/80 font-medium italic">
                "{transcript}"
              </p>
            )}
          </div>
        )}

        {/* 3. Success Checkmark */}
        {status === "success" && (
          <div className="py-8 flex flex-col items-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white">
              "{transcript}"
            </h3>
          </div>
        )}

        {/* 4. Didn't Catch That State */}
        {status === "no_speech" && (
          <div className="py-6 flex flex-col items-center space-y-6 animate-in fade-in duration-200">
            <button
              onClick={handleRequestMicAndStart}
              className="w-24 h-24 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all transform hover:scale-105 cursor-pointer shadow-lg"
              title="Tap to try again"
            >
              <Mic className="w-12 h-12 opacity-80" />
            </button>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white">
                Didn't catch that. Try again.
              </h3>
              <p className="text-sm text-white/60">
                Tap the microphone to speak.
              </p>
            </div>
            <Button
              onClick={handleRequestMicAndStart}
              className="rounded-full px-7 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center gap-2 cursor-pointer shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </Button>
          </div>
        )}

        {/* 5. Permission Denied State */}
        {status === "denied" && (
          <div className="py-6 flex flex-col items-center space-y-5 animate-in fade-in duration-200">
            <div className="w-20 h-20 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white">
                Microphone access denied
              </h3>
              <p className="text-sm text-white/60 max-w-xs leading-relaxed">
                Please allow microphone permission in your browser to use voice search.
              </p>
            </div>
            <Button
              onClick={handleRequestMicAndStart}
              className="rounded-full px-7 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center gap-2 cursor-pointer shadow-md mt-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Permission</span>
            </Button>
          </div>
        )}

        {/* 6. Browser Unsupported State */}
        {status === "unsupported" && (
          <div className="py-6 flex flex-col items-center space-y-5 animate-in fade-in duration-200">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-white/50">
              <Mic className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white">
                Voice search isn't supported
              </h3>
              <p className="text-sm text-white/60 max-w-xs">
                Voice search is not supported in this browser. Please try Chrome or Edge.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
