# WCD Radio UI

Small static radio player for the WCD live stream. It plays the MP3 stream, connects to the live track feed over SockJS/STOMP, and shows the currently playing song with artwork when available.

## Features

- Play and pause the live stream
- Adjust volume
- Show current artist and title
- Show current artwork when the feed provides it
- Reconnect the track feed automatically if the websocket drops

## Requirements

- Node.js `24.x`
- npm

## Local Development

Install dependencies and start the local server with npm.

```bash
npm install
npm run dev
```

Then open:

```text
http://127.0.0.1:4173/
```

## Build

Create the static deployment output in `dist/` with:

```bash
npm run build
```

## Deployment

### Vercel

This repo includes [`vercel.json`](./vercel.json) with:

- `buildCommand`: `npm run build`
- `outputDirectory`: `dist`

You can deploy it from the Vercel dashboard by importing the repo, or with the CLI:

```bash
vercel
vercel --prod
```

### Railway

Railway can use the npm scripts directly:

- Install command: `npm install`
- Build command: `npm run build`
- Start command: `npm start`

`npm start` runs the included Node static server, which serves `dist/` in production and respects Railway's `PORT` environment variable.

## Testing

Run the parser and frame-format tests with:

```bash
npm test
```

## Data Sources

- Audio stream: `https://bcb.stream41.radiohost.de/bcb-radio_mp3-192`
- Track websocket: `wss://audioapi.net/api/v1/sockjs/291/rclfiblm/websocket`
- Subscription destination: `/topic/radios/wcd/tracks`

The websocket handshake details are captured in [`websocket.http`](./websocket.http).

## Notes

- Browsers usually block autoplay for audio streams. Playback starts after a direct user click on the `Play` button.
- The track feed uses SockJS framing around STOMP messages. The parsing and subscription helpers live in [`radio.js`](./radio.js).
- The UI logic lives in [`app.js`](./app.js), and the markup/styles live in [`index.html`](./index.html) and [`styles.css`](./styles.css).
- [`scripts/build.mjs`](./scripts/build.mjs) copies the client files into `dist/` for deployment.
- [`server.js`](./server.js) is the lightweight production server used by `npm start`.

## Project Layout

```text
.
├── app.js
├── index.html
├── server.js
├── radio.js
├── scripts/
│   └── build.mjs
├── styles.css
├── tests/
│   └── radio.test.js
├── vercel.json
└── websocket.http
```
