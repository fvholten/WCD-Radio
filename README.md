# BCB Radio UI

Small static radio player for the BCB live stream. It plays the MP3 stream, connects to the live track feed over SockJS/STOMP, and shows the currently playing song with artwork when available.

## Features

- Play and pause the live stream
- Adjust volume
- Show current artist and title
- Show current artwork when the feed provides it
- Reconnect the track feed automatically if the websocket drops

## Local Development

This project is just static HTML, CSS, and JavaScript. Serve it over local HTTP and open it in a browser.

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4173/
```

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

## Project Layout

```text
.
├── app.js
├── index.html
├── radio.js
├── styles.css
├── tests/
│   └── radio.test.js
└── websocket.http
```
