import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConnectFrame,
  buildSubscribeFrame,
  extractTrack,
  parseSockJsPayload,
  parseStompFrame,
  wrapSockJsFrame,
} from "../radio.js";
import {
  createVisualizerLevels,
  getPlaybackVisualState,
  getVisualizerBarCount,
} from "../ui-state.js";

test("parseSockJsPayload extracts STOMP frames from SockJS arrays", () => {
  const payload = 'a["CONNECTED\\nversion:1.2\\nheart-beat:0,0\\n\\n\\u0000"]';

  assert.deepEqual(parseSockJsPayload(payload), [
    "CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\u0000",
  ]);
});

test("parseStompFrame returns command headers and body", () => {
  const frame =
    "MESSAGE\n" +
    "destination:/topic/radios/wcd/tracks\n" +
    "content-type:application/json\n\n" +
    '[{"artist":"Sara Landry","title":"Heaven","valid":true}]' +
    "\u0000";

  assert.deepEqual(parseStompFrame(frame), {
    command: "MESSAGE",
    headers: {
      destination: "/topic/radios/wcd/tracks",
      "content-type": "application/json",
    },
    body: '[{"artist":"Sara Landry","title":"Heaven","valid":true}]',
  });
});

test("extractTrack normalizes the first valid track entry", () => {
  const body = JSON.stringify([
    {
      artist: "Sara Landry, Alt8",
      title: "Heaven",
      picture: {
        small: "small.jpg",
        medium: "medium.jpg",
      },
      valid: true,
    },
  ]);

  assert.deepEqual(extractTrack(body), {
    artist: "Sara Landry, Alt8",
    title: "Heaven",
    artwork: "medium.jpg",
    label: "Sara Landry, Alt8 - Heaven",
  });
});

test("buildConnectFrame and buildSubscribeFrame produce STOMP payloads", () => {
  assert.equal(
    wrapSockJsFrame(buildConnectFrame()),
    '["CONNECT\\naccept-version:1.2,1.1,1.0\\nheart-beat:10000,10000\\n\\n\\u0000"]',
  );

  assert.equal(
    wrapSockJsFrame(buildSubscribeFrame("/topic/radios/wcd/tracks", "sub-0")),
    '["SUBSCRIBE\\nid:sub-0\\ndestination:/topic/radios/wcd/tracks\\n\\n\\u0000"]',
  );
});

test("getPlaybackVisualState enables animation only while audio is playing", () => {
  assert.deepEqual(getPlaybackVisualState(true), {
    buttonLabel: "Play",
    isAnimating: false,
  });

  assert.deepEqual(getPlaybackVisualState(false), {
    buttonLabel: "Pause",
    isAnimating: true,
  });
});

test("getVisualizerBarCount scales bars to fill the available width", () => {
  assert.equal(getVisualizerBarCount(0), 12);
  assert.equal(getVisualizerBarCount(120), 13);
  assert.equal(getVisualizerBarCount(216), 24);
});

test("createVisualizerLevels boosts mirrored bar heights for punchier motion", () => {
  assert.deepEqual(createVisualizerLevels([], 3), [0.14, 0.14, 0.14]);

  assert.deepEqual(
    createVisualizerLevels([255, 0, 0, 0], 4),
    [0.31, 0.83, 0.83, 0.31],
  );

  assert.deepEqual(
    createVisualizerLevels([128, 0, 0, 0], 4),
    [0.25, 0.6, 0.6, 0.25],
  );
});

test("createVisualizerLevels spreads a dominant center peak across neighbors", () => {
  assert.deepEqual(
    createVisualizerLevels([255, 0, 0, 0], 5),
    [0.14, 0.31, 0.66, 0.31, 0.14],
  );
});
