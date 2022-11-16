import { TYPES } from "firmata-web/lib/index.js";
import { board } from "./f-interface.js";
import { GUI } from "https://cdn.jsdelivr.net/npm/lil-gui@0.17/+esm";
const gui = new GUI();

const folder = gui.addFolder('Pin settings')

// Interact with component
// const target = document.querySelector("f-interface")
// target.addEventListener('ready', (ctx) => {
//   console.log('ready', ctx.detail[0])
// })

// Expose some options
folder
  .add(board.settings, "samplingInterval")
  .min(10)
  .max(65535)
  .onChange((v) => {
    board.setSamplingInterval(v);
  });

const KEY = "pins";
const methods = {
  save() {
    localStorage.setItem(KEY, JSON.stringify(board.pins));
  },
  restore() {
    const data = localStorage.getItem(KEY);
    const pins = JSON.parse(data);
    pins.forEach((pin, index) => {
      if (pin.mode) {
        board.pinMode(index, pin.mode);
      }
      if (pin.mode === TYPES.MODES.OUTPUT) {
        board.digitalWrite(index, pin.value);
      }
      // TODO other modes
    });
  },
};
folder.add(methods, "save");
folder.add(methods, "restore");
