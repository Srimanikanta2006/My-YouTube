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
            
            // Get or create room info object
            if (!rooms.has(roomId)) {
              rooms.set(roomId, {
                clients: new Set(),
                hostUid: uid, // Set first joining client as the host
                deleteTimeout: null
              });
            }
            const roomObj = rooms.get(roomId);

            if (roomObj.deleteTimeout) {
              clearTimeout(roomObj.deleteTimeout);
              roomObj.deleteTimeout = null;
              console.log(`User joined empty room ${roomId}. Cancelled deletion timeout.`);
            }
            
            // Attach user metadata directly to their WebSocket socket connection object
            ws.userId = uid;
            ws.userName = name;
            
            roomObj.clients.add(ws);
            console.log(`User ${name} (${uid}) joined Watch Party room ${roomId}. Host: ${roomObj.hostUid}. Room size: ${roomObj.clients.size}`);
            
            // Notify other peers in the room that a new peer has joined, passing hostUid
            broadcastToRoom(roomId, ws, {
              type: "peer-joined",
              uid: uid,
              name: name,
              peerCount: roomObj.clients.size,
              hostUid: roomObj.hostUid
            });
            
            // Send current list of participants and hostUid to the joining user
            const usersList = [];
            roomObj.clients.forEach((client) => {
              if (client.userId !== uid) {
                usersList.push({
                  uid: client.userId,
                  name: client.userName
                });
              }
            });
            
            ws.send(JSON.stringify({
              type: "room-users",
              users: usersList,
              hostUid: roomObj.hostUid
            }));
            break;
          }
          
          case "signal": {
            // Forward WebRTC signals (SDP offer/answer, ICE candidate) to a specific target peer in the room
            const { targetUid, signal } = data;
            if (currentRoomId && rooms.has(currentRoomId)) {
              const roomObj = rooms.get(currentRoomId);
              roomObj.clients.forEach((client) => {
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

          case "host-sync-state": {
            // Forward host sync parameters (video ID, time, play status) to a specific target peer
            const { targetUid } = data;
            if (currentRoomId && rooms.has(currentRoomId)) {
              const roomObj = rooms.get(currentRoomId);
              roomObj.clients.forEach((client) => {
                if (client.userId === targetUid) {
                  client.send(JSON.stringify(data));
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
        const roomObj = rooms.get(currentRoomId);
        roomObj.clients.delete(ws);
        console.log(`User ${userName} disconnected from Watch Party room ${currentRoomId}. Room size: ${roomObj.clients.size}`);
        
        // Host transfer logic: if the host left and there are remaining clients, elect a new host
        if (roomObj.hostUid === userId && roomObj.clients.size > 0) {
          const nextClient = roomObj.clients.values().next().value;
          if (nextClient) {
            roomObj.hostUid = nextClient.userId;
            console.log(`Host left watch party room ${currentRoomId}. Transferred host role to ${nextClient.userName} (${nextClient.userId})`);
            broadcastToRoom(currentRoomId, null, {
              type: "new-host",
              hostUid: roomObj.hostUid
            });
          }
        }

        // Notify others that this peer left
        broadcastToRoom(currentRoomId, null, {
          type: "peer-left",
          uid: userId,
          name: userName,
          peerCount: roomObj.clients.size
        });
        
        // Clean up empty room with 1 minute delay
        if (roomObj.clients.size === 0) {
          console.log(`Watch Party room ${currentRoomId} is empty. Scheduling deletion in 1 minute...`);
          roomObj.deleteTimeout = setTimeout(() => {
            if (rooms.has(currentRoomId)) {
              const currentRoom = rooms.get(currentRoomId);
              if (currentRoom.clients.size === 0) {
                rooms.delete(currentRoomId);
                console.log(`Watch Party room ${currentRoomId} remained empty for 1 minute. Deleted room.`);
              }
            }
          }, 60000);
        }
    });
  });
  return wss;
}

function broadcastToRoom(roomId, excludeWs, payload) {
  if (!rooms.has(roomId)) return;
  const roomObj = rooms.get(roomId);
  const msgString = JSON.stringify(payload);
  
  roomObj.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === 1) { // 1 = OPEN
      client.send(msgString);
    }
  });
}
