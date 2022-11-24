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

const ch340 = async (obj, baudRate = config.DEFAULT_BAUD_RATE) => {
  connect()
  
  // Connect
  async function connect() {
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
    await setBaudRate(baudRate);
  }

  async function setBaudRate(baudRate) {
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
  }

  async function DISCONNECT() {
    await controlledTransfer(
      obj,
      "in",
      "vendor",
      "device",
      config.CH340.REG_MODEM_CTRL,
      config.CH340.REG_MODEM_VALUE_OFF
    );
  }

  // Methods
  return {
    setBaudRate,
    DISCONNECT,
  };
};

export default ch340;

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
