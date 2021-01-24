import { RoomId } from "@ESP/shared/types";

let isFirstRoom = true;
const generateRoomId = (length: number): RoomId => {
  // Easier to develop with a consistent roomId, e.g. for postman requests
  if (process.env.NODE_ENV === "development" && isFirstRoom) {
    isFirstRoom = false;
    return "ABC-123" as RoomId;
  }

  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    if (i === 3) result += "-"; // TODO: consider _only_ doing this on the client side.
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result as RoomId;
};

export default generateRoomId;
