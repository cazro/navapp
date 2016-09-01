#!/bin/sh
xset -dpms
xset s off
xset s noblank
x11vnc -display :0 -shared -forever &
unclutter -d :0  &
export NODE_ENV=production
cd /opt/navapp/
pm2 delete all
pm2 start /opt/navapp/app.js --name navapp
echo "Waiting 40 seconds"
sleep 40s
echo "Starting matchbox-window-manager"
matchbox-window-manager &
echo "Starting Midori"
while true; do
   midori -e Fullscreen -a http://localhost
done
