import { Firmata, WebSerialTransport, TYPES } from "firmata-web/lib/index.js";
// import { createApp } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
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
d-flex { display: flex; }

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
customElements.define("d-flex", class extends HTMLElement {});
customElements.define("d-loader", class extends HTMLElement {});
customElements.define("d-toolbar", class extends HTMLElement {});

const VSelect = {
  props: {
    items: {},
    value: {},
  },
  methods: {
    onChange(event) {
      this.$emit("change", event.target.value);
      this.$emit("update:modelValue", event.target.value);
    },
  },
  emits: {},
  template: html` <div>
    <select @change="onChange" :value="value">
      <option
        v-for="(item, index) in items"
        :value="item.value"
        :selected="value === 'item.value'"
        :key="item.value || index"
      >
        {{ item.text || item }}
      </option>
    </select>
  </div>`,
};

customElements.define("v-select", defineCustomElement(VSelect));

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

    // expose
    console.log("Feel free to interact with `board`");
    window.board = board;

    this.toItems = (supportedModes = []) => {
      return supportedModes.map((key) => ({ value: key, text: MODES[key] }));
    };

    this.disconnect = async () => {
      if (!this.transport) console.warn("no transport");
      if (!this.port) console.warn("no port");

      // TODO
      console.warn("currently not working");
      board.serialClose();
      // await this.transport.reader.releaseLock();
      // await this.port.close()
    };

    this.onSetServo = (pin) => (event) => {
      board.servoWrite(pin, Number(event.target.value));
    };
    this.onPWMChange = (pin) => (event) => {
      board.pwmWrite(pin, Number(event.target.value));
    };
    this.onDigitalValueChange = (pin) => (event) => {
      board.digitalWrite(pin, event.target.checked);
    };
    this.onModeChange = (pin, event) => {
      const mode = Number(event.detail[0]);
      // console.log(pin, event, mode);
      board.pinMode(pin, mode);

      // Turn on / off analog reading
      board.reportAnalogPin(board.pinToAnalogPin(pin), mode === TYPES.MODES.ANALOG);
    };

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

    <d-flex v-for="(pin, index) in board.pins">
      <label>Pin #{{index}}</label>
      <v-select
        :value="pin.mode"
        @update:modelValue="e => pin.mode = Number(e.detail[0])"
        @change="onModeChange(index, $event)"
        :items="toItems(pin.supportedModes)"
      />
      <div v-if="Number(pin.mode) === TYPES.MODES.PWM">
        <input
          v-model="pin.value"
          @input="onPWMChange(index)($event)"
          type="range"
          min="1"
          :max="board.RESOLUTION.PWM"
        />
        <div>{{pin.value}}</div>
      </div>
      <div v-if="Number(pin.mode) === TYPES.MODES.SERVO">
        <input
          v-model="pin.value"
          @input="onSetServo(index)($event)"
          type="range"
          min="0"
          max="360"
        />
        <div>{{pin.value}}</div>
      </div>
      <div v-if="Number(pin.mode) === TYPES.MODES.OUTPUT">
        <input
          type="checkbox"
          v-model="pin.value"
          @input="onDigitalValueChange(index)($event)"
        />
      </div>
      <div v-if="Number(pin.mode) === TYPES.MODES.INPUT">
        <div>{{pin.value}}</div>
      </div>
      <div v-if="Number(pin.mode) === TYPES.MODES.ANALOG">
        <div>{{pin.value}}</div>
      </div>
    </d-flex>
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

customElements.define("f-interface", defineCustomElement(MyVueElement));
