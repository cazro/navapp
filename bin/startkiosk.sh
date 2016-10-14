#!/bin/sh
xset -dpms
xset s off
xset s noblank
x11vnc -display :0 -shared -forever &
unclutter -d :0  &
export NODE_ENV=production
cd $NAVAPP_DIR
pm2 delete all
pm2 start app.js --name navapp --node-args="--max-old-space-size=128"
echo "Waiting 40 seconds"
sleep 40s
echo "Starting matchbox-window-manager"
matchbox-window-manager &
echo "Starting Midori"
export DISPLAY=":0"
while true; do
   midori -e Fullscreen -a http://localhost
done
