#!/bin/sh
while true
do
    node ./bot.js
    echo "Oh no, bot crashed, restarting in 30 seconds"
    sleep 30
done