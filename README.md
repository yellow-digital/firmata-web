Control firmata devices directly from your browser
===

> This is a rewrite of [firmata-io] to ES2015 with zero dependency which works directly in browsers that support [WebSerial].

# Why
Original [firmata-io] has been written for nodejs but doesn't work out of the box in the browser. This library brings support to use [firmata] directly in browsers that support [WebSerial].

Changes to original library:
- Rewrite to JavaScript modules.
- A custom polyfill for `Buffer` that works in the browser, based on [buffer-es6](https://github.com/calvinmetcalf/buffer-es6).
- a class `WebSerialTransport` to bridge the gap between [firmata-io] and [WebSerial].

# Roadmap
- [X] Remake similar UI as the desktop tool.
- [ ] Remove the `Buffer` dependency by using `Uint8Array` directly.
- [-] Polyfill for common serial usb devices so it also works on browsers without [WebSerial].

# Usage
The API is for most part the same as [firmata-io]. Only the bootstrapping is a bit different. `WebSerialTransport` should be used to bridge the gap between [firmata-io] and [WebSerial]. 

[Blink demo](https://yellow-digital.github.io/firmata-web/examples/index.html)

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

  board.on("close", () => {
    // Unplug the board to see this event!
    console.log("Closed!");
  });
}
```

# Get Started
Feel play around with a simple UI for this library.

[<img width="445" alt="image" src="https://user-images.githubusercontent.com/1216650/201372823-0661d34c-6068-4168-bbe3-acf659ca581b.png">
](https://yellow-digital.github.io/firmata-web/examples/ui/index.html)


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
