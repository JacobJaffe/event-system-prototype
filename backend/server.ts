import * as express from "express";
import logger from "./logger";
import { Server, Socket } from "socket.io";
import RoomManager from "./RoomManager";
import { PlayerId, RoomId } from "@kotan/shared/types";
import type {
  BroadcastRoomEvent,
  EmitToHostEvent,
  P2PManagementEvent_client,
  P2PManagementEvent_server,
  ServerErrorEvent,
} from "@kotan/shared/socket/types";
import * as cors from "cors";

const PORT = process.env.PORT || 5000;
const app = express();

const allowedOrigins = ["http://localhost:3000"];
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin
      // (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS Policy For This Site Does Not " +
          "Allow Access From The Specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  })
);

app.get("/roomStatus/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = RoomManager.getRoom(roomId as RoomId);
  if (room) {
    res.json(room);
  } else {
    res.status(404).send(`room not found`);
  }
});

const server = app.listen(PORT, () => {
  logger.info(`App listening to http://localhost:${PORT}`);
  logger.info("Press Ctrl+C to quit.");
});

// Allows CORS policy between the client & server (different hosts)
const io = new Server(server, {
  serveClient: false,
  cors: {
    // credentials: true,
    origin: allowedOrigins, // TODO: real host
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket: Socket) => {
  logger.info(`${socket.id} | Connection`);
  socket.onAny((type, payload) => {
    try {
      handleEvent(socket, { type, payload });
    } catch (e) {
      logger.error(e, "Handle Event Error");
      respondEvent(socket, {
        type: "UNHANDLED_ERROR",
        payload: {
          message: `Handle Event Error`,
          extra: { error: JSON.stringify(e.message || e) },
        },
      });
      // Force client to disconnect on Error to prevent these logs from blowing up.
      logger.info(`Forcing disconnect of socket: ${socket.id}`);
      socket.disconnect();
    }
  });

  socket.on("disconnect", () => {
    const playerId = socket.id as PlayerId;
    logger.info(`${playerId} | Disconnect`);
    const { roomId } = RoomManager.getRoomIdByPlayerId(playerId);
    if (roomId) {
      const { hostId: previousHostId } = RoomManager.getRoom(roomId);
      const { newHostId } = RoomManager.removePlayerFromRoom(playerId, roomId);
      logger.info(`${playerId} | Removed from room: ${roomId}`);
      if (newHostId !== previousHostId) {
        logger.info(`New host for room ${roomId}: ${newHostId || "NO_HOST"}`);
        broadcastToRoom(roomId, {
          type: "P2P_MANAGEMENT__SERVER",
          payload: {
            type: "NEW_HOST",
            data: {
              hostId: newHostId,
            },
          },
        });
      }
    } else {
      logger.info(`${playerId} | not in any rooms to be removed from`);
    }
  });
});

const handleEvent = (
  socket: Socket,
  event:
    | P2PManagementEvent_client
    | EmitToHostEvent<unknown>
    | BroadcastRoomEvent<unknown>
) => {
  const playerId = socket.id as PlayerId;

  logger.info(`${socket.id} | ${event.type}`);

  switch (event.type) {
    case "P2P_MANAGEMENT__CLIENT": {
      switch (event.payload.type) {
        case "REQUEST_HOST": {
          const { color } = event.payload.data;
          const roomId = RoomManager.createRoom(playerId);
          RoomManager.addPlayerToRoom({ playerId, color }, roomId);
          socket.join(roomId);
          respondEvent(socket, {
            type: "P2P_MANAGEMENT__SERVER",
            payload: {
              type: "ROOM_JOIN_SUCCESS",
              data: {
                isHost: true,
                isNewRoom: true,
                roomId: roomId,
                color: color,
              },
            },
          });
          return;
        }
        case "REQUEST_JOIN": {
          const { color, roomId, hostIfNeeded } = event.payload.data;
          const { error } = RoomManager.addPlayerToRoom(
            { playerId, color },
            roomId
          );

          if (error) {
            // For reconnections, clients will add this flag.
            // This allows them to host the game with the same code.
            if (error === "ROOM_NOT_FOUND" && hostIfNeeded) {
              RoomManager.createRoom(playerId, roomId);
              RoomManager.addPlayerToRoom({ playerId, color }, roomId);
              socket.join(roomId);
              respondEvent(socket, {
                type: "P2P_MANAGEMENT__SERVER",
                payload: {
                  type: "ROOM_JOIN_SUCCESS",
                  data: {
                    isHost: true,
                    isNewRoom: true,
                    roomId: roomId,
                    color: color,
                  },
                },
              });
            } else {
              respondEvent(socket, {
                type: "P2P_MANAGEMENT__SERVER",
                payload: {
                  type: "ROOM_JOIN_FAILURE",
                  data: {
                    failureMessage: error,
                    roomId: roomId,
                    color: color,
                  },
                },
              });
            }

            return;
          }
          socket.join(roomId);
          respondEvent(socket, {
            type: "P2P_MANAGEMENT__SERVER",
            payload: {
              type: "ROOM_JOIN_SUCCESS",
              data: {
                isHost: false,
                isNewRoom: false,
                roomId: roomId,
                color: color,
              },
            },
          });
          return;
        }
        default: {
          exhaustSilently(event.payload);
          return;
        }
      }
    }
    case "EMIT_TO_HOST": {
      forwardToHost(socket, event);
      return;
    }

    case "BROADCAST_ROOM": {
      hostBroadcastToRoom(socket, event);
      return;
    }

    default: {
      exhaustSilently(event);
      logger.error(event, `eventHandler: unexpected event`);
      respondEvent(socket, {
        type: "UNHANDLED_ERROR",
        payload: { message: `Unknown event`, extra: { event } },
      });
    }
  }
};

const exhaustSilently = (foo: never) => {
  void foo;
};

const respondEvent = (
  socket: Socket,
  { type, payload }: ServerErrorEvent | P2PManagementEvent_server
) => {
  socket.emit(type, payload);
};

/**
 * Broadcast, as the Server, NOT as the host.
 * e.g. for "NEW_HOST" event.
 */
const broadcastToRoom = (
  roomId,
  { type, payload }: P2PManagementEvent_server
) => {
  io.to(roomId).emit(type, payload);
};

// TODO: error handling?
const forwardToHost = (
  clientSocket: Socket,
  event: EmitToHostEvent<unknown>
) => {
  const { roomId, error } = RoomManager.getRoomIdByPlayerId(
    clientSocket.id as PlayerId
  );
  if (error) throw new Error(error);
  const { hostId } = RoomManager.getRoom(roomId);
  io.to(hostId).emit(event.type, event.payload);
};

const hostBroadcastToRoom = (
  hostSocket: Socket,
  event: BroadcastRoomEvent<unknown>
) => {
  const { roomId } = RoomManager.getRoomIdByPlayerId(hostSocket.id as PlayerId);
  if (!roomId) throw new Error("socket not found to be in room");
  const { hostId } = RoomManager.getRoom(roomId);
  if (hostId !== hostSocket.id)
    throw new Error("socket not host of room, cannot broadcast");
  hostSocket.to(roomId).emit(event.type, event.payload);
};
