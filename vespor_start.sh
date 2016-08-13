#!/bin/bash
# Some time to make sure the OS is up and running
sleep 30
# Start video streamer on port 8080
cd ~/mjpg-streamer/mjpg-streamer
export LD_LIBRARY_PATH=`pwd`
./mjpg_streamer -b -i "input_uvc.so -n -r 1024x576 -f 30" -o "output_http.so -w ${LD_LIBRARY_PATH}/www"
# Start vespor app on port 80
cd ~/vesporpi
sudo node index.js &
