import { WebSocketServer } from "ws";

// A map to store rooms: key = partyId, value = Set of active WebSocket connections
const rooms = new Map();

export function initSignalingServer(server) {
  const wss = new WebSocketServer({ server });
  console.log("WebSocket Signaling server attached to HTTP server");

  wss.on("connection", (ws) => {
    let currentRoomId = null;
    let userId = null;
    let userName = null;

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);
        
        switch (data.type) {
          case "join": {
            const { roomId, uid, name } = data;
            currentRoomId = roomId;
            userId = uid;
            userName = name;
            
            // Get or create room Set
            if (!rooms.has(roomId)) {
              rooms.set(roomId, new Set());
            }
            const roomClients = rooms.get(roomId);
            
            // Attach user metadata directly to their WebSocket socket connection object
            ws.userId = uid;
            ws.userName = name;
            
            roomClients.add(ws);
            console.log(`User ${name} (${uid}) joined Watch Party room ${roomId}. Room size: ${roomClients.size}`);
            
            // Notify other peers in the room that a new peer has joined
            broadcastToRoom(roomId, ws, {
              type: "peer-joined",
              uid: uid,
              name: name,
              peerCount: roomClients.size
            });
            
            // Send the list of existing peers in the room back to the user who just joined
            // so they can initiate WebRTC handshakes with each of them
            const existingPeers = [];
            roomClients.forEach((client) => {
              if (client !== ws) {
                existingPeers.push({
                  uid: client.userId,
                  name: client.userName
                });
              }
            });
            
            ws.send(JSON.stringify({
              type: "room-users",
              users: existingPeers
            }));
            break;
          }
          
          case "signal": {
            // Forward WebRTC signals (SDP offer/answer, ICE candidate) to a specific target peer in the room
            const { targetUid, signal } = data;
            if (currentRoomId && rooms.has(currentRoomId)) {
              const roomClients = rooms.get(currentRoomId);
              roomClients.forEach((client) => {
                if (client.userId === targetUid) {
                  client.send(JSON.stringify({
                    type: "signal",
                    senderUid: userId,
                    senderName: userName,
                    signal: signal
                  }));
                }
              });
            }
            break;
          }

          case "chat-message": {
            // Broadcast text messages to everyone in the room
            const { text } = data;
            if (currentRoomId) {
              broadcastToRoom(currentRoomId, null, {
                type: "chat-message",
                senderUid: userId,
                senderName: userName,
                text: text,
                timestamp: new Date().toISOString()
              });
            }
            break;
          }

          case "video-control": {
            // Broadcast playback sync commands (play, pause, seek) to everyone else in the room
            const { action, time } = data;
            if (currentRoomId) {
              broadcastToRoom(currentRoomId, ws, {
                type: "video-control",
                senderUid: userId,
                action: action,
                time: time
              });
            }
            break;
          }

          case "select-video": {
            // Broadcast active selected video changes to everyone else in the room
            const { videoId } = data;
            if (currentRoomId) {
              broadcastToRoom(currentRoomId, ws, {
                type: "select-video",
                videoId: videoId
              });
            }
            break;
          }
          
          default:
            console.log("Unknown WebSocket message type:", data.type);
        }
      } catch (err) {
        console.error("Error processing WebSocket message:", err.message);
      }
    });

    ws.on("close", () => {
      if (currentRoomId && rooms.has(currentRoomId)) {
        const roomClients = rooms.get(currentRoomId);
        roomClients.delete(ws);
        console.log(`User ${userName} disconnected from Watch Party room ${currentRoomId}. Room size: ${roomClients.size}`);
        
        // Notify others that this peer left
        broadcastToRoom(currentRoomId, null, {
          type: "peer-left",
          uid: userId,
          name: userName,
          peerCount: roomClients.size
        });
        
        // Clean up empty room
        if (roomClients.size === 0) {
          rooms.delete(currentRoomId);
          console.log(`Watch Party room ${currentRoomId} is empty. Deleted room.`);
        }
      }
    });
  });
}

function broadcastToRoom(roomId, excludeWs, payload) {
  if (!rooms.has(roomId)) return;
  const roomClients = rooms.get(roomId);
  const msgString = JSON.stringify(payload);
  
  roomClients.forEach((client) => {
    if (client !== excludeWs && client.readyState === 1) { // 1 = OPEN
      client.send(msgString);
    }
  });
}
