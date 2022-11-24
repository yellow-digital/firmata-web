/**
 * Usage:
 * as WebComponent
 * <f-board></f-board>
 * 
 * as Javascript
 * ...
 */

import { Firmata, TYPES } from "../lib/index.js";
import {
  defineCustomElement,
  reactive,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

function swap(o, r = {}) {
  return Object.keys(o).map((k) => (r[o[k]] = k)) && r;
}
const MODES = swap(TYPES.MODES);

const html = (e) => e.raw[0];

const style = `
d-flex { display: flex; }

label {  min-width: 80px; }
`;
customElements.define("d-flex", class extends HTMLElement {});

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
    board: new Firmata(),
    port: null,
    transport: null,
  }),

  async created() {
    // const board = new Firmata();
    // this.board = board;

    this.toItems = (supportedModes = []) => {
      return supportedModes.map((key) => ({ value: key, text: MODES[key] }));
    };

    this.onSetServo = (pin) => (event) => {
      this.board.servoWrite(pin, Number(event.target.value));
    };
    this.onPWMChange = (pin) => (event) => {
      this.board.pwmWrite(pin, Number(event.target.value));
    };
    this.onDigitalValueChange = (pin) => (event) => {
      this.board.digitalWrite(pin, event.target.checked);
    };
    this.onModeChange = (pin, event) => {
      const mode = Number(event.detail[0]);
      this.board.pinMode(pin, mode);

      // Turn on / off analog reading
      this.board.reportAnalogPin(this.board.pinToAnalogPin(pin), mode === TYPES.MODES.ANALOG);
    };
  },

  async mounted() {
    window.app = this;
    setTimeout(() => {
      this.$emit('ready', this)
    })
  },

  template: html` <div>
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

customElements.define("f-board", defineCustomElement(MyVueElement));
