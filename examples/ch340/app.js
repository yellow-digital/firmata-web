import {SerialPort} from "./SerialPort.js"

window.addEventListener("load", initiate, false);



const serial = {};
let device = {};
let port;

serial.getPorts = function () {
  return navigator.usb.getDevices().then((devices) => {
    return devices.map((device) => new SerialPort(device));
  });
};

serial.requestPort = async function () {
  let supportedHardware = [];
  //This one create the filter of hardware based on the hardware table
  // Object.keys(table).map(vendorId => {
  //     Object.keys(table[vendorId]).map(vendorName => {
  //         Object.keys(table[vendorId][vendorName]).map(productId => {
  //             supportedHardware.push({
  //                 "vendorId": vendorId,
  //                 "productId": productId
  //             })
  //         })
  // })});
  //device contains the "device descriptor" (see USB standard), add as a new device to be able to control
  const device = await navigator.usb.requestDevice({
    filters: supportedHardware,
  });
  new SerialPort(device);
};

//GUI function "connect"
function connect() {
  port.connect().then(() => {
    document.getElementById("editor").value =
      "connected to: " +
      device.hostName +
      "\nvendor name: " +
      device.vendorName +
      "\nchip type: " +
      device.chip;

    boardEl;

    port.onReceive = (data) => {
      console.log(data);
      document.getElementById("output").value += new TextDecoder().decode(data);
    };
    port.onReceiveError = (error) => {
      //console.error(error);
      port.disconnect();
    };
  });
}

//GUI function "disconnect"
function disconnect() {
  port.disconnect();
}

//GUI function "send"
function send(string) {
  console.log("sending to serial:" + string.length);
  if (string.length === 0) return;
  console.log("sending to serial: [" + string + "]\n");

  let data = new TextEncoder("utf-8").encode(string);
  console.log(data);
  if (port) {
    port.send(data);
  }
}

const boardEl = document.querySelector("f-board");

//the init function which we have an event listener connected to
function initiate() {
  serial.getPorts().then((ports) => {
    //these are devices already paired, let's try the first one...
    if (ports.length > 0) {
      port = ports[0];
      connect();
    }
  });

  document.querySelector("#connect").onclick = async function () {
    await serial.requestPort().then((selectedPort) => {
      if (port === undefined || port.device_ !== selectedPort.device_) {
        port = selectedPort;
        connect();
      } else {
        // port already selected...
      }
    });
  };

  document.querySelector("#disconnect").onclick = function () {
    disconnect();
  };

  document.querySelector("#submit").onclick = () => {
    let source = document.querySelector("#editor").value;
    send(source);
  };
}
