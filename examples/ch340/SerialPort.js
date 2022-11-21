/**
 * Polyfill for WebSerial
 * Currently only supports: CH340. 
 * Similar API as https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API
 * 
 * Based on code from https://stackoverflow.com/questions/64929987/webusb-api-working-but-the-data-received-arent-decoded-properly
 */

//set it to the active device..
export let device = {};
let chips = {};
let port;

export const config = {
  DEBUG: false,
  DEFAULT_BAUD_RATE: 57600,
  BAUD_RATES: [
    600, 1200, 2400, 4800, 9600, 14400, 19200, 38400, 57600, 115200, 230400,
  ], // highest is 300 0000 limited by the BAUD_RATE_MAX_BPS
  //CH34x --> https://github.com/torvalds/linux/blob/master/drivers/usb/serial/ch341.c <-- we have used the linux driver and made into a webUSB driver
  // plus -->  https://github.com/felHR85/UsbSerial/tree/master/usbserial/src/main/java/com/felhr/usbserial  <--
  CH340: {
    REQUEST_READ_VERSION: 0x5f,
    REQUEST_READ_REGISTRY: 0x95,
    REQUEST_WRITE_REGISTRY: 0x9a,
    REQUEST_SERIAL_INITIATION: 0xa1,
    REG_SERIAL: 0xc29c,
    REG_MODEM_CTRL: 0xa4,
    REG_MODEM_VALUE_OFF: 0xff,
    REG_MODEM_VALUE_ON: 0xdf,
    REG_MODEM_VALUE_CALL: 0x9f,
    REG_BAUD_FACTOR: 0x1312,
    REG_BAUD_OFFSET: 0x0f2c,
    REG_BAUD_LOW: 0x2518,
    REG_CONTROL_STATUS: 0x2727,
    BAUD_RATE: {
      600: { FACTOR: 0x6481, OFFSET: 0x76 },
      1200: { FACTOR: 0xb281, OFFSET: 0x3b },
      2400: { FACTOR: 0xd981, OFFSET: 0x1e },
      4800: { FACTOR: 0x6482, OFFSET: 0x0f },
      9600: { FACTOR: 0xb282, OFFSET: 0x08 },
      14400: { FACTOR: 0xd980, OFFSET: 0xeb },
      19200: { FACTOR: 0xd982, OFFSET: 0x07 },
      38400: { FACTOR: 0x6483, OFFSET: null },
      57600: { FACTOR: 0x9883, OFFSET: null },
      115200: { FACTOR: 0xcc83, OFFSET: null },
      230500: { FACTOR: 0xe683, OFFSET: null },
    },
  },
};

//The different hardware we support + their specific data/configs
export const table = {
  0x0403: {
    FTDI: {
      0x6001: "FT232R",
      0x6010: "FT2232H",
      0x6011: "FT4232H",
      0x6014: "FT232H",
      0x6015: "FT231X", // same ID for FT230X, FT231X, FT234XD
    },
  },
  0x1a86: {
    Quinheng: {
      0x7523: "CH340",
      0x5523: "CH341A",
    },
  },
  0x10c4: {
    "Silicon Labs": {
      0xea60: "CP210x", // same ID for CP2101, CP2103, CP2104, CP2109
      0xea70: "CP2105",
      0xea71: "CP2108",
    },
  },
  0x067b: {
    Prolific: {
      0x2303: "PL2303",
    },
  },
};

export class SerialPort {
  constructor(device) {
    this.device_ = device;
  }

  // Hooks
  onReceive(data) {}
  onReceiveError(err) {}

  getPorts() {
    return navigator.usb.getDevices().then((devices) => {
      return devices.map((device) => new SerialPort(device));
    });
  }

  async requestPort() {
    let supportedHardware = [];
    //device contains the "device descriptor" (see USB standard), add as a new device to be able to control
    const device = await navigator.usb.requestDevice({
      filters: supportedHardware,
    });
    const port = new SerialPort(device);
    return port
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/SerialPort/open
   * @param {*} config 
   */
  open(config = {
    baudRate: 57600
  }) {
    // TODO handle baudRate
    this.connect()
  }

  //here's the config + read loop is taking place....
  connect() {
    //this is the read loop on whatever port is currently used... it will repeat itself
    let readLoop = () => {
      this.device_.transferIn(this.endpointIn_, 64).then(
        (result) => {
          this.onReceive(result.data);
          readLoop();
        },
        (error) => {
          this.onReceiveError(error);
        }
      );
    };

    const { device_ } = this;

    return (
      device_
        .open()
        .then(() => {
          //first we get some GUI stuff populated, we use "device" for that... serial and port are used for the configuration elsewhere
          device.hostName = device_.productName;
          device.vendorName = Object.keys(table[device_.vendorId])[0];
          device.chip =
            table[device_.vendorId][device.vendorName][device_.productId];
          device.serialNumber = device_.serialNumber;
          device.manufacturerName = device_.manufacturerName;
          //1: we set an configuration (configuration descriptor in the USB standard)
          if (this.device_.configuration === null) {
            return this.device_.selectConfiguration(1);
          }
        })
        .then(() => {
          //2: we set what endpoints for data we will use, we use only "bulk" transfer and thus we parse their addresses
          let configInterfaces = this.device_.configuration.interfaces;
          configInterfaces.forEach((element) => {
            element.alternates.forEach((elementalt) => {
              if (elementalt.interfaceClass === 0xff) {
                this.interfaceNumber_ = element.interfaceNumber;
                elementalt.endpoints.forEach((elementendpoint) => {
                  //This part here get the bulk in and out endpoints programmatically
                  if (
                    elementendpoint.direction === "out" &&
                    elementendpoint.type === "bulk"
                  ) {
                    this.endpointOut_ = elementendpoint.endpointNumber;
                    this.endpointOutPacketSize_ = elementendpoint.packetSize;
                  }
                  if (
                    elementendpoint.direction === "in" &&
                    elementendpoint.type === "bulk"
                  ) {
                    this.endpointIn_ = elementendpoint.endpointNumber;
                    this.endpointInPacketSize_ = elementendpoint.packetSize;
                  }
                });
              }
            });
          });
        })
        //3: we claim this interface and select the alternative interface
        .then(() => this.device_.claimInterface(this.interfaceNumber_))
        .then(() =>
          this.device_.selectAlternateInterface(this.interfaceNumber_, 0)
        )
        //4: we configure in and out transmissions, based on detected hardware
        .then(() => chips[device.chip](this))
        //5: we start the loop
        .then(() => {
          //console.log(this);
          readLoop();
        })
    );
  }

  //upon disconnect, what to do
  async disconnect() {
    await chips[device.chip](this).DISCONNECT;
  }

  //send data, what to do
  send(data) {
    return this.device_.transferOut(this.endpointOut_, data);
  }
}

// these are the hardware specific initialization procedures...
chips["CH340"] = async function (obj, baudRate = config.DEFAULT_BAUD_RATE) {
  let data = hexToDataView(0); // null data
  await controlledTransfer(
    obj,
    "out",
    "vendor",
    "device",
    config.CH340.REQUEST_SERIAL_INITIATION,
    config.CH340.REG_SERIAL,
    data,
    0xb2b9
  ); // first request...
  await controlledTransfer(
    obj,
    "out",
    "vendor",
    "device",
    config.CH340.REG_MODEM_CTRL,
    config.CH340.REG_MODEM_VALUE_ON
  );
  await controlledTransfer(
    obj,
    "out",
    "vendor",
    "device",
    config.CH340.REG_MODEM_CTRL,
    config.CH340.REG_MODEM_VALUE_CALL
  );
  let r = await controlledTransfer(
    obj,
    "in",
    "vendor",
    "device",
    config.CH340.REQUEST_READ_REGISTRY,
    0x0706,
    2
  );
  if (!r) {
    // we have an error
    return;
  }
  await controlledTransfer(
    obj,
    "out",
    "vendor",
    "device",
    config.CH340.REQUEST_WRITE_REGISTRY,
    config.CH340.REG_CONTROL_STATUS,
    data
  );
  await controlledTransfer(
    obj,
    "out",
    "vendor",
    "device",
    config.CH340.REQUEST_WRITE_REGISTRY,
    config.CH340.REG_BAUD_FACTOR,
    data,
    0xb282
  );
  await controlledTransfer(
    obj,
    "out",
    "vendor",
    "device",
    config.CH340.REQUEST_WRITE_REGISTRY,
    config.CH340.REG_BAUD_OFFSET,
    data,
    0x0008
  );
  await controlledTransfer(
    obj,
    "out",
    "vendor",
    "device",
    config.CH340.REQUEST_WRITE_REGISTRY,
    config.CH340.REG_BAUD_LOW,
    data,
    0x00c3
  );
  r = await controlledTransfer(
    obj,
    "in",
    "vendor",
    "device",
    config.CH340.REQUEST_READ_REGISTRY,
    0x0706,
    2
  );
  if (!r) {
    // we have an error
    return;
  }
  await controlledTransfer(
    obj,
    "out",
    "vendor",
    "device",
    config.CH340.REQUEST_WRITE_REGISTRY,
    config.CH340.REG_CONTROL_STATUS,
    data
  );
  await chips["CH340"].setBaudRate(obj, baudRate);

  // now what? all the control transfers came back "ok"?
};

chips["CH340"].setBaudRate = async function (obj, baudRate) {
  let data = hexToDataView(0);
  await controlledTransfer(
    obj,
    "out",
    "vendor",
    "device",
    config.CH340.REQUEST_WRITE_REGISTRY,
    config.CH340.REG_BAUD_FACTOR,
    data,
    config.CH340.BAUD_RATE[baudRate].FACTOR
  );
  await controlledTransfer(
    obj,
    "out",
    "vendor",
    "device",
    config.CH340.REQUEST_WRITE_REGISTRY,
    config.CH340.REG_BAUD_OFFSET,
    data,
    config.CH340.BAUD_RATE[baudRate].OFFSET
  );
  await controlledTransfer(
    obj,
    "out",
    "vendor",
    "device",
    config.CH340.REQUEST_WRITE_REGISTRY,
    config.CH340.REG_CONTROL_STATUS,
    data
  );
};

chips["CH340"].DISCONNECT = async function (obj) {
  await controlledTransfer(
    obj,
    "in",
    "vendor",
    "device",
    config.CH340.REG_MODEM_CTRL,
    config.CH340.REG_MODEM_VALUE_OFF
  );
};

chips["CP210x"] = async function (obj, baudRate = config.DEFAULT_BAUD_RATE) {};

chips["CP2105"] = async function (obj, baudRate = config.DEFAULT_BAUD_RATE) {};

chips["CP2108"] = async function (obj, baudRate = config.DEFAULT_BAUD_RATE) {};

chips["PL2303"] = async function (obj, baudRate = config.DEFAULT_BAUD_RATE) {};

chips["FT2232H"] = async function (
  obj,
  baudRate = config.DEFAULT_BAUD_RATE
) {};

chips["FT4232H"] = async function (
  obj,
  baudRate = config.DEFAULT_BAUD_RATE
) {};

chips["FT232H"] = async function (obj, baudRate = config.DEFAULT_BAUD_RATE) {};

chips["FT231X"] = async function (obj, baudRate = config.DEFAULT_BAUD_RATE) {};

async function controlledTransfer(
  object,
  direction,
  type,
  recipient,
  request,
  value = 0,
  data = new DataView(new ArrayBuffer(0)),
  index = object.interfaceNumber_
) {
  direction = direction.charAt(0).toUpperCase() + direction.slice(1);
  type = type.toLowerCase();
  recipient = recipient.toLowerCase();
  if (data.byteLength === 0 && direction === "In") {
    // we set how many bits we want back for an "in"
    // so set data = 0....N in the call otherwise it will default to 0
    data = 0;
  }
  const obj = {
    requestType: type,
    recipient: recipient,
    request: request,
    value: value,
    index: index,
  };

  return await object.device_["controlTransfer" + direction](obj, data).then(
    (res) => {
      if (config.DEBUG) {
        //debugger;  // remove comment for extra debugging tools
        console.log(res);
      }
      if (res.status !== "ok") {
        console.warn("error!", obj, data); // add more here
      }
      if (res.data !== undefined && res.data.buffer !== undefined) {
        return res.data.buffer;
      }
      return null;
    }
  );
}

// you can really use any numerical value since JS treat them the same:
// dec = 15         // dec will be set to 15
// bin = 0b1111;    // bin will be set to 15
// oct = 0o17;      // oct will be set to 15
// oxx = 017;       // oxx will be set to 15
// hex = 0xF;       // hex will be set to 15
// note: bB oO xX are all valid
function hexToDataView(number) {
  if (number === 0) {
    let array = new Uint8Array([0]);
    return new DataView(array.buffer);
  }
  let hexString = number.toString(16);
  // split the string into pairs of octets
  let pairs = hexString.match(/[\dA-F]{2}/gi);
  // convert the octets to integers
  let integers = pairs.map(function (s) {
    return parseInt(s, 16);
  });
  let array = new Uint8Array(integers);
  return new DataView(array.buffer);
}
