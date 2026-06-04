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
import {
  createVisualizerLevels,
  getPlaybackVisualState,
  getVisualizerBarCount,
} from "./ui-state.js";

const audio = document.querySelector("#stream");
const playToggle = document.querySelector("#play-toggle");
const player = document.querySelector(".player");
const visualizer = document.querySelector(".music-visualizer");
const trackCard = document.querySelector(".track-card");
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
let resizeObserver;
let animationFrameId;
let audioContext;
let analyser;
let frequencyData;
let mediaSource;

function renderVisualizerBars() {
  const barCount = getVisualizerBarCount(trackCard.clientWidth);
  visualizer.replaceChildren();

  for (let index = 0; index < barCount; index += 1) {
    const bar = document.createElement("span");
    bar.className = "music-bar";
    bar.style.setProperty("--bar-index", String(index));
    bar.style.setProperty("--bar-level", "0.14");
    visualizer.append(bar);
  }
}

function applyVisualizerLevels(levels) {
  const bars = visualizer.children;

  for (let index = 0; index < bars.length; index += 1) {
    const level = levels[index] ?? 0.14;
    bars[index].style.setProperty(
      "--bar-level",
      String(level),
    );
    bars[index].style.setProperty(
      "--bar-alpha",
      String(Math.min(1, 0.32 + level * 0.95)),
    );
    bars[index].style.setProperty(
      "--bar-glow",
      `${10 + Math.round(level * 18)}px`,
    );
  }
}

function stopVisualizer() {
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  applyVisualizerLevels(
    Array.from({ length: visualizer.childElementCount }, () => 0.14),
  );
}

function tickVisualizer() {
  if (!analyser || !frequencyData || audio.paused) {
    stopVisualizer();
    return;
  }

  analyser.getByteFrequencyData(frequencyData);
  applyVisualizerLevels(
    createVisualizerLevels(
      Array.from(frequencyData),
      visualizer.childElementCount,
    ),
  );
  animationFrameId = window.requestAnimationFrame(tickVisualizer);
}

async function ensureAudioAnalysis() {
  if (!("AudioContext" in window || "webkitAudioContext" in window)) {
    return false;
  }

  try {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audio.crossOrigin = "anonymous";
      audioContext = new AudioContextClass();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      mediaSource = audioContext.createMediaElementSource(audio);
      mediaSource.connect(analyser);
      analyser.connect(audioContext.destination);
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
  } catch (error) {
    console.warn("Audio visualization unavailable", error);
    analyser = null;
    frequencyData = null;
    return false;
  }

  return true;
}

function updatePlayButton() {
  const state = getPlaybackVisualState(audio.paused);
  playToggle.textContent = state.buttonLabel;
  player.dataset.playing = String(state.isAnimating);
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
    await ensureAudioAnalysis();
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
  window.cancelAnimationFrame(animationFrameId);
  animationFrameId = window.requestAnimationFrame(tickVisualizer);
});

audio.addEventListener("pause", () => {
  updatePlayButton();
  setStreamStatus("Paused");
  stopVisualizer();
});

audio.addEventListener("waiting", () => {
  if (!audio.paused) {
    setStreamStatus("Buffering live stream...");
  }
});

audio.addEventListener("error", () => {
  setStreamStatus("Stream unavailable");
  stopVisualizer();
});

updatePlayButton();
renderVisualizerBars();

if ("ResizeObserver" in window) {
  resizeObserver = new ResizeObserver(() => {
    renderVisualizerBars();
  });
  resizeObserver.observe(trackCard);
} else {
  window.addEventListener("resize", renderVisualizerBars);
}

connectTrackFeed();
