import React, { FunctionComponent, useState } from "react";
import { Color, RoomId } from "shared/types";
import EventManager_TicTacToe from "../EventManager/EventManager_TicTacToe";

const eventManager = new EventManager_TicTacToe();
const TicTacToePage: FunctionComponent = () => {
  console.log("Tic Tac Toe Page Render");
  const {
    connectionStatus,
    isHost,
    roomId,
    color: c,
  } = eventManager.p2pManager.useP2PStore();
  return (
    <div style={{ display: "flex", padding: 40 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          alignItems: "center",
        }}
      >
        <h1>Event System Prototype</h1>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
            justifyContent: "space-between",
          }}
        >
          <p>{`Connection Status: ${connectionStatus}`}</p>
          <p>{`Is Host: ${isHost}`}</p>
          <p>{`Room Id: ${roomId}`}</p>
          <p>{`Color: ${c}`}</p>
        </div>
        <div style={{ height: 2, backgroundColor: "black", width: "100%" }} />
        <div>
          {connectionStatus === "Lobby" && (
            <LobbyView
              onCreate={({ color }) =>
                eventManager.p2pManager.requestCreateRoom({ color })
              }
              onJoin={({ color, roomId: r }) =>
                eventManager.p2pManager.requestJoinRoom({
                  color,
                  roomId: r,
                })
              }
            />
          )}
        </div>
        <div>{connectionStatus === "Room" && <GameView />}</div>
      </div>
    </div>
  );
};

const Button: FunctionComponent<{
  style?: React.CSSProperties;
  onClick: () => void;
}> = ({ style = {}, children, onClick }) => {
  return (
    <button
      style={{
        minWidth: 400,
        borderRadius: 8,
        padding: 8,
        margin: 8,
        border: "1px solid black",
        cursor: "pointer",
        ...style,
      }}
      onClick={onClick}
    >
      <h2>{children}</h2>
    </button>
  );
};

const LobbyView: FunctionComponent<{
  onCreate: ({ color }) => void;
  onJoin: ({ color, roomId }) => void;
}> = ({ onCreate, onJoin }) => {
  const [view, setView] = useState<"INDEX" | "JOIN" | "HOST">("INDEX");

  return (
    <>
      {view !== "INDEX" && (
        <button
          style={{ margin: 8, padding: 8 }}
          onClick={() => {
            setView("INDEX");
          }}
        >
          Back
        </button>
      )}
      {view === "INDEX" && (
        <JoinOrHost
          onCreate={() => setView("HOST")}
          onJoin={() => setView("JOIN")}
        />
      )}
      {view === "JOIN" && <JoinGameView onJoin={onJoin} />}
      {view === "HOST" && <CreateGameView onCreate={onCreate} />}
    </>
  );
};

const JoinOrHost = ({ onCreate, onJoin }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
    }}
  >
    <Button onClick={onCreate}>Create Game</Button>
    <Button onClick={onJoin}>Join Game</Button>
  </div>
);

const PLAYER_OPTIONS: Color[] = ["ORANGE", "RED", "WHITE", "BLUE"];

const CreateGameView: FunctionComponent<{
  onCreate: ({ color }: { color: Color }) => void;
}> = ({ onCreate }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      {PLAYER_OPTIONS.map((c) => (
        <Button
          style={{ backgroundColor: c.toLocaleLowerCase() }}
          key={c}
          onClick={() => onCreate({ color: c })}
        >
          {`Create as ${c}`}
        </Button>
      ))}
    </div>
  );
};

const JoinGameView: FunctionComponent<{
  onJoin: ({ color, roomId }: { color: Color; roomId: RoomId }) => void;
}> = ({ onJoin }) => {
  const [code, setCode] = useState("");
  const handleChange = (event) => setCode(event.target.value);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      <input
        style={{
          margin: 10,
          marginTop: 18,
          padding: 8,
          fontFamily: "HK Grotesk",
          fontSize: 30,
        }}
        onChange={handleChange}
        value={code}
      />
      {PLAYER_OPTIONS.map((c) => (
        <Button
          style={{ backgroundColor: c.toLocaleLowerCase() }}
          key={c}
          onClick={() => onJoin({ color: c as Color, roomId: code as RoomId })}
        >
          {`Join as ${c}`}
        </Button>
      ))}
    </div>
  );
};

const GameView: FunctionComponent = () => {
  const { tiles } = eventManager.gameStateManager.useState();
  return (
    <div
      style={{
        marginTop: 20,
        paddingTop: 12,
        width: 500,
        height: 500,
        backgroundColor: "gray",
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-around",
        flexWrap: "wrap",
      }}
    >
      {tiles.map((columns, i) =>
        columns.map((t, ii) => (
          <Tile
            onPress={() => {
              const { color } = eventManager.p2pManager.useP2PStore.getState();
              if (
                eventManager.gameStateManager.useState.getState().tiles[i][
                  ii
                ] === color
              ) {
                removeTile(ii, i);
              } else {
                placeTile(color, ii, i);
              }
            }}
            key={`tile ${i} ${ii}`}
            color={tiles[i][ii]}
          />
        ))
      )}
    </div>
  );
};

const placeTile = (color, x, y) =>
  eventManager.p2pManager.emitToHost([
    {
      type: "PLACE_PIECE",
      data: {
        color: color,
        location: {
          x,
          y,
        },
      },
    },
  ]);

const removeTile = (x, y) =>
  eventManager.p2pManager.emitToHost([
    {
      type: "REMOVE_PIECE",
      data: {
        location: {
          x,
          y,
        },
      },
    },
  ]);

const Tile: FunctionComponent<{
  onPress: () => void;
  color: Color | "empty";
}> = ({ onPress, color }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onPress}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer",
        width: 150,
        height: 150,
        boxSizing: "border-box",
        zIndex: hovered ? 10 : 0,
        border: hovered ? "4px solid black" : "2px solid white",
        transition: "ease 0.2s border",
        backgroundColor: color !== "empty" ? color.toLowerCase() : "#aaa",
      }}
    />
  );
};

export default TicTacToePage;
