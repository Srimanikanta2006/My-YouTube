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
            const { roomId, uid, name, createMode } = data;
            currentRoomId = roomId;
            userId = uid;
            userName = name;

            // Get or create room info object
            if (!rooms.has(roomId)) {
              if (createMode) {
                rooms.set(roomId, {
                  clients: new Set(),
                  hostUid: uid, // Set first joining client as the host
                  hostDisconnectTimeout: null,
                  deleteTimeout: null,
                });
              } else {
                ws.send(JSON.stringify({
                  type: "error",
                  message: "Watch Party room not found or has been closed."
                }));
                ws.close();
                return;
              }
            }
            const roomObj = rooms.get(roomId);

            if (roomObj.deleteTimeout) {
              clearTimeout(roomObj.deleteTimeout);
              roomObj.deleteTimeout = null;
            }

            // If host reconnected during grace period (e.g. on page refresh), preserve host role
            if (roomObj.hostUid === uid && roomObj.hostDisconnectTimeout) {
              clearTimeout(roomObj.hostDisconnectTimeout);
              roomObj.hostDisconnectTimeout = null;
            }

            // Attach user metadata directly to their WebSocket socket connection object
            ws.userId = uid;
            ws.userName = name;

            roomObj.clients.add(ws);

            // Notify other peers in the room that a new peer has joined, passing hostUid
            broadcastToRoom(roomId, ws, {
              type: "peer-joined",
              uid: uid,
              name: name,
              peerCount: roomObj.clients.size,
              hostUid: roomObj.hostUid,
            });

            // Send current list of participants and hostUid to the joining user
            const usersList = [];
            roomObj.clients.forEach((client) => {
              if (client.userId !== uid) {
                usersList.push({
                  uid: client.userId,
                  name: client.userName,
                });
              }
            });

            ws.send(
              JSON.stringify({
                type: "room-users",
                users: usersList,
                hostUid: roomObj.hostUid,
                activeVideoId: roomObj.activeVideoId || null,
                activeTime: roomObj.activeTime || 0,
                activePaused: roomObj.activePaused !== undefined ? roomObj.activePaused : true,
              }),
            );
            break;
          }

          case "signal": {
            // Forward WebRTC signals (SDP offer/answer, ICE candidate) to a specific target peer in the room
            const { targetUid, signal } = data;
            if (currentRoomId && rooms.has(currentRoomId)) {
              const roomObj = rooms.get(currentRoomId);
              roomObj.clients.forEach((client) => {
                if (client.userId === targetUid) {
                  client.send(
                    JSON.stringify({
                      type: "signal",
                      senderUid: userId,
                      senderName: userName,
                      signal: signal,
                    }),
                  );
                }
              });
            }
            break;
          }

          case "host-sync-state": {
            // Forward host sync parameters (video ID, time, play status) to a specific target peer and store in room
            const { targetUid, videoId, time, paused } = data;
            if (currentRoomId && rooms.has(currentRoomId)) {
              const roomObj = rooms.get(currentRoomId);
              if (videoId) roomObj.activeVideoId = videoId;
              if (typeof time === "number") roomObj.activeTime = time;
              if (typeof paused === "boolean") roomObj.activePaused = paused;

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
                timestamp: new Date().toISOString(),
              });
            }
            break;
          }

          case "video-control": {
            // Broadcast playback sync commands (play, pause, seek) ONLY IF sender is room host
            const { action, time } = data;
            if (currentRoomId && rooms.has(currentRoomId)) {
              const roomObj = rooms.get(currentRoomId);
              if (roomObj.hostUid === userId) {
                if (typeof time === "number") roomObj.activeTime = time;
                if (action === "play") roomObj.activePaused = false;
                if (action === "pause") roomObj.activePaused = true;

                broadcastToRoom(currentRoomId, ws, {
                  type: "video-control",
                  senderUid: userId,
                  action: action,
                  time: time,
                });
              } else {
                console.warn(`Non-host user ${userName} (${userId}) attempted video-control in room ${currentRoomId}. Request ignored.`);
              }
            }
            break;
          }

          case "select-video": {
            // Broadcast active selected video changes ONLY IF sender is room host
            const { videoId } = data;
            if (currentRoomId && rooms.has(currentRoomId)) {
              const roomObj = rooms.get(currentRoomId);
              if (roomObj.hostUid === userId) {
                roomObj.activeVideoId = videoId;
                broadcastToRoom(currentRoomId, ws, {
                  type: "select-video",
                  videoId: videoId,
                });
              } else {
                console.warn(`Non-host user ${userName} (${userId}) attempted select-video in room ${currentRoomId}. Request ignored.`);
              }
            }
            break;
          }

          case "leave-room": {
            if (currentRoomId && rooms.has(currentRoomId)) {
              const roomObj = rooms.get(currentRoomId);
              roomObj.clients.delete(ws);

              // Immediate host transfer when host explicitly leaves
              if (roomObj.hostUid === userId && roomObj.clients.size > 0) {
                if (roomObj.hostDisconnectTimeout) {
                  clearTimeout(roomObj.hostDisconnectTimeout);
                  roomObj.hostDisconnectTimeout = null;
                }
                const nextClient = roomObj.clients.values().next().value;
                if (nextClient) {
                  roomObj.hostUid = nextClient.userId;
                  broadcastToRoom(currentRoomId, null, {
                    type: "new-host",
                    hostUid: roomObj.hostUid,
                  });
                }
              }

              // Notify others
              broadcastToRoom(currentRoomId, null, {
                type: "peer-left",
                uid: userId,
                name: userName,
                peerCount: roomObj.clients.size,
              });

              // Clean up empty room immediately
              if (roomObj.clients.size === 0) {
                if (roomObj.hostDisconnectTimeout) clearTimeout(roomObj.hostDisconnectTimeout);
                if (roomObj.deleteTimeout) clearTimeout(roomObj.deleteTimeout);
                rooms.delete(currentRoomId);
              }
            }
            break;
          }

          case "user-media-state":
          case "user-sync-state":
            if (currentRoomId) {
              broadcastToRoom(currentRoomId, ws, data);
            }
            break;

          default:
            break;
        }
      } catch (err) {
        console.error("Error processing WebSocket message:", err.message);
      }
    });

    ws.on("close", () => {
      if (currentRoomId && rooms.has(currentRoomId)) {
        const roomObj = rooms.get(currentRoomId);
        
        // Check if the client was already removed by leave-room message
        if (roomObj.clients.has(ws)) {
          roomObj.clients.delete(ws);

          const isHost = roomObj.hostUid === userId;

          // If host disconnected (e.g. page refresh), set 6s grace period before transferring host role
          if (isHost && roomObj.clients.size > 0) {
            if (roomObj.hostDisconnectTimeout) {
              clearTimeout(roomObj.hostDisconnectTimeout);
            }
            roomObj.hostDisconnectTimeout = setTimeout(() => {
              roomObj.hostDisconnectTimeout = null;
              if (rooms.has(currentRoomId) && roomObj.clients.size > 0) {
                const nextClient = roomObj.clients.values().next().value;
                if (nextClient) {
                  roomObj.hostUid = nextClient.userId;
                  broadcastToRoom(currentRoomId, null, {
                    type: "new-host",
                    hostUid: roomObj.hostUid,
                  });
                }
              }
            }, 6000);
          }

          // Notify others that this peer left
          broadcastToRoom(currentRoomId, null, {
            type: "peer-left",
            uid: userId,
            name: userName,
            peerCount: roomObj.clients.size,
          });
        }

        // Clean up empty room after grace period
        if (roomObj.clients.size === 0) {
          if (!roomObj.deleteTimeout) {
            roomObj.deleteTimeout = setTimeout(() => {
              if (rooms.has(currentRoomId) && rooms.get(currentRoomId).clients.size === 0) {
                if (rooms.get(currentRoomId).hostDisconnectTimeout) {
                  clearTimeout(rooms.get(currentRoomId).hostDisconnectTimeout);
                }
                rooms.delete(currentRoomId);
              }
            }, 6000);
          }
        }
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
    if (client !== excludeWs && client.readyState === 1) {
      // 1 = OPEN
      client.send(msgString);
    }
  });
}
