import { Color, PlayerId, RoomId } from "@esp/shared/types";
import generateRoomId from "./generateRoomId";

const CODE_LENGTH = 6;

type Player = { playerId: PlayerId; color: Color };

type RoomData = {
  id: RoomId;
  createdTimestamp: number;
  players: Player[];
  hostId: PlayerId | null;
};
class _RoomManager {
  private activeRooms: Map<RoomId, RoomData>;
  private playersToRoomIds: Map<PlayerId, RoomId>;

  constructor() {
    this.activeRooms = new Map();
    this.playersToRoomIds = new Map();
  }

  createRoom(playerId: PlayerId, overrideId?: RoomId): RoomId {
    // Basic check that a supplied room id matches our requirements.
    // TODO: harden this to really prevent malicious codes.
    if (
      overrideId &&
      (overrideId.length !== CODE_LENGTH + 1 || overrideId[3] !== "-")
    ) {
      throw new Error(`Supplied RoomId is invalid ${overrideId}`);
    }
    const id = overrideId || generateRoomId(CODE_LENGTH);
    if (this.activeRooms.has(id)) {
      throw new Error(`Duplicate RoomId: ${id}`);
    }
    const createdTimestamp = Date.now();
    this.activeRooms.set(id, {
      id,
      createdTimestamp,
      players: [],
      hostId: playerId,
    });
    return id;
  }

  doesRoomExist(roomId: RoomId): boolean {
    return this.activeRooms.has(roomId);
  }

  getRoomIdByPlayerId(
    playerId: PlayerId
  ): { roomId?: RoomId; error?: "PLAYER_NOT_FOUND" } {
    const roomId = this.playersToRoomIds.get(playerId);
    if (!roomId) return { roomId: null, error: "PLAYER_NOT_FOUND" };
    return { roomId: this.playersToRoomIds.get(playerId) };
  }

  addPlayerToRoom(
    player: Player,
    roomId: RoomId
  ): { error?: "ROOM_NOT_FOUND" | "ROOM_COLOR_DUPLICATE" } {
    const room = this.activeRooms.get(roomId);
    if (!room) {
      return { error: "ROOM_NOT_FOUND" };
    }
    if (room.players.find((p) => p.color === player.color)) {
      return { error: "ROOM_COLOR_DUPLICATE" };
    }

    this.activeRooms.set(roomId, {
      ...room,
      players: [...room.players, player],
    });
    this.playersToRoomIds.set(player.playerId, roomId);

    return { error: undefined };
  }

  removePlayerFromRoom(
    playerId: PlayerId,
    roomId: RoomId
  ): { newHostId: PlayerId | null; error?: "ROOM_NOT_FOUND" } {
    const room = this.activeRooms.get(roomId);
    if (!room) {
      return { newHostId: null, error: "ROOM_NOT_FOUND" };
    }

    const currentHostId = room.hostId;
    const newHostId =
      currentHostId === playerId
        ? room.players.find((p) => p.playerId !== playerId)?.playerId || null
        : currentHostId;

    console.log({ currentHostId, newHostId, players: room.players });

    const newPlayers = room.players.filter((p) => p.playerId !== playerId);
    if (newPlayers.length === 0) {
      this.activeRooms.delete(roomId);
    } else {
      this.activeRooms.set(roomId, {
        ...room,
        players: newPlayers,
        hostId: newHostId,
      });
    }

    this.playersToRoomIds.delete(playerId);
    return { newHostId };
  }

  getRoom(roomId) {
    return this.activeRooms.get(roomId);
  }
}

const RoomManager = new _RoomManager();
export default RoomManager;
