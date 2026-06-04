export const STREAM_URL = "https://bcb.stream41.radiohost.de/bcb-radio_mp3-192";
export const TRACK_SOCKET_URL =
  "wss://audioapi.net/api/v1/sockjs/291/rclfiblm/websocket";
export const TRACK_DESTINATION = "/topic/radios/wcd/tracks";

const NULL_TERMINATOR = "\u0000";
const SOCKJS_OPEN = "__sockjs_open__";
const SOCKJS_HEARTBEAT = "__sockjs_heartbeat__";

export const SOCKJS_EVENTS = {
  OPEN: SOCKJS_OPEN,
  HEARTBEAT: SOCKJS_HEARTBEAT,
};

export function buildConnectFrame() {
  return `CONNECT\naccept-version:1.2,1.1,1.0\nheart-beat:10000,10000\n\n${NULL_TERMINATOR}`;
}

export function buildSubscribeFrame(destination, id = "sub-0") {
  return `SUBSCRIBE\nid:${id}\ndestination:${destination}\n\n${NULL_TERMINATOR}`;
}

export function wrapSockJsFrame(frame) {
  return JSON.stringify([frame]);
}

export function parseSockJsPayload(payload) {
  if (payload === "o") {
    return [SOCKJS_OPEN];
  }

  if (payload === "h") {
    return [SOCKJS_HEARTBEAT];
  }

  if (payload.startsWith("a")) {
    return JSON.parse(payload.slice(1));
  }

  return [payload];
}

export function parseStompFrame(frame) {
  if (!frame || frame === "\n") {
    return null;
  }

  const sanitized = frame.endsWith(NULL_TERMINATOR)
    ? frame.slice(0, -1)
    : frame;
  const separatorIndex = sanitized.indexOf("\n\n");

  if (separatorIndex === -1) {
    return null;
  }

  const head = sanitized.slice(0, separatorIndex);
  const body = sanitized.slice(separatorIndex + 2);
  const [command, ...headerLines] = head.split("\n");

  if (!command) {
    return null;
  }

  const headers = {};

  for (const line of headerLines) {
    const colonIndex = line.indexOf(":");

    if (colonIndex === -1) {
      continue;
    }

    const name = line.slice(0, colonIndex);
    const value = line.slice(colonIndex + 1);
    headers[name] = value;
  }

  return {
    command,
    headers,
    body,
  };
}

export function extractTrack(body) {
  let entries;

  try {
    entries = JSON.parse(body);
  } catch {
    return null;
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    return null;
  }

  const track =
    entries.find((entry) => entry && typeof entry === "object" && entry.valid !== false) ??
    entries[0];

  if (!track || typeof track !== "object") {
    return null;
  }

  const artist = String(track.artist ?? "").trim() || "Unknown artist";
  const title = String(track.title ?? "").trim() || "Unknown title";
  const artwork =
    track.picture?.medium ??
    track.picture?.small ??
    track.picture?.big ??
    track.picture?.xl ??
    null;
  const label = [artist, title]
    .filter((value) => !value.startsWith("Unknown "))
    .join(" - ") || "Unknown track";

  return {
    artist,
    title,
    artwork,
    label,
  };
}
