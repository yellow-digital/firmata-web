Polyfill for WebSerial

Supported chips: 
- CH340

Similar API as https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API

# Usage
```js
import { NavigatorSerial } from "navigator-serial/index.js"

// use the serial polyfill ( similar API to WebSerial )
const serial = new NavigatorSerial()

{
  // Autoconnect
  // Get all serial ports the user has previously granted the website access to.
  const ports = await serial.getPorts();
  if (ports.length) {
    connect(ports[0]);
  }
}
{
  document
    .querySelector("#requestPort")
    .addEventListener("click", async () => {
      // Prompt user to select any serial port.
      const port = await serial.requestPort();
      connect(port);
    });
}
```

# Thanks
- CH340 Based on code from https://stackoverflow.com/questions/64929987/webusb-api-working-but-the-data-received-arent-decoded-properly
