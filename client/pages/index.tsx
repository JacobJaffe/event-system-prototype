import Socket_P2PManager from "client/EventManager/P2PManager";
import React, { FunctionComponent, useMemo, useState } from "react";
import { Color, RoomId } from "shared/types";

type VerifiedEventId = string & { isEventId: true };

interface Event<T extends string, U> {
  type: T;
  data: U;
}

type SendMessageEvent = Event<"SEND_MESSAGE", { message: string }>;

interface RequestedEvent<T = SendMessageEvent> {
  type: "REQUESTED_EVENT";
  event: T;
}

interface VerifiedEvent<T = SendMessageEvent> {
  type: "VERIFIED_EVENT";
  eventId: VerifiedEventId;
  event: T;
}

const IndexPage: FunctionComponent = () => {
  const p2pManager = useMemo(() => {
    const manager = new Socket_P2PManager<RequestedEvent, VerifiedEvent>();
    manager.initHandlers({
      onReceiveBroadcast: () => null,
      onReceiveEmit: () => null,
    });
    return manager;
  }, []);

  const {
    connectionStatus,
    isHost,
    roomId,
    color: c,
  } = p2pManager.useP2PStore();
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
              onCreate={({ color }) => p2pManager.requestCreateRoom({ color })}
              onJoin={({ color, roomId: r }) =>
                p2pManager.requestJoinRoom({ color, roomId: r })
              }
            />
          )}
        </div>
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

export default IndexPage;
