Control firmata devices directly from your browser
===

> This is a rewrite of [firmata-io] to ES2015 with zero dependency which works directly in browsers that support [WebSerial].

Live demo https://yellow-digital.github.io/firmata-web/examples/index.html

# Why
Original [firmata-io] has been written for nodejs but doesn't work out of the box in the browser. This library brings support to use [firmata] directly in browsers that support [WebSerial].

Changes to original library:
- Rewrite to JavaScript modules.
- A custom polyfill for `Buffer` that works in the browser, based on https://github.com/calvinmetcalf/buffer-es6.
- a class `WebSerialTransport` to bridge the gap between [firmata-io] and [WebSerial].

# Roadmap
- [ ] Remove the `Buffer` dependency by using `Uint8Array` directly.
- [ ] Remake similar UI as the desktop tool http://firmata.org/wiki/File:ArdFirmVB.png.

# Usage
Same API as original. Only the bootstrapping is a bit different. `WebSerialTransport` should be used to bridge the gap between [firmata-io] and [WebSerial].

```js
import { Firmata, WebSerialTransport } from "../lib/index.js";

const baudRate = 57600; // Default Firmata baudrate

// Get all serial ports the user has previously granted the website access to.
const ports = await navigator.serial.getPorts();
if (ports.length) {
  connect(ports[0]);
}

// Add some nice button <button id="requestPort">Connect</button>
document.querySelector("#requestPort").addEventListener("click", async () => {
  // Prompt user to select any serial port.
  const port = await navigator.serial.requestPort();

  connect(port);
});

async function connect(port) {
  // Wait for the serial port to open.
  await port.open({ baudRate });

  const transport = new WebSerialTransport(port);
  const board = new Firmata(transport);

  board.on("ready", () => {
    // Arduino is ready to communicate
    const pin = 13;
    let state = 1;

    board.pinMode(pin, board.MODES.OUTPUT);

    setInterval(() => {
      board.digitalWrite(pin, (state ^= 1));
    }, 2000);
  });

  board.on("connect", () => console.log("Connected!"));

  board.on("close", () => {
    // Unplug the board to see this event!
    console.log("Closed!");
  });
}
```

# Links
- [WebSerial]
- [firmata-io]
- [Good example on WebSerial]
- [NodeJs Buffer]

[WebSerial]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API
[firmata]: http://firmata.org/wiki/Main_Page
[firmata-js]: https://github.com/firmata/firmata.js/tree/master/packages/firmata.js
[firmata-io]: https://github.com/firmata/firmata.js/tree/master/packages/firmata-io
[NodeJs Buffer]: https://nodejs.org/api/buffer.html
[Good example on WebSerial]: https://web.dev/serial/
