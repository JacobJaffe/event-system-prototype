import * as express from "express";
import logger from "./logger";
import { Server, Socket } from "socket.io";
import RoomManager from "./RoomManager";
import { PlayerId, RoomId } from "@kotan/shared/types";
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
          reason: `Handle Event Error`,
          error: JSON.stringify(e.message || e),
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
        broadcastToRoom(roomId, { type: "NEW_HOST", payload: { newHostId } });
      }
    } else {
      logger.info(`${playerId} | not in any rooms to be removed from`);
    }
  });
});

const handleEvent = (socket: Socket, event: ClientEmittedEvent | P2PEvent) => {
  const playerId = socket.id as PlayerId;

  // TODO: consider logging these less verbosely
  if (
    event.type !== "HOST_BROADCAST" &&
    event.type !== "REQUEST_TO_HOST" &&
    event.type !== "RESPONSE_FROM_HOST"
  ) {
    logger.info(`${socket.id} | ${event.type}`);
  }

  switch (event.type) {
    case "HOST_GAME": {
      const { color } = event.payload;
      const roomId = RoomManager.createRoom(playerId);
      RoomManager.addPlayerToRoom({ playerId, color }, roomId);
      socket.join(roomId);
      respondEvent(socket, { type: "NEW_ROOM_CREATED", payload: { roomId } });
      return;
    }
    case "JOIN_GAME": {
      const { color, roomId } = event.payload;
      const { error } = RoomManager.addPlayerToRoom(
        { playerId, color },
        roomId
      );

      if (error) {
        respondEvent(socket, {
          type: "ROOM_JOIN_FAILURE",
          payload: { reason: error, roomId },
        });
        return;
      }
      socket.join(roomId);
      respondEvent(socket, { type: "ROOM_JOINED", payload: { roomId } });
      return;
    }

    case "REQUEST_TO_HOST": {
      forwardToHost(socket, event);
      return;
    }

    case "RESPONSE_FROM_HOST": {
      forwardToRequester(socket, event);
      return;
    }

    case "HOST_BROADCAST": {
      // TODO: (?) ensure socket is host
      hostBroadcastToRoom(socket, event);
      return;
    }

    default: {
      exhaustSilently(event);
      logger.error(event, `eventHandler: unexpected event`);
      respondEvent(socket, {
        type: "UNHANDLED_ERROR",
        payload: { reason: `Unknown event`, event },
      });
    }
  }
};

const exhaustSilently = (foo: never) => {
  void foo;
};

const respondEvent = (
  socket: Socket,
  { type, payload }: ServerEmittedEvent
) => {
  socket.emit(type, payload);
};

const broadcastToRoom = (roomId, { type, payload }: ServerEmittedEvent) => {
  io.to(roomId).emit(type, payload);
};

// TODO: error handling?
const forwardToHost = (clientSocket: Socket, event: ClientToHostRequest) => {
  const { roomId, error } = RoomManager.getRoomIdByPlayerId(
    clientSocket.id as PlayerId
  );
  if (error) throw new Error(error);
  const { hostId } = RoomManager.getRoom(roomId);
  io.to(hostId).emit(event.type, event.payload);
};

// TODO: error handling?
const forwardToRequester = (
  hostSocket: Socket,
  event: HostToClientResponse
) => {
  const {
    payload: { requesterId },
  } = event;
  io.to(requesterId).emit(event.type, event.payload);
};

const hostBroadcastToRoom = (hostSocket: Socket, event: HostBroadcastEvent) => {
  const { roomId } = RoomManager.getRoomIdByPlayerId(hostSocket.id as PlayerId);
  if (!roomId) throw new Error("socket not found to be in room");
  hostSocket.to(roomId).emit(event.type, event.payload);
};
