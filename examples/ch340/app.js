import { Firmata, Emitter } from "../../lib/index.js";
import { SerialPort } from "./SerialPort.js";

const serial = new SerialPort()

export class CustomTransport extends Emitter {
  constructor(port) {
    super();
    this.port = port;

    port.onReceive = (data) => {
    //   console.log('RX', new TextDecoder().decode(data.buffer));
      this.emit("data", new Uint8Array(data.buffer));
    };
    port.onReceiveError = (error) => {
      console.error(error);
      port.disconnect();
    };
  }

  async write(data) {
    this.port.send(data);
  }
}

const baudRate = 57600; // Default Firmata baudrate

// ====
// custom serial polyfill
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

async function connect(port) {
  window.port = port;

  const statusEl = document.querySelector("#status");

  console.log("Connecting to", port);
  statusEl.innerHTML = `Connecting...`;

  // Wait for the serial port to open.
  await port.open({ baudRate });

  const transport = new CustomTransport(port);
  const board = new Firmata(transport);

  // Expose
  window.board = board;

  board.on("ready", () => {
    statusEl.innerHTML = `board ready`;
    console.log("ready");

    // Arduino is ready to communicate
    const pin = 13;
    let state = 1;

    board.pinMode(pin, board.MODES.OUTPUT);

    setInterval(() => {
      const value = (state ^= 1);
      statusEl.innerHTML = `Led is : ${value}`;
      board.digitalWrite(pin, value);
    }, 2000);
  });

  board.on("connect", () => console.log("Connected!"));

  board.on("close", () => {
    // Unplug the board to see this event!
    console.log("Closed!");
  });
}