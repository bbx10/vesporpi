/******************************************************************************
MIT License

Copyright (c) 2016 bbx10node@gmail.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
******************************************************************************/

/* jslint node: true */
'use strict';

// WS281x LED also known as NeoPixel
var ws281x = require('rpi-ws281x-native');

var NUM_LEDS = 8,
    pixelData = new Uint32Array(NUM_LEDS);

// Johnny Five Motor control
var raspi = require('raspi-io');
var five = require('johnny-five');
var board = new five.Board({
  io: new raspi(),
  repl: false
});

var SPEED_FORWARD = 128;
var SPEED_TURN    = 128;
var SPEED_REVERSE = 128;

var motorLeft,
    motorRight;

board.on('ready', function() {
  var configs = five.Motor.SHIELD_CONFIGS.ADAFRUIT_V2;

  motorRight = new five.Motor(configs.M1);
  motorLeft = new five.Motor(configs.M2);
//motor3 = new five.Motor(configs.M3);
//motor4 = new five.Motor(configs.M4);

  motorLeft.stop();
  motorRight.stop();

  ws281x.init(NUM_LEDS);

  this.on("exit", function() {
    console.log('motor exit');
    motorLeft.stop();
    motorRight.stop();
//  motor3.stop();
//  motor4.stop();
    console.log('ws281x.reset');
    ws281x.reset();
  });
});

// Web UI
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var LEDStatus = 0;

server.listen(80, function () {
  console.log('Example app listening on port 80!');
});

app.use(express.static('html'));

app.get('/', function (req, res) {
  res.sendFile('/index.html');
});

io.on('connection', function (socket) {
  console.log('user connect');
  switch (LEDStatus) {
    case 0:
      socket.emit('LEDstatus', { LEDstatus: 'bLedoff' });
      break;
    case 128:
      socket.emit('LEDstatus', { LEDstatus: 'bLed50' });
      break;
    case 255:
      socket.emit('LEDstatus', { LEDstatus: 'bLedon' });
      break;
  }
  socket.emit('news', { hello: 'world' });
  socket.on('disconnect', function() {
    console.log('user disconnect');
  });
  socket.on('buttondown', function (data) {
    console.log('buttondown', data);
    if (data === 'bLedon') {
      writeLED(255);
      io.emit('LEDstatus', { LEDstatus: data });
    }
    else if (data === 'bLedoff') {
      writeLED(0);
      io.emit('LEDstatus', { LEDstatus: data });
    }
    else if (data === 'bLed50') {
      writeLED(128);
      io.emit('LEDstatus', { LEDstatus: data });
    }
    else if (data === 'bForward') {
      motorLeft.forward(SPEED_FORWARD);
      motorRight.forward(SPEED_FORWARD);
    }
    else if (data === 'bBackward') {
      motorLeft.reverse(SPEED_REVERSE);
      motorRight.reverse(SPEED_REVERSE);
    }
    else if (data === 'bLeft') {
      motorLeft.forward(SPEED_TURN);
      motorRight.reverse(SPEED_TURN);
    }
    else if (data === 'bRight') {
      motorLeft.reverse(SPEED_TURN);
      motorRight.forward(SPEED_TURN);
    }
  });
  socket.on('buttonup', function (data) {
    console.log('buttonup', data);
    if (data === 'bLedon') {
    }
    else if (data === 'bLedoff') {
    }
    else if (data === 'bLed50') {
    }
    else if (data === 'bForward') {
      motorLeft.stop();
      motorRight.stop();
    }
    else if (data === 'bBackward') {
      motorLeft.stop();
      motorRight.stop();
    }
    else if (data === 'bLeft') {
      motorLeft.stop();
      motorRight.stop();
    }
    else if (data === 'bRight') {
      motorLeft.stop();
      motorRight.stop();
    }
  });
});

function writeLED(LEDbrightness) {
  var i;
  LEDStatus = LEDbrightness;
  if (LEDbrightness === 128) {
    // Turn on every other LED
    for (i = 0; i < NUM_LEDS; i+=2) {
      pixelData[i]   = rgb2Int(255, 255, 255);
      pixelData[i+1] = rgb2Int(0, 0, 0);
    }
  }
  else {
    for (i = 0; i < NUM_LEDS; i++) {
      pixelData[i] = rgb2Int(LEDbrightness, LEDbrightness, LEDbrightness);
    }
  }

  ws281x.render(pixelData);
}

function rgb2Int(r, g, b) {
    return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
}
