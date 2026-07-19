import React, { useEffect, useState, useRef } from "react";
import { useUser } from "../lib/AuthContext";
import { getWsUrl, getBackendUrl } from "../lib/urlHelper";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { 
  Users, Video, VideoOff, Mic, MicOff, PhoneOff, 
  Send, ScreenShare, Copy, Check, MessageSquare, Disc, X, RefreshCw, Volume2, Menu
} from "lucide-react";

interface WatchPartyPanelProps {
  roomId: string;
  onLeave: () => void;
  videosList?: any[];
}

export default function WatchPartyPanel({ 
  roomId, 
  onLeave,
  videosList = []
}: WatchPartyPanelProps) {
  const { user } = useUser();
  const [copied, setCopied] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [wsReady, setWsReady] = useState(false);
  
  // Active selected video inside the theater
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [loadingVideos, setLoadingVideos] = useState(true);

  // Layout states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [activeRightPanel, setActiveRightPanel] = useState<"chat" | "members">("chat");
  const [unreadCount, setUnreadCount] = useState(0);
  const [openVolumeSliders, setOpenVolumeSliders] = useState<{ [uid: string]: boolean }>({});

  // Chat messages persisted in sessionStorage
  const [messages, setMessages] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(`chat_history_${roomId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          return [];
        }
      }
    }
    return [];
  });
  const [inputText, setInputText] = useState("");

  // WebRTC Audio/Video states
  const [localMediaReady, setLocalMediaReady] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ [uid: string]: MediaStream }>({});

  // Room Owner / Host authorization state
  const [roomHostUid, setRoomHostUid] = useState<string>("");
  const isHost = user && user._id === roomHostUid;

  // Retrieve user settings (Mute / Camera) from localStorage for persistence on refresh
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("watchparty_isMuted") === "true";
    }
    return false;
  });
  const [isVideoOff, setIsVideoOff] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("watchparty_isVideoOff") === "true";
    }
    return false;
  });
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);

  // Quality of Life Sync safeguard states
  const [laggingUsers, setLaggingUsers] = useState<{ [uid: string]: { name: string, lag: number } }>({});
  const [showLagBanner, setShowLagBanner] = useState("");

  // Enlarged Webcam Lightbox State
  const [activeEnlargedFeed, setActiveEnlargedFeed] = useState<{ uid: string; name: string; stream: MediaStream | null; videoOff: boolean } | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const isIncomingEvent = useRef(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  
  const peerConnectionsRef = useRef<{ [uid: string]: RTCPeerConnection }>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mobileMessagesEndRef = useRef<HTMLDivElement>(null);
  
  // MediaRecorder references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Refs for dynamic callbacks to avoid closing WebSocket connection on updates
  const videosListRef = useRef<any[]>(videosList);
  const myUidRef = useRef<string>("");
  const selectedVideoRef = useRef<any>(null);
  const isHostRef = useRef<boolean>(false);

  useEffect(() => {
    videosListRef.current = videosList;
    if (videosList.length > 0 && !selectedVideo) {
      setSelectedVideo(videosList[0]);
    }
    setLoadingVideos(false);
  }, [videosList]);

  useEffect(() => {
    selectedVideoRef.current = selectedVideo;
  }, [selectedVideo]);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  // Set persistent UID for this session
  if (!myUidRef.current) {
    myUidRef.current = user?._id || "guest_" + Math.random().toString(36).substring(2, 10);
  }

  // Generate clean invite link
  const inviteLink = typeof window !== "undefined" 
    ? `${window.location.origin}${window.location.pathname}?room=${roomId}&host=${roomHostUid}` 
    : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Scroll to bottom of chat list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    mobileMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatOpen]);

  // Reset unread count when chat slides open
  useEffect(() => {
    if (isChatOpen && activeRightPanel === "chat") {
      setUnreadCount(0);
    }
  }, [isChatOpen, activeRightPanel]);

  // Apply track configuration on local preview video node dynamically
  useEffect(() => {
    if (localVideoRef.current) {
      if (isScreenSharing && screenStreamRef.current) {
        localVideoRef.current.srcObject = screenStreamRef.current;
        localVideoRef.current.play().catch(e => {});
      } else if (localStream) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.play().catch(e => {});
      }
    }
  }, [localStream, isScreenSharing, isVideoOff]);

  // 1. Request Local Media Stream (Camera & Mic) on mount, using localStorage status
  useEffect(() => {
    const initLocalMedia = async () => {
      try {
        console.log("Requesting camera and microphone access...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, frameRate: 15 },
          audio: true
        });

        // Apply persistent state configs
        stream.getAudioTracks().forEach(t => t.enabled = !isMuted);
        stream.getVideoTracks().forEach(t => t.enabled = !isVideoOff);

        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        console.log("Local camera stream active");
      } catch (err) {
        console.error("Camera access failed (hardware lock or permission). Falling back to mic-only:", err);
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStream.getAudioTracks().forEach(t => t.enabled = !isMuted);

          setLocalStream(audioStream);
          localStreamRef.current = audioStream;
          setIsVideoOff(true);
          localStorage.setItem("watchparty_isVideoOff", "true");
          console.log("Local audio-only stream active");
        } catch (audioErr) {
          console.error("Audio-only capture also failed:", audioErr);
        }
      } finally {
        setLocalMediaReady(true);
      }
    };
    initLocalMedia();

    return () => {
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      screenStreamRef.current?.getTracks().forEach(track => track.stop());
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // 2. WebRTC Peer Connection Manager
  const createPeerConnection = (targetUid: string, targetName: string, isInitiator: boolean) => {
    if (peerConnectionsRef.current[targetUid]) {
      return peerConnectionsRef.current[targetUid];
    }

    console.log(`Creating RTCPeerConnection for target: ${targetName} (${targetUid}), initiator: ${isInitiator}`);
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    });

    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current?.readyState === 1) {
        socketRef.current.send(JSON.stringify({
          type: "signal",
          targetUid: targetUid,
          signal: { candidate: event.candidate }
        }));
      }
    };

    pc.ontrack = (event) => {
      console.log(`Received remote track from peer: ${targetName}`);
      const remoteStream = event.streams[0];
      setRemoteStreams(prev => ({
        ...prev,
        [targetUid]: remoteStream
      }));
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${targetName}: ${pc.connectionState}`);
      if (
        pc.connectionState === "disconnected" || 
        pc.connectionState === "failed" || 
        pc.connectionState === "closed"
      ) {
        closePeerConnection(targetUid);
      }
    };

    peerConnectionsRef.current[targetUid] = pc;
    return pc;
  };

  const closePeerConnection = (uid: string) => {
    if (peerConnectionsRef.current[uid]) {
      peerConnectionsRef.current[uid].close();
      delete peerConnectionsRef.current[uid];
    }
    setRemoteStreams(prev => {
      const copy = { ...prev };
      delete copy[uid];
      return copy;
    });
  };

  // 3. Establish WebSocket connection & handle signaling lifecycle (delayed until media is ready)
  useEffect(() => {
    if (!localMediaReady) return;

    const wsUrl = getWsUrl();
    
    console.log(`Connecting to WebSocket signaling: ${wsUrl}`);
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connection established");
      setWsReady(true);
      (window as any).partyWs = socket;
      
      socket.send(JSON.stringify({
        type: "join",
        roomId: roomId,
        uid: myUidRef.current,
        name: user?.name || "Guest"
      }));

      // Broadcast initial media states
      socket.send(JSON.stringify({
        type: "user-media-state",
        uid: myUidRef.current,
        videoOff: isVideoOff,
        muted: isMuted,
        isScreenSharing: isScreenSharing
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "room-users":
            setParticipants(data.users);
            if (data.hostUid) {
              setRoomHostUid(data.hostUid);
            }
            break;

          case "peer-joined":
            setParticipants(prev => {
              if (prev.some(p => p.uid === data.uid)) return prev;
              return [...prev, { uid: data.uid, name: data.name, videoOff: data.videoOff, muted: data.muted, isScreenSharing: data.isScreenSharing }];
            });
            if (data.hostUid) {
              setRoomHostUid(data.hostUid);
            }

            // If I am the host, sync the new peer with our current video ID and current play head parameters
            if (isHostRef.current && selectedVideoRef.current) {
              socket.send(JSON.stringify({
                type: "host-sync-state",
                targetUid: data.uid,
                videoId: selectedVideoRef.current._id,
                time: videoRef.current ? videoRef.current.currentTime : 0,
                paused: videoRef.current ? videoRef.current.paused : true
              }));
            }

            if (localStreamRef.current) {
              const pc = createPeerConnection(data.uid, data.name, true);
              pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                  socket.send(JSON.stringify({
                    type: "signal",
                    targetUid: data.uid,
                    signal: { sdp: pc.localDescription }
                  }));
                })
                .catch(err => console.error("Error creating WebRTC offer:", err));
            }
            break;

          case "peer-left":
            setParticipants(prev => prev.filter(p => p.uid !== data.uid));
            closePeerConnection(data.uid);
            setLaggingUsers(prev => {
              const copy = { ...prev };
              delete copy[data.uid];
              return copy;
            });
            break;

          case "new-host":
            console.log("Room host transferred to:", data.hostUid);
            setRoomHostUid(data.hostUid);
            break;

          case "host-sync-state":
            if (videosListRef.current) {
              const video = videosListRef.current.find((v: any) => v._id === data.videoId);
              if (video) {
                console.log("Joined room, synced with host video:", video.videotitle);
                setSelectedVideo(video);
                selectedVideoRef.current = video;

                // Sync the timeline play head after buffering delay
                setTimeout(() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = data.time;
                    if (!data.paused) {
                      videoRef.current.play().catch(e => {});
                    } else {
                      videoRef.current.pause();
                    }
                  }
                }, 800);
              }
            }
            break;

          case "signal": {
            const { senderUid, senderName, signal } = data;
            const pc = createPeerConnection(senderUid, senderName, false);

            if (signal.sdp) {
              pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
                .then(() => {
                  if (signal.sdp.type === "offer") {
                    pc.createAnswer()
                      .then(answer => pc.setLocalDescription(answer))
                      .then(() => {
                        socket.send(JSON.stringify({
                          type: "signal",
                          targetUid: senderUid,
                          signal: { sdp: pc.localDescription }
                        }));
                      });
                  }
                })
                .catch(err => console.error("Error handling SDP description:", err));
            } else if (signal.candidate) {
              pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
                .catch(err => console.error("Error adding ICE candidate:", err));
            }
            break;
          }

          case "video-control":
            if (!videoRef.current) return;
            isIncomingEvent.current = true;

            if (data.action === "play") {
              videoRef.current.currentTime = data.time;
              videoRef.current.play().catch(err => console.log("Play sync interrupted:", err));
            } else if (data.action === "pause") {
              videoRef.current.pause();
              videoRef.current.currentTime = data.time;
            } else if (data.action === "seek") {
              videoRef.current.currentTime = data.time;
            }

            setTimeout(() => {
              isIncomingEvent.current = false;
            }, 500);
            break;

          case "select-video":
            if (videosListRef.current) {
              const video = videosListRef.current.find((v: any) => v._id === data.videoId);
              if (video) {
                console.log("Remote peer changed theater video:", video.videotitle);
                setSelectedVideo(video);
              }
            }
            break;

          case "chat-message":
            if (data.senderUid === myUidRef.current) return;
            
            setMessages(prev => {
              const next = [
                ...prev,
                {
                  id: Math.random().toString(),
                  sender: data.senderName || "Guest",
                  text: data.text,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ];
              if (typeof window !== "undefined") {
                sessionStorage.setItem(`chat_history_${roomId}`, JSON.stringify(next));
              }
              return next;
            });
            
            if (!isChatOpen || activeRightPanel !== "chat") {
              setUnreadCount(prev => prev + 1);
            }
            break;

          case "user-media-state":
            setParticipants(prev => prev.map(p => {
              if (p.uid === data.uid) {
                return { ...p, videoOff: data.videoOff, muted: data.muted, isScreenSharing: data.isScreenSharing };
              }
              return p;
            }));
            break;

          case "user-sync-state":
            if (!videoRef.current) return;
            const diff = videoRef.current.currentTime - data.time;
            
            if (diff > 3 && data.isBuffering) {
              if (isHostRef.current && !videoRef.current.paused) {
                videoRef.current.pause();
                setShowLagBanner(`Pausing room briefly to let ${data.name} catch up...`);
                socket.send(JSON.stringify({
                  type: "video-control",
                  action: "pause",
                  time: videoRef.current.currentTime
                }));
                
                setTimeout(() => {
                  setShowLagBanner("");
                  if (videoRef.current) {
                    videoRef.current.play().catch(e => {});
                    socket.send(JSON.stringify({
                      type: "video-control",
                      action: "play",
                      time: videoRef.current.currentTime
                    }));
                  }
                }, 3000);
              }
              
              setLaggingUsers(prev => ({
                ...prev,
                [data.uid]: { name: data.name, lag: Math.round(diff) }
              }));
            } else {
              setLaggingUsers(prev => {
                const copy = { ...prev };
                delete copy[data.uid];
                return copy;
              });
            }
            break;

          default:
            break;
        }
      } catch (err) {
        console.error("Error processing WS message:", err);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
      setWsReady(false);
      (window as any).partyWs = null;
    };

    return () => {
      Object.keys(peerConnectionsRef.current).forEach(uid => {
        peerConnectionsRef.current[uid].close();
      });
      peerConnectionsRef.current = {};
      (window as any).partyWs = null;
      socket.close();
    };
  }, [localMediaReady, roomId, isChatOpen]);

  // 4. Synchronize Player events to WebSockets (Enforced for room hosts only)
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !wsReady || !isHost) return;

    const handlePlay = () => {
      if (isIncomingEvent.current) return;
      socketRef.current?.send(JSON.stringify({
        type: "video-control",
        action: "play",
        time: videoEl.currentTime
      }));
    };

    const handlePause = () => {
      if (isIncomingEvent.current) return;
      socketRef.current?.send(JSON.stringify({
        type: "video-control",
        action: "pause",
        time: videoEl.currentTime
      }));
    };

    const handleSeeking = () => {
      if (isIncomingEvent.current) return;
      socketRef.current?.send(JSON.stringify({
        type: "video-control",
        action: "seek",
        time: videoEl.currentTime
      }));
    };

    videoEl.addEventListener("play", handlePlay);
    videoEl.addEventListener("pause", handlePause);
    videoEl.addEventListener("seeking", handleSeeking);

    return () => {
      videoEl.removeEventListener("play", handlePlay);
      videoEl.removeEventListener("pause", handlePause);
      videoEl.removeEventListener("seeking", handleSeeking);
    };
  }, [selectedVideo, wsReady, isHost]);

  // 5. Broadcast sync state every 2 seconds
  useEffect(() => {
    if (!wsReady) return;
    const interval = setInterval(() => {
      const videoEl = videoRef.current;
      if (videoEl && socketRef.current?.readyState === 1) {
        socketRef.current.send(JSON.stringify({
          type: "user-sync-state",
          uid: myUidRef.current,
          name: user?.name || "Guest",
          time: videoEl.currentTime,
          isBuffering: videoEl.seeking || videoEl.networkState === 2 || videoEl.readyState < 3
        }));
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [wsReady]);

  // 6. Call Control Handlers with localStorage state persistence
  const toggleMute = () => {
    const nextMutedState = !isMuted;
    setIsMuted(nextMutedState);
    localStorage.setItem("watchparty_isMuted", String(nextMutedState));

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !nextMutedState;
      });
    }

    socketRef.current?.send(JSON.stringify({
      type: "user-media-state",
      uid: myUidRef.current,
      videoOff: isVideoOff,
      muted: nextMutedState,
      isScreenSharing: isScreenSharing
    }));
  };

  const toggleCamera = () => {
    const nextVideoOffState = !isVideoOff;
    setIsVideoOff(nextVideoOffState);
    localStorage.setItem("watchparty_isVideoOff", String(nextVideoOffState));

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !nextVideoOffState;
      });
    }

    socketRef.current?.send(JSON.stringify({
      type: "user-media-state",
      uid: myUidRef.current,
      videoOff: nextVideoOffState,
      muted: isMuted,
      isScreenSharing: isScreenSharing
    }));
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
        }
        
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack) {
          Object.keys(peerConnectionsRef.current).forEach(uid => {
            const pc = peerConnectionsRef.current[uid];
            const sender = pc.getSenders().find(s => s.track?.kind === "video" || s.track === null);
            if (sender) {
              sender.replaceTrack(videoTrack);
            }
          });
        }
        setIsScreenSharing(false);
        socketRef.current?.send(JSON.stringify({
          type: "user-media-state",
          uid: myUidRef.current,
          videoOff: isVideoOff,
          muted: isMuted,
          isScreenSharing: false
        }));
      } else {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        
        Object.keys(peerConnectionsRef.current).forEach(uid => {
          const pc = peerConnectionsRef.current[uid];
          const sender = pc.getSenders().find(s => s.track?.kind === "video" || s.track === null);
          if (sender) {
            sender.replaceTrack(screenTrack);
          } else {
            pc.addTrack(screenTrack, screenStream);
          }
        });
        
        screenTrack.onended = () => {
          if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
          }
          const camTrack = localStreamRef.current?.getVideoTracks()[0];
          if (camTrack) {
            Object.keys(peerConnectionsRef.current).forEach(uid => {
              const pc = peerConnectionsRef.current[uid];
              const sender = pc.getSenders().find(s => s.track?.kind === "video" || s.track === null);
              if (sender) sender.replaceTrack(camTrack);
            });
          }
          setIsScreenSharing(false);
          socketRef.current?.send(JSON.stringify({
            type: "user-media-state",
            uid: myUidRef.current,
            videoOff: isVideoOff,
            muted: isMuted,
            isScreenSharing: false
          }));
        };

        setIsScreenSharing(true);
        socketRef.current?.send(JSON.stringify({
          type: "user-media-state",
          uid: myUidRef.current,
          videoOff: isVideoOff,
          muted: isMuted,
          isScreenSharing: true
        }));
      }
    } catch (err) {
      console.error("Screen share error:", err);
    }
  };

  // 7. Session Recording (HTML5 Canvas mix with Audio)
  const startRecording = () => {
    recordedChunksRef.current = [];
    let recordingStream: MediaStream;

    try {
      const videoNode = videoRef.current;
      if (!videoNode) {
        throw new Error("No video player element available for recording.");
      }

      videoNode.setAttribute("crossorigin", "anonymous");
      
      const captureStream = (videoNode as any).captureStream 
        ? (videoNode as any).captureStream() 
        : (videoNode as any).mozCaptureStream();

      const tracks = [...captureStream.getVideoTracks()];

      if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
        tracks.push(localStreamRef.current.getAudioTracks()[0]);
      }

      recordingStream = new MediaStream(tracks);
      console.log("Recording movie canvas + user voice commentary");
    } catch (err) {
      console.warn("Failed to capture HTML5 video element cross-origin stream. Falling back to face feed recording:", err);
      if (localStreamRef.current) {
        recordingStream = localStreamRef.current;
      } else {
        alert("No audio/video stream available to record.");
        return;
      }
    }

    let options = { mimeType: "video/webm;codecs=vp9,opus" };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: "video/webm;codecs=vp8,opus" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "video/webm" };
      }
    }

    try {
      const recorder = new MediaRecorder(recordingStream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `WatchParty-Session-${roomId}-${new Date().toISOString().slice(0,10)}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
      };

      recorder.start(1000);
      setIsRecording(true);
    } catch (recorderErr) {
      console.error("Failed to start MediaRecorder:", recorderErr);
      alert("Recording could not be initialized on this browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Chat message submit
  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (socketRef.current && socketRef.current.readyState === 1) {
      socketRef.current.send(JSON.stringify({
        type: "chat-message",
        text: inputText.trim(),
        senderUid: myUidRef.current,
        senderName: user?.name || "Guest"
      }));

      setMessages(prev => {
        const next = [
          ...prev,
          {
            id: Math.random().toString(),
            sender: "You",
            text: inputText.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
        if (typeof window !== "undefined") {
          sessionStorage.setItem(`chat_history_${roomId}`, JSON.stringify(next));
        }
        return next;
      });
      setInputText("");
    }
  };

  const handleVolumeChange = (uid: string, vol: number) => {
    const videoEl = document.getElementById(`remote-video-${uid}`) as HTMLVideoElement;
    if (videoEl) {
      videoEl.volume = vol;
    }
  };

  const handleForceSync = () => {
    if (videoRef.current && socketRef.current?.readyState === 1) {
      socketRef.current.send(JSON.stringify({
        type: "video-control",
        action: "seek",
        time: videoRef.current.currentTime
      }));
    }
  };

  const handleLeave = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(`chat_history_${roomId}`);
    }
    onLeave();
  };

  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden font-sans text-gray-800 antialiased">
      
      {/* Mobile/Tablet Header Bar (Only visible on mobile) */}
      <div className="w-full bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between md:hidden flex-shrink-0 z-30">
        <span className="text-gray-955 font-black text-lg tracking-tighter italic font-sans select-none">
          You<span className="text-red-600 font-extrabold">Stream</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="bg-red-50 border border-red-100 text-red-700 px-2.5 py-1 rounded-lg text-xs font-mono select-all">
            {roomId}
          </span>
          <Button
            onClick={handleCopyLink}
            size="sm"
            variant="outline"
            className="h-8 rounded-lg text-xs flex items-center gap-1 cursor-pointer flex-shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy Link"}
          </Button>
        </div>
      </div>

      {/* COLUMN 1: LEFT SIDEBAR (Only visible on desktop/tablet) */}
      <div className={`bg-white border-r border-gray-200 flex flex-col justify-between h-full flex-shrink-0 z-20 transition-all duration-300 ${isSidebarCollapsed ? "w-[72px]" : "w-[260px]"} hidden md:flex`}>
        <div className="flex flex-col min-h-0">
          
          {/* Logo row */}
          <div className="p-4 flex items-center justify-between border-b border-gray-50 flex-shrink-0">
            {!isSidebarCollapsed && (
              <span className="text-gray-955 font-black text-xl tracking-tighter italic font-sans flex items-center gap-1 select-none pl-1">
                You<span className="text-red-600 font-extrabold">Stream</span>
              </span>
            )}
            {!isSidebarCollapsed && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsSidebarCollapsed(true)} 
                className="h-8 w-8 rounded-full text-gray-500 hover:bg-gray-100 flex-shrink-0 cursor-pointer"
              >
                <Menu className="w-4 h-4" />
              </Button>
            )}
            {isSidebarCollapsed && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsSidebarCollapsed(false)} 
                className="h-8 w-8 rounded-full text-gray-500 hover:bg-gray-100 mx-auto cursor-pointer"
              >
                <Menu className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Room info block (Hidden when collapsed) */}
          {!isSidebarCollapsed && (
            <div className="px-5 py-5 border-b border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                ROOM
              </span>
              <h2 className="text-sm font-bold text-gray-900 mt-1 truncate">
                {selectedVideo ? selectedVideo.videotitle : `Room ${roomId}`}
              </h2>
              <span className="text-xs text-gray-500 block mt-1">
                {participants.length + 1} {participants.length === 0 ? "person" : "people"} watching
              </span>
            </div>
          )}

          {/* Navigation list */}
          <nav className="p-3 space-y-1">
            <button className={`w-full flex items-center rounded-xl font-semibold text-sm transition-colors text-left ${isSidebarCollapsed ? "justify-center p-3 text-red-600" : "gap-3 px-3 py-2.5 bg-red-50 text-red-700"}`}>
              <Video className="w-4 h-4 text-red-600 flex-shrink-0" />
              {!isSidebarCollapsed && "Watch Party"}
            </button>
            
            <button 
              onClick={() => {
                if (activeRightPanel === "chat") {
                  setIsChatOpen(!isChatOpen);
                } else {
                  setActiveRightPanel("chat");
                  setIsChatOpen(true);
                }
              }}
              className={`w-full flex items-center rounded-xl font-medium text-sm transition-colors text-left ${isSidebarCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5"} ${
                isChatOpen && activeRightPanel === "chat" 
                  ? "bg-red-50 text-red-700 font-semibold" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              {!isSidebarCollapsed && (
                <>
                  Chat Panel
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-red-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                      {unreadCount}
                    </span>
                  )}
                </>
              )}
            </button>
            
            <button 
              onClick={() => {
                if (activeRightPanel === "members") {
                  setIsChatOpen(!isChatOpen);
                } else {
                  setActiveRightPanel("members");
                  setIsChatOpen(true);
                }
              }}
              className={`w-full flex items-center rounded-xl font-medium text-sm transition-colors text-left ${isSidebarCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5"} ${
                isChatOpen && activeRightPanel === "members" 
                  ? "bg-red-50 text-red-700 font-semibold" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <Users className="w-4 h-4 flex-shrink-0" />
              {!isSidebarCollapsed && `Members (${participants.length + 1})`}
            </button>
          </nav>
        </div>

        {/* User profile card */}
        <div className="p-3 space-y-3">
          <div className={`flex items-center bg-gray-50 border border-gray-100 rounded-xl ${isSidebarCollapsed ? "justify-center p-2" : "gap-3 p-3"}`}>
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm border border-red-200">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate leading-none">
                  {user?.name || "Guest User"}
                </p>
                <p className="text-[10px] text-gray-500 font-medium mt-1 uppercase tracking-wider">
                  {isHost ? "Host" : "Guest"}
                </p>
              </div>
            )}
          </div>

          {!isSidebarCollapsed && (
            <div className="p-4 rounded-xl bg-red-50/50 border border-red-100/60 relative overflow-hidden">
              <h4 className="text-xs font-bold text-red-800 leading-none">Invite Friends</h4>
              <p className="text-[10px] text-red-600/80 font-medium mt-1">
                Share the link and watch together!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* COLUMN 2: CENTER STAGE */}
      <div className="flex-1 bg-gray-50 overflow-y-auto p-4 md:p-6 pt-4 md:pt-6 flex flex-col gap-2 min-w-0 h-full">
        
        {/* Mobile View first fold wrapper - forces everything above chat onto the screen */}
        <div className="flex flex-col h-[calc(100vh-100px)] lg:h-full gap-2 flex-shrink-0 justify-between min-h-0">
          
          {/* Webcam Previews flex row - Gap reduced, camera size increased */}
          <div className="flex justify-start lg:justify-center gap-2 overflow-x-auto min-h-[140px] items-stretch pb-1 px-4 md:px-0 no-scrollbar flex-shrink-0 max-w-[1000px] mx-auto w-full">
            
            {/* Local participant webcam tile */}
            <div className="relative rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm aspect-video w-[210px] sm:w-[260px] flex-shrink-0 flex items-center justify-center">
              {(!isVideoOff || isScreenSharing) ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`object-cover w-full h-full ${!isScreenSharing ? "transform scale-x-[-1]" : ""}`}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-base border border-red-200">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[10px] font-bold drop-shadow-md select-none font-sans">
                <span>You {isMuted && "🔇"}</span>
              </div>
            </div>

            {/* Remote participant webcam tiles */}
            {participants.map((p) => {
              const stream = remoteStreams[p.uid];
              const isVolOpen = openVolumeSliders[p.uid];
              return (
                <div 
                  key={p.uid} 
                  className="relative rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm aspect-video w-[210px] sm:w-[260px] flex-shrink-0 flex items-center justify-center cursor-pointer"
                  onDoubleClick={() => setActiveEnlargedFeed({ uid: p.uid, name: p.name, stream: stream || null, videoOff: !!p.videoOff })}
                >
                  {(!p.videoOff || p.isScreenSharing) && stream ? (
                    <VideoCardKey stream={stream} name={p.name} uid={p.uid} isScreenSharing={!!p.isScreenSharing} />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-base border border-gray-200">
                      {p.name?.[0]?.toUpperCase() || "G"}
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[10px] font-bold drop-shadow-md select-none font-sans">
                    <span className="truncate max-w-[125px]">{p.name} {p.muted && "🔇"}</span>
                    
                    {/* Pinned Volume click-to-open popup */}
                    {!p.videoOff && stream && (
                      <div className="relative flex items-center">
                        <Volume2 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenVolumeSliders(prev => ({ ...prev, [p.uid]: !prev[p.uid] }));
                          }}
                          className="w-3.5 h-3.5 text-gray-200 hover:text-white cursor-pointer" 
                        />
                        {isVolOpen && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-6 right-0 bg-white border border-gray-200 p-2 rounded-xl shadow-md flex items-center z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
                          >
                            <input 
                              type="range" 
                              min="0" 
                              max="1" 
                              step="0.1" 
                              defaultValue="1" 
                              onChange={(e) => handleVolumeChange(p.uid, parseFloat(e.target.value))}
                              onMouseUp={() => setOpenVolumeSliders(prev => ({ ...prev, [p.uid]: false }))}
                              onTouchEnd={() => setOpenVolumeSliders(prev => ({ ...prev, [p.uid]: false }))}
                              className="w-14 h-1 bg-red-600 rounded appearance-none cursor-pointer border-none"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main video player container - takes remaining complete viewport space */}
          <div className="flex-1 min-h-0 w-full max-w-[1000px] mx-auto relative bg-black rounded-3xl overflow-hidden flex-shrink-1">
            <div className="w-full h-full relative flex items-center justify-center bg-black overflow-hidden">
              {selectedVideo ? (
                <video
                  ref={videoRef}
                  src={
                    (() => {
                      const baseSrc = selectedVideo.filepath.startsWith("http")
                        ? selectedVideo.filepath
                        : `${getBackendUrl()}/${selectedVideo.filepath.replace(/\\/g, "/").replace(/^\//, "")}`;
                      return typeof window !== "undefined" && window.location.protocol === "https:"
                        ? baseSrc.replace(/^http:/, "https:")
                        : baseSrc;
                    })()
                  }
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain max-h-full"
                  controls={isHost}
                  preload="metadata"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-500 space-y-2">
                  <Users className="w-12 h-12 text-gray-400 animate-pulse" />
                  <p className="font-semibold text-sm">Waiting for Video Stream...</p>
                  <p className="text-xs text-gray-400">Only the host can select files from the library tray below.</p>
                </div>
              )}
            </div>
          </div>

          {/* Control bar (Only Icons) */}
          <div className="bg-white border border-gray-200 rounded-2xl p-2.5 shadow-sm flex items-center justify-center gap-4 w-full max-w-[1000px] mx-auto flex-shrink-0 mt-1">
            
            {/* Mute Mic button */}
            <Button 
              variant="outline" 
              onClick={toggleMute}
              size="icon"
              className={`rounded-full h-10 w-10 border transition-all shadow-sm cursor-pointer flex-shrink-0 ${
                isMuted 
                  ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100" 
                  : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
              }`}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isMuted ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4 text-green-500" />}
            </Button>

            {/* Camera Off button */}
            <Button 
              variant="outline" 
              onClick={toggleCamera}
              size="icon"
              className={`rounded-full h-10 w-10 border transition-all shadow-sm cursor-pointer flex-shrink-0 ${
                isVideoOff 
                  ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100" 
                  : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
              }`}
              title="Toggle Camera"
            >
              {isVideoOff ? <VideoOff className="w-4 h-4 text-red-500" /> : <Video className="w-4 h-4 text-green-500" />}
            </Button>

            {/* Screen Share button */}
            <Button 
              variant="outline" 
              onClick={toggleScreenShare}
              size="icon"
              className={`rounded-full h-10 w-10 border transition-all shadow-sm cursor-pointer flex-shrink-0 ${
                isScreenSharing 
                  ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" 
                  : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
              }`}
              title="Share Screen"
            >
              <ScreenShare className="w-4 h-4" />
            </Button>

            {/* Recording indicator button */}
            <Button 
              variant="outline" 
              onClick={isRecording ? stopRecording : startRecording}
              size="icon"
              className={`rounded-full h-10 w-10 border transition-all shadow-sm cursor-pointer flex-shrink-0 ${
                isRecording 
                  ? "bg-red-50 border-red-200 text-red-700 animate-pulse hover:bg-red-100" 
                  : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
              }`}
              title="Record Session"
            >
              <Disc className="w-4 h-4 text-red-500" />
            </Button>

            {/* Sync room button */}
            {isHost && (
              <Button
                onClick={handleForceSync}
                size="icon"
                className="bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 rounded-full h-10 w-10 flex items-center justify-center shadow-sm cursor-pointer flex-shrink-0"
                title="Sync Room Playhead"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}

            {/* Leave Room Button */}
            <Button 
              variant="destructive" 
              onClick={handleLeave}
              size="icon"
              className="rounded-full h-10 w-10 shadow bg-red-600 hover:bg-red-700 text-white cursor-pointer flex-shrink-0"
              title="Leave Watch Party"
            >
              <PhoneOff className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Compact Room Options Footer (Only visible on desktop/tablet) */}
        <div className="w-full max-w-[1000px] mx-auto bg-white border border-gray-200 rounded-2xl p-3 shadow-sm items-center justify-between gap-4 flex-shrink-0 hidden md:flex">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs text-gray-900">Room Code:</h3>
            <span className="bg-red-50 border border-red-100 text-red-700 px-2.5 py-1 rounded-lg text-xs font-mono select-all">
              {roomId}
            </span>
            <Button
              onClick={handleCopyLink}
              size="sm"
              variant="outline"
              className="h-8 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied Link" : "Copy Invite URL"}
            </Button>
          </div>

          {/* Stream Catalog Selection */}
          {isHost ? (
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-shrink-0">
                Stream Catalog:
              </label>
              {loadingVideos ? (
                <span className="text-xs text-gray-400 animate-pulse">Loading...</span>
              ) : (
                <select
                  value={selectedVideo?._id || ""}
                  onChange={(e) => {
                    const videoId = e.target.value;
                    const video = videosListRef.current.find(v => v._id === videoId);
                    if (video) {
                      setSelectedVideo(video);
                      socketRef.current?.send(JSON.stringify({
                        type: "select-video",
                        videoId: videoId
                      }));
                    }
                  }}
                  className="bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-red-600 min-w-[160px] max-w-[240px] shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  {videosList.map(v => (
                    <option key={v._id} value={v._id}>
                      {v.videotitle}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            selectedVideo && (
              <div className="text-xs">
                <span className="text-gray-500">Watching: </span>
                <span className="font-bold text-red-600">{selectedVideo.videotitle}</span>
                <span className="text-gray-400 font-normal ml-2">({selectedVideo.videochanel})</span>
              </div>
            )
          )}
        </div>

        {/* Inline Active Panels View (For tablet/mobile views just below the video player, styled identically to sidebar) */}
        <div className="w-full max-w-[1000px] mx-auto block lg:hidden pb-16">
          
          {/* Inline Host Catalog dropdown for mobile/tablet */}
          {isHost && (
            <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm mb-3 flex items-center justify-between gap-3 md:hidden">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Stream Catalog:</span>
              {loadingVideos ? (
                <span className="text-xs text-gray-450 animate-pulse">Loading...</span>
              ) : (
                <select
                  value={selectedVideo?._id || ""}
                  onChange={(e) => {
                    const videoId = e.target.value;
                    const video = videosListRef.current.find(v => v._id === videoId);
                    if (video) {
                      setSelectedVideo(video);
                      socketRef.current?.send(JSON.stringify({
                        type: "select-video",
                        videoId: videoId
                      }));
                    }
                  }}
                  className="bg-white border border-gray-200 text-gray-800 rounded-xl px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-red-600 max-w-[200px]"
                >
                  {videosList.map(v => (
                    <option key={v._id} value={v._id}>
                      {v.videotitle}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col min-h-0">
            <div className="flex border-b border-gray-100 pb-2 mb-3 gap-4">
              <button 
                onClick={() => setActiveRightPanel("chat")}
                className={`text-xs font-bold ${activeRightPanel === "chat" ? "text-red-600 border-b-2 border-red-600 pb-1" : "text-gray-400"}`}
              >
                Room Live Chat
              </button>
              <button 
                onClick={() => setActiveRightPanel("members")}
                className={`text-xs font-bold ${activeRightPanel === "members" ? "text-red-600 border-b-2 border-red-600 pb-1" : "text-gray-400"}`}
              >
                Room Members ({participants.length + 1})
              </button>
            </div>

            {activeRightPanel === "chat" ? (
              <div className="space-y-3 flex flex-col min-h-0">
                {/* Messages log - made taller for easy viewing */}
                <div className="h-[280px] overflow-y-auto space-y-3 pr-1">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-450 space-y-1">
                      <MessageSquare className="w-6 h-6 text-gray-300" />
                      <p className="text-xs font-semibold text-gray-500">No messages yet</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isSelf = msg.sender === "You";
                      return (
                        <div 
                          key={msg.id} 
                          className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                        >
                          <div className="flex items-baseline gap-1.5 mb-0.5">
                            <span className="text-[9px] font-bold text-gray-500">{msg.sender}</span>
                            <span className="text-[7px] text-gray-400">{msg.timestamp}</span>
                          </div>
                          <div 
                            className={`px-3 py-2 text-xs rounded-2xl max-w-[85%] break-words shadow-sm border ${
                              isSelf
                                ? "bg-red-600 text-white border-red-500 rounded-tr-none"
                                : "bg-gray-100 text-gray-800 border-gray-200 rounded-tl-none"
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={mobileMessagesEndRef} />
                </div>
                <form onSubmit={sendChatMessage} className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                  <Input
                    type="text"
                    placeholder="Type a message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="bg-white border-gray-200 text-xs h-9 rounded-xl flex-1 shadow-inner"
                  />
                  <Button type="submit" size="sm" className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 h-9 cursor-pointer">
                    Send
                  </Button>
                </form>
              </div>
            ) : (
              <div className="space-y-2 h-[280px] overflow-y-auto">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  ACTIVE MEMBERS — {participants.length + 1}
                </div>
                {/* Local Host */}
                <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl border border-transparent transition-colors">
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs border border-red-200">
                      {user?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 leading-none truncate">{user?.name || "Guest"} (You)</p>
                    <p className="text-[9px] text-gray-450 font-bold uppercase tracking-wider mt-1">Host</p>
                  </div>
                </div>

                {/* Remote Participants */}
                {participants.map((p) => (
                  <div key={p.uid} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl border border-transparent transition-colors">
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs border border-gray-200">
                        {p.name?.[0]?.toUpperCase() || "G"}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-none truncate">{p.name}</p>
                      <p className="text-[9px] text-gray-400 font-medium mt-1 uppercase tracking-wider">Guest</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* COLUMN 3: RIGHT PANEL (Live Text Chat message panel OR Active Members panel) */}
      <div className={`h-full border-l border-gray-200 bg-white flex flex-col min-h-0 overflow-hidden text-gray-800 transition-all z-20 ${isChatOpen ? "w-[340px]" : "w-0 border-l-0"} hidden lg:flex`}>
        
        {/* Chat header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
          <span className="font-bold text-sm tracking-wide text-gray-800">
            {activeRightPanel === "chat" ? "Room Live Chat" : "Room Members"}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsChatOpen(false)}
            className="text-gray-500 hover:text-gray-800 rounded-full h-8 w-8 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {activeRightPanel === "chat" ? (
          /* Live Chat drawer view */
          <React.Fragment>
            {/* Messages log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-2 px-6">
                  <MessageSquare className="w-8 h-8 text-gray-300" />
                  <p className="text-xs font-semibold text-gray-500">No messages yet</p>
                  <p className="text-[10px] text-gray-400">Type a message below to start chatting with room members!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSelf = msg.sender === "You";
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-baseline gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold text-gray-500">{msg.sender}</span>
                        <span className="text-[8px] text-gray-400">{msg.timestamp}</span>
                      </div>
                      <div 
                        className={`px-3 py-2 text-xs rounded-2xl max-w-[85%] break-words shadow-sm border ${
                          isSelf
                            ? "bg-red-600 text-white border-red-500 rounded-tr-none"
                            : "bg-gray-100 text-gray-800 border-gray-200 rounded-tl-none"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input text form */}
            <form onSubmit={sendChatMessage} className="p-3 border-t border-gray-200 bg-gray-50 flex gap-2 flex-shrink-0">
              <Input
                type="text"
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="bg-white border-gray-200 text-gray-800 text-xs h-10 rounded-xl focus:border-red-500 focus:ring-red-500 shadow-inner"
              />
              <Button 
                type="submit" 
                size="icon" 
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-10 w-10 flex-shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </React.Fragment>
        ) : (
          /* Live Members drawer view */
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              ACTIVE MEMBERS — {participants.length + 1}
            </div>
            <div className="space-y-2">
              {/* Local Host */}
              <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl border border-transparent transition-colors">
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs border border-red-200">
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 leading-none truncate">{user?.name || "Guest"} (You)</p>
                  <p className="text-[9px] text-gray-455 font-bold uppercase tracking-wider mt-1">Host</p>
                </div>
              </div>

              {/* Remote Participants */}
              {participants.map((p) => (
                <div key={p.uid} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl border border-transparent transition-colors">
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs border border-gray-200">
                      {p.name?.[0]?.toUpperCase() || "G"}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 leading-none truncate">{p.name}</p>
                    <p className="text-[9px] text-gray-400 font-medium mt-1 uppercase tracking-wider">Guest</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enlarged Webcam Feed Lightbox Dialog */}
      {activeEnlargedFeed && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
          <button 
            onClick={() => setActiveEnlargedFeed(null)} 
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative border border-white/10 flex items-center justify-center">
            {activeEnlargedFeed.videoOff || !activeEnlargedFeed.stream ? (
              <div className="w-32 h-32 rounded-full bg-gray-700 text-white flex items-center justify-center font-bold text-5xl border border-gray-600 select-none">
                {activeEnlargedFeed.name?.[0]?.toUpperCase() || "G"}
              </div>
            ) : (
              <video 
                ref={(el) => {
                  if (el && activeEnlargedFeed.stream) {
                    el.srcObject = null;
                    el.srcObject = activeEnlargedFeed.stream;
                    el.play().catch(e => console.warn("Failed to autoplay enlarged stream:", e));
                  }
                }}
                autoPlay 
                playsInline 
                className="w-full h-full object-contain"
              />
            )}
            <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-xl text-white font-bold text-sm">
              {activeEnlargedFeed.name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component to attach remote media stream to video tag
function VideoCardKey({ stream, name, uid, isScreenSharing }: { stream: MediaStream; name: string; uid: string; isScreenSharing: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = null;
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.warn("Auto play remote failed:", e));

      // Re-trigger playback play head when tracks unmute (camera toggled back on)
      const handleTrackUnmute = () => {
        if (videoRef.current) {
          videoRef.current.play().catch(e => {});
        }
      };

      stream.getVideoTracks().forEach(track => {
        track.addEventListener("unmute", handleTrackUnmute);
      });

      return () => {
        stream.getVideoTracks().forEach(track => {
          track.removeEventListener("unmute", handleTrackUnmute);
        });
      };
    }
  }, [stream, isScreenSharing]);

  return (
    <video
      ref={videoRef}
      id={`remote-video-${uid}`}
      autoPlay
      playsInline
      className="object-cover w-full h-full"
    />
  );
}
