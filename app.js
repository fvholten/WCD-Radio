import {
  SOCKJS_EVENTS,
  STREAM_URL,
  TRACK_DESTINATION,
  TRACK_SOCKET_URL,
  buildConnectFrame,
  buildSubscribeFrame,
  extractTrack,
  parseSockJsPayload,
  parseStompFrame,
  wrapSockJsFrame,
} from "./radio.js";

const audio = document.querySelector("#stream");
const playToggle = document.querySelector("#play-toggle");
const volumeControl = document.querySelector("#volume");
const trackTitle = document.querySelector("#track-title");
const trackArtist = document.querySelector("#track-artist");
const artwork = document.querySelector("#artwork");
const artworkPlaceholder = document.querySelector("#artwork-placeholder");
const streamStatus = document.querySelector("#stream-status");
const feedStatus = document.querySelector("#feed-status");

audio.src = STREAM_URL;
audio.volume = Number(volumeControl.value) / 100;

let socket;
let reconnectTimer;

function updatePlayButton() {
  playToggle.textContent = audio.paused ? "Play" : "Pause";
}

function setStreamStatus(message) {
  streamStatus.textContent = message;
}

function setFeedStatus(message) {
  feedStatus.textContent = message;
}

function renderTrack(track) {
  trackTitle.textContent = track.title;
  trackArtist.textContent = track.artist;

  if (track.artwork) {
    artwork.src = track.artwork;
    artwork.hidden = false;
    artworkPlaceholder.hidden = true;
  } else {
    artwork.removeAttribute("src");
    artwork.hidden = true;
    artworkPlaceholder.hidden = false;
  }
}

async function togglePlayback() {
  if (!audio.paused) {
    audio.pause();
    return;
  }

  try {
    await audio.play();
  } catch {
    setStreamStatus("Playback needs a direct user click.");
  }
}

function scheduleReconnect() {
  window.clearTimeout(reconnectTimer);
  reconnectTimer = window.setTimeout(connectTrackFeed, 3000);
}

function handleSocketMessage(event) {
  const frames = parseSockJsPayload(String(event.data));

  for (const rawFrame of frames) {
    if (rawFrame === SOCKJS_EVENTS.OPEN) {
      socket.send(wrapSockJsFrame(buildConnectFrame()));
      continue;
    }

    if (rawFrame === SOCKJS_EVENTS.HEARTBEAT) {
      continue;
    }

    const frame = parseStompFrame(rawFrame);

    if (!frame) {
      continue;
    }

    if (frame.command === "CONNECTED") {
      setFeedStatus("Track feed connected");
      socket.send(
        wrapSockJsFrame(buildSubscribeFrame(TRACK_DESTINATION, "sub-0")),
      );
      continue;
    }

    if (frame.command === "MESSAGE") {
      const track = extractTrack(frame.body);

      if (track) {
        renderTrack(track);
      }

      continue;
    }

    if (frame.command === "ERROR") {
      setFeedStatus("Track feed error");
    }
  }
}

function connectTrackFeed() {
  window.clearTimeout(reconnectTimer);
  setFeedStatus("Connecting track feed...");

  socket = new WebSocket(TRACK_SOCKET_URL);
  socket.addEventListener("message", handleSocketMessage);
  socket.addEventListener("close", () => {
    setFeedStatus("Reconnecting track feed...");
    scheduleReconnect();
  });
  socket.addEventListener("error", () => {
    setFeedStatus("Track feed unavailable");
  });
}

playToggle.addEventListener("click", togglePlayback);
volumeControl.addEventListener("input", (event) => {
  audio.volume = Number(event.target.value) / 100;
});

audio.addEventListener("play", () => {
  updatePlayButton();
  setStreamStatus("Playing live");
});

audio.addEventListener("pause", () => {
  updatePlayButton();
  setStreamStatus("Paused");
});

audio.addEventListener("waiting", () => {
  if (!audio.paused) {
    setStreamStatus("Buffering live stream...");
  }
});

audio.addEventListener("error", () => {
  setStreamStatus("Stream unavailable");
});

updatePlayButton();
connectTrackFeed();
