import React, { useEffect, useState, useRef } from "react";
import { useUser } from "../lib/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { 
  Users, Video, VideoOff, Mic, MicOff, PhoneOff, 
  Send, ScreenShare, Copy, Check, Info, MessageSquare, Disc
} from "lucide-react";

interface WatchPartyPanelProps {
  roomId: string;
  videoElement: HTMLVideoElement | null;
  onLeave: () => void;
  videosList?: any[];
  onSelectVideo?: (video: any) => void;
}

export default function WatchPartyPanel({ 
  roomId, 
  videoElement, 
  onLeave,
  videosList = [],
  onSelectVideo
}: WatchPartyPanelProps) {
  const { user } = useUser();
  const [copied, setCopied] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [wsReady, setWsReady] = useState(false);

  // Tab routing
  const [activeSideTab, setActiveSideTab] = useState<"chat" | "participants">("chat");

  // Chat message states
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");

  // WebRTC Audio/Video states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ [uid: string]: MediaStream }>({});

  // Call Control states
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const isIncomingEvent = useRef(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionsRef = useRef<{ [uid: string]: RTCPeerConnection }>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // MediaRecorder references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Refs for dynamic callbacks to avoid closing WebSocket connection on updates
  const videosListRef = useRef<any[]>(videosList);
  const onSelectVideoRef = useRef<((video: any) => void) | undefined>(onSelectVideo);
  const myUidRef = useRef<string>("");

  useEffect(() => {
    videosListRef.current = videosList;
  }, [videosList]);

  useEffect(() => {
    onSelectVideoRef.current = onSelectVideo;
  }, [onSelectVideo]);

  // Set persistent UID for this session
  if (!myUidRef.current) {
    myUidRef.current = user?._id || "guest_" + Math.random().toString(36).substring(2, 10);
  }

  // Generate clean invite link
  const inviteLink = typeof window !== "undefined" 
    ? `${window.location.origin}${window.location.pathname}?room=${roomId}` 
    : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Scroll to bottom of chat list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeSideTab]);

  // 1. Request Local Media Stream (Camera & Mic) on mount
  useEffect(() => {
    const initLocalMedia = async () => {
      try {
        console.log("Requesting camera and microphone access...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, frameRate: 15 },
          audio: true
        });
        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        console.log("Local camera stream active");
      } catch (err) {
        console.error("Camera access failed (hardware lock or permission). Falling back to mic-only:", err);
        try {
          // If webcam is locked by another window (very common on Windows), fallback to audio-only
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setLocalStream(audioStream);
          localStreamRef.current = audioStream;
          setIsVideoOff(true); // Mark camera off visually
          console.log("Local audio-only stream active");
        } catch (audioErr) {
          console.error("Audio-only capture also failed:", audioErr);
        }
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

  // 3. Establish WebSocket connection & handle signaling lifecycle
  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    const wsUrl = backendUrl.replace(/^http/, "ws").replace(/\/$/, "");
    
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
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket event received:", data.type);

        switch (data.type) {
          case "room-users":
            setParticipants(data.users);
            break;

          case "peer-joined":
            setParticipants(prev => {
              if (prev.some(p => p.uid === data.uid)) return prev;
              return [...prev, { uid: data.uid, name: data.name }];
            });

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
            if (!videoElement) return;
            isIncomingEvent.current = true;

            if (data.action === "play") {
              videoElement.currentTime = data.time;
              videoElement.play().catch(err => console.log("Play sync interrupted:", err));
            } else if (data.action === "pause") {
              videoElement.pause();
              videoElement.currentTime = data.time;
            } else if (data.action === "seek") {
              videoElement.currentTime = data.time;
            }

            setTimeout(() => {
              isIncomingEvent.current = false;
            }, 500);
            break;

          case "select-video":
            if (videosListRef.current && onSelectVideoRef.current) {
              const video = videosListRef.current.find((v: any) => v._id === data.videoId);
              if (video) {
                console.log("Remote peer changed theater video:", video.videotitle);
                onSelectVideoRef.current(video);
              }
            }
            break;

          case "chat-message":
            // Filter duplicates: do not append if we are the sender
            if (data.senderUid === myUidRef.current) return;
            
            setMessages(prev => [
              ...prev,
              {
                id: Math.random().toString(),
                sender: data.senderName || "Guest",
                text: data.text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
            break;

          default:
            break;
        }
      } catch (err) {
        console.error("Error processing incoming WS message:", err);
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
  }, [roomId, videoElement, user]);

  // 4. Synchronize Player events to WebSockets
  useEffect(() => {
    if (!videoElement || !wsReady) return;

    const handlePlay = () => {
      if (isIncomingEvent.current) return;
      socketRef.current?.send(JSON.stringify({
        type: "video-control",
        action: "play",
        time: videoElement.currentTime
      }));
    };

    const handlePause = () => {
      if (isIncomingEvent.current) return;
      socketRef.current?.send(JSON.stringify({
        type: "video-control",
        action: "pause",
        time: videoElement.currentTime
      }));
    };

    const handleSeeking = () => {
      if (isIncomingEvent.current) return;
      socketRef.current?.send(JSON.stringify({
        type: "video-control",
        action: "seek",
        time: videoElement.currentTime
      }));
    };

    videoElement.addEventListener("play", handlePlay);
    videoElement.addEventListener("pause", handlePause);
    videoElement.addEventListener("seeking", handleSeeking);

    return () => {
      videoElement.removeEventListener("play", handlePlay);
      videoElement.removeEventListener("pause", handlePause);
      videoElement.removeEventListener("seeking", handleSeeking);
    };
  }, [videoElement, wsReady]);

  // 5. Call Control Handlers
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenSharing();
    } else {
      await startScreenSharing();
    }
  };

  const startScreenSharing = async () => {
    try {
      console.log("Requesting screen sharing capture...");
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      const activeVideoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (activeVideoTrack) {
        localStreamRef.current?.removeTrack(activeVideoTrack);
        activeVideoTrack.stop();
      }
      
      if (localStreamRef.current && screenTrack) {
        localStreamRef.current.addTrack(screenTrack);
      }

      Object.keys(peerConnectionsRef.current).forEach(uid => {
        const pc = peerConnectionsRef.current[uid];
        const sender = pc.getSenders().find(s => s.track && s.track.kind === "video");
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });

      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = null;
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      setIsScreenSharing(true);

      screenTrack.onended = () => {
        stopScreenSharing();
      };
    } catch (err) {
      console.error("Error starting screen sharing:", err);
    }
  };

  const stopScreenSharing = async () => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;

    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: 15 }
      });
      const cameraTrack = cameraStream.getVideoTracks()[0];

      const activeScreenTrack = localStreamRef.current?.getVideoTracks()[0];
      if (activeScreenTrack) {
        localStreamRef.current?.removeTrack(activeScreenTrack);
      }

      if (localStreamRef.current && cameraTrack) {
        localStreamRef.current.addTrack(cameraTrack);
      }

      Object.keys(peerConnectionsRef.current).forEach(uid => {
        const pc = peerConnectionsRef.current[uid];
        const sender = pc.getSenders().find(s => s.track && s.track.kind === "video");
        if (sender && cameraTrack) {
          sender.replaceTrack(cameraTrack);
        }
      });

      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = null;
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    } catch (err) {
      console.error("Error restoring camera track:", err);
    }
    setIsScreenSharing(false);
  };

  // 6. MediaRecorder Session Recording Loops
  const startRecording = () => {
    const tracks: MediaStreamTrack[] = [];
    
    // 1. Capture the Movie Theater video stage (what is playing) if active
    let movieStream: MediaStream | null = null;
    if (videoElement) {
      try {
        movieStream = (videoElement as any).captureStream 
          ? (videoElement as any).captureStream() 
          : (videoElement as any).mozCaptureStream 
            ? (videoElement as any).mozCaptureStream() 
            : null;
      } catch (e) {
        console.error("Could not capture video player stream:", e);
      }
    }

    if (movieStream) {
      movieStream.getVideoTracks().forEach((t: MediaStreamTrack) => tracks.push(t));
      movieStream.getAudioTracks().forEach((t: MediaStreamTrack) => tracks.push(t));
    } else {
      // Fallback to local camera feed if video element capture is unsupported
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t: MediaStreamTrack) => tracks.push(t));
      }
    }

    // 2. Add local host voice microphone to record commentary alongside movie
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t: MediaStreamTrack) => tracks.push(t));
    }

    if (tracks.length === 0) {
      alert("No active media streams found to record.");
      return;
    }

    const recordStream = new MediaStream(tracks);
    recordedChunksRef.current = [];
    
    try {
      let options = { mimeType: "video/webm;codecs=vp9,opus" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "video/webm;codecs=vp8,opus" };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: "video/webm" };
        }
      }

      console.log(`Starting MediaRecorder with mimeType: ${options.mimeType}`);
      const recorder = new MediaRecorder(recordStream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        console.log("Recording stopped. Saving file...");
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        document.body.appendChild(a);
        a.style.display = "none";
        a.href = url;
        a.download = `watchparty-theater-${roomId}-${new Date().toISOString().slice(0, 10)}.webm`;
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log("Recording file downloaded successfully");
      };

      recorder.start(1000); // Aggregate chunks every 1 second
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting MediaRecorder:", err);
      alert("Failed to start recording: " + err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 7. Send Chat Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (socketRef.current && socketRef.current.readyState === 1) {
      socketRef.current.send(JSON.stringify({
        type: "chat-message",
        text: inputText.trim(),
        senderUid: myUidRef.current
      }));

      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "You",
          text: inputText.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setInputText("");
    }
  };

  // Dynamic grid layout adjustments based on participant count
  const remoteCount = Object.keys(remoteStreams).length;
  const gridColsClass = remoteCount === 0 ? "grid-cols-1" : "grid-cols-2";

  return (
    <div className="flex flex-col h-[550px] sm:h-[650px] max-h-[85vh] border rounded-2xl bg-white shadow-md overflow-hidden border-gray-100">
      {/* Invite header bar */}
      <div className="p-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-red-700">
            <Users className="w-5 h-5 animate-pulse" />
            <span className="font-bold text-sm">Watch Party Active</span>
          </div>
          {isRecording && (
            <span className="inline-flex items-center gap-1 text-[8px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse border border-red-200">
              ● REC
            </span>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCopyLink}
          className="text-xs bg-white border-red-200 text-red-700 hover:bg-red-100 rounded-lg shadow-sm"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 mr-1" />
              Copy Invite
            </>
          )}
        </Button>
      </div>

      {/* Video Call Feed Stage (Grid) */}
      <div className="p-3 bg-gray-950 flex flex-col space-y-2">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block px-1">
          Video Call Feeds
        </span>
        <div className={`grid ${gridColsClass} gap-2 aspect-video overflow-hidden rounded-lg p-1 bg-gray-900 border border-gray-800`}>
          {/* Local camera preview */}
          <div className="relative bg-gray-950 rounded overflow-hidden aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="object-cover w-full h-full transform scale-x-[-1]"
            />
            {isVideoOff && (
              <div className="absolute inset-0 bg-gray-950 flex items-center justify-center text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                Camera Off
              </div>
            )}
            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
              You {isMuted && "🔇"}
            </div>
          </div>

          {/* Remote camera previews */}
          {Object.keys(remoteStreams).map((uid) => {
            const stream = remoteStreams[uid];
            const participantName = participants.find(p => p.uid === uid)?.name || "Guest";
            return (
              <VideoCardKey key={uid} stream={stream} name={participantName} />
            );
          })}
        </div>
      </div>

      {/* Tabs Selector for sidebar */}
      <div className="flex border-b border-gray-100 bg-gray-50 p-1">
        <button
          onClick={() => setActiveSideTab("chat")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeSideTab === "chat"
              ? "bg-white text-red-600 shadow-sm border border-gray-200/50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Text Chat ({messages.length})
        </button>
        <button
          onClick={() => setActiveSideTab("participants")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeSideTab === "participants"
              ? "bg-white text-red-600 shadow-sm border border-gray-200/50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Members ({participants.length + 1})
        </button>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-white">
        {activeSideTab === "chat" ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-2 px-6">
                  <MessageSquare className="w-8 h-8 text-gray-300" />
                  <p className="text-xs font-medium">No messages yet</p>
                  <p className="text-[10px] text-gray-400/80">Type a message below to start chatting with room members!</p>
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
                        <span className="text-[10px] font-bold text-gray-600">{msg.sender}</span>
                        <span className="text-[8px] text-gray-400">{msg.timestamp}</span>
                      </div>
                      <div 
                        className={`px-3 py-2 text-xs rounded-2xl max-w-[85%] break-words shadow-sm border ${
                          isSelf
                            ? "bg-red-600 text-white border-red-500 rounded-tr-none"
                            : "bg-gray-100 text-gray-800 border-gray-200/60 rounded-tl-none"
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

            {/* Chat message input form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t bg-gray-50 flex gap-2 items-center">
              <Input
                type="text"
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="bg-white border-gray-200 h-9 text-xs rounded-xl focus-visible:ring-red-500"
              />
              <Button 
                type="submit" 
                size="icon" 
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-9 w-9 shrink-0 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        ) : (
          /* Members Content */
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-xl border border-red-100 bg-red-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                    {user?.name?.[0] || "U"}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">{user?.name || "Guest"}</p>
                    <p className="text-[9px] text-red-600 font-semibold uppercase tracking-wider">Host</p>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 bg-white border px-1.5 py-0.5 rounded-md font-medium">You</span>
              </div>

              {participants.map((p) => (
                <div key={p.uid} className="flex items-center justify-between p-2 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center text-xs font-bold border">
                      {p.name?.[0] || "G"}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">{p.name}</p>
                      <p className="text-[9px] text-gray-400 font-medium">Participant</p>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-1" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="p-3 bg-gray-50 border-t flex items-center justify-between gap-2 border-gray-150">
        <div className="flex gap-2">
          {/* Audio toggle */}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleMute}
            className={`rounded-full h-9 w-9 border transition-all shadow-sm ${
              isMuted 
                ? "bg-red-50 hover:bg-red-100 border-red-200 text-red-600" 
                : "bg-white hover:bg-gray-100 border-gray-200 text-gray-600"
            }`}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>

          {/* Camera toggle */}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleCamera}
            className={`rounded-full h-9 w-9 border transition-all shadow-sm ${
              isVideoOff 
                ? "bg-red-50 hover:bg-red-100 border-red-200 text-red-600" 
                : "bg-white hover:bg-gray-100 border-gray-200 text-gray-600"
            }`}
            title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
          >
            {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </Button>

          {/* Screen Share */}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleScreenShare}
            className={`rounded-full h-9 w-9 border transition-all shadow-sm ${
              isScreenSharing 
                ? "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600" 
                : "bg-white hover:bg-gray-100 border-gray-200 text-gray-600"
            }`}
            title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
          >
            <ScreenShare className="w-4 h-4" />
          </Button>

          {/* Session Recording (Milestone 6) */}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={isRecording ? stopRecording : startRecording}
            className={`rounded-full h-9 w-9 border transition-all shadow-sm ${
              isRecording 
                ? "bg-red-50 hover:bg-red-100 border-red-200 text-red-600" 
                : "bg-white hover:bg-gray-100 border-gray-200 text-gray-600"
            }`}
            title={isRecording ? "Stop Recording" : "Record Session"}
          >
            <Disc className="w-4 h-4 text-red-500" />
          </Button>
        </div>
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={onLeave}
          className="rounded-full font-bold shadow-sm"
        >
          <PhoneOff className="w-4 h-4 mr-1.5" />
          Leave
        </Button>
      </div>
    </div>
  );
}

// Sub-component to attach MediaStream to video elements programmatically
function VideoCardKey({ stream, name }: { stream: MediaStream; name: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      
      const handleTrackEvent = () => {
        if (videoRef.current) {
          // Force element update when remote peer switches tracks (camera <-> screen share)
          videoRef.current.srcObject = null;
          videoRef.current.srcObject = stream;
        }
      };
      
      stream.addEventListener("addtrack", handleTrackEvent);
      stream.addEventListener("removetrack", handleTrackEvent);
      return () => {
        stream.removeEventListener("addtrack", handleTrackEvent);
        stream.removeEventListener("removetrack", handleTrackEvent);
      };
    }
  }, [stream]);

  return (
    <div className="relative bg-gray-950 rounded overflow-hidden aspect-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="object-cover w-full h-full"
      />
      <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
        {name}
      </div>
    </div>
  );
}
