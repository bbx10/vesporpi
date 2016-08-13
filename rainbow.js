/* jslint node: true */
'use strict';

var raspi = require('raspi-io');
var five = require('johnny-five');
var board = new five.Board({
  io: new raspi()
});

var ws281x = require('rpi-ws281x-native');

var NUM_LEDS = parseInt(process.argv[2], 8) || 8,
    pixelData = new Uint32Array(NUM_LEDS);

board.on('ready', function() {
  var configs = five.Motor.SHIELD_CONFIGS.ADAFRUIT_V2;

  var motor1 = new five.Motor(configs.M1);
  var motor2 = new five.Motor(configs.M2);

  ws281x.init(NUM_LEDS);

  this.on("exit", function() {
    console.log('ws281x.reset');
    ws281x.reset();
  });
});

// ---- animation-loop
var offset = 0;
setInterval(function () {
  for (var i = 0; i < NUM_LEDS; i++) {
    pixelData[i] = colorwheel((offset + i) % 256);
  }

  offset = (offset + 1) % 256;
  ws281x.render(pixelData);
}, 1000 / 30);

console.log('Press <ctrl>+C to exit.');


// rainbow-colors, taken from http://goo.gl/Cs3H0v
function colorwheel(pos) {
  pos = 255 - pos;
  if (pos < 85) { return rgb2Int(255 - pos * 3, 0, pos * 3); }
  else if (pos < 170) { pos -= 85; return rgb2Int(0, pos * 3, 255 - pos * 3); }
  else { pos -= 170; return rgb2Int(pos * 3, 255 - pos * 3, 0); }
}

function rgb2Int(r, g, b) {
  return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
}
