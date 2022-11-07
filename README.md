ES2015 and zero dependency rewrite of `firmata-io` that works directly in your browser.

# Develop notes
Original `firmata-io` had been written for nodejs. Since the rise of the WebSerial API it is now super easy to connect serial devices directly from the browser.

Changes to original library:
- Rewrite to JavaScript modules.
- A custom polyfill for `Buffer` that works in the browser, based on https://github.com/calvinmetcalf/buffer-es6.

# Roadmap
The polyfill works but adds some unnecessary code. Best would be to rewrite it to use `Uint8Array` directly.

# Usage
Same API as original. Only the bootstrapping is a bit different. There is a special bridge component `WebSerialTransport`.

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
  console.log('Connecting to',port)

  // Wait for the serial port to open.
  await port.open({ baudRate });

  const transport = new WebSerialTransport(port);
  const board = new Firmata(transport);

  // Log transport
  // transport.on('write', d => console.log('OUT', d))
  // transport.on('data', d => console.log('IN', d))

  // Expose
  window.board = board;

  board.on("ready", () => {
    console.log('ready')
    
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
- Web_Serial_API https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API
- Original library https://github.com/firmata/firmata.js/tree/master/packages/firmata-io
- Good example on WebSerial https://web.dev/serial/
- NodeJs Buffer https://nodejs.org/api/buffer.html