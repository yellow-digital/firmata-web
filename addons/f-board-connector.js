import { Firmata, WebSerialTransport, TYPES } from "firmata-web/lib/index.js";
import {
  defineCustomElement,
  reactive,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

const baudRate = 57600; // Default Firmata baudrate

// Default board
export const board = reactive(new Firmata());

function swap(o, r = {}) {
  return Object.keys(o).map((k) => (r[o[k]] = k)) && r;
}
const MODES = swap(TYPES.MODES);

const html = (e) => e.raw[0];

const style = `
d-loader {
  display: block;
  border: 16px solid #f3f3f3; /* Light grey */
  border-top: 16px solid #3498db; /* Blue */
  border-radius: 50%;
  width: 120px;
  height: 120px;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

label {  min-width: 80px; }
`;
customElements.define("d-loader", class extends HTMLElement {});
customElements.define("d-toolbar", class extends HTMLElement {});

const MyVueElement = {
  props: {
    connect: { type: Boolean },
  },
  emits: {
    ready: null,
    close: null,
  },
  data: (vm) => ({
    connecting: null,
    connected: null,
    MODES,
    TYPES,
    board: {
      pins: [],
      // ...mock,
    },
    port: null,
    transport: null,
  }),

  async created() {
    // const board = new Firmata();
    this.board = board;

    const ready = () => {
      this.connecting = false;
      this.connected = true;
      this.$emit("ready", this);
    };

    board.on("ready", ready);
    board.on("close", () => {
      this.connected = false;
      this.$emit("close", this);
    });

    this.pair = async (port) => {
      this.port = port;
      this.connecting = true;
      // Wait for the serial port to open.
      try {
        await port.open({ baudRate });
      } catch (err) {
        console.warn(err);
        alert(err);
        this.connecting = false;
        throw new Error(err);
      }

      const transport = new WebSerialTransport(port);
      board.transport = transport;

      await board.connect();
      this.board = board;
      this.transport = board.transport;
    };

    this.onConnectClick = async () => {
      // Prompt user to select any serial port.
      const port = await navigator.serial.requestPort();

      this.pair(port);
    };

    // Get all serial ports the user has previously granted the website access to.
    if (this.connect) {
      const ports = await navigator.serial.getPorts();
      if (ports.length) {
        this.pair(ports[0]);
      }
    }
  },

  async mounted() {
    window.app = this;
  },

  template: html` <div>
    <d-toolbar>
      <button @click="onConnectClick" v-if="!connected">Connect</button>
      <button @click="disconnect" v-if="connected">Disconnect</button>
    </d-toolbar>

    <div v-if="connecting">
      <d-loader></d-loader>
      connecting
    </div>

    <footer>
      <div v-if="board.firmware">
        {{board.firmware.name}}
        <span v-if="board.firmware.version"
          >{{board.firmware.version.major}}.{{board.firmware.version.minor}}</span
        >
      </div>
    </footer>
  </div>`,

  styles: [style],
};

customElements.define("f-board-connector", defineCustomElement(MyVueElement));
