import { TYPES } from "firmata-web/lib/index.js";
import { board } from "./f-interface.js";
import { GUI } from "https://cdn.jsdelivr.net/npm/lil-gui@0.17/+esm";

const gui = new GUI();

// Expose some options
const folder = gui.addFolder("Pin settings");

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
    alert("saved");
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
      if ([TYPES.MODES.SERVO, TYPES.MODES.ANALOG].includes(pin.mode)) {
        // SERVO and ANALOG use the same
        board.analogWrite(index, pin.value);
      }
      // TODO other modes
    });
  },
};
folder.add(methods, "save");
folder.add(methods, "restore");

{
  // Expose some methods from firmata-web
  const folder = gui.addFolder("Board");
  folder.add(board, "reset");
}
