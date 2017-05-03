# NAVAPP

Navapp is a NodeJS app that serves up a web page to a browser. The browser keeps
track of the loop but the timing of the loop and the source of the "slides" come from
the server.

You can also add weather alert support and have it check the local weather. It will
insert a special page in rotation with a radar GIF, a random webcam still from the area, and a long
description of the alerts along. During the time that there is escalated weather, the name of the alerts
will scroll across the top of the page for all "slides" in the loop.

The last feature I've added is the ability to have the server grab images from one or more Reddit
subreddits and have it choose a random image to put in rotation that will change every 
time the page changes.

## Getting Started


### Prerequisites

Get the latest stable version of npm and nodejs that matches your system's architecture from [NodeJS](https://nodejs.org/en/download/)

If you're running on a Raspberry Pi, the quickest and easiest way to update your npm and nodejs
after downloading and extracting the tar.gz file is to:

1. cd into extracted folder
2. sudo cp -Rf bin /usr/
3. sudo cp -Rf lib /usr/
4. sudo npm install -g npm

As long as you're using the latest, full release of Raspbian then you shouldn't need any extra packages
to get npm to work.

### Configuration


./config/default-0.json:
Contains the configuration for the navapp server. 
There is an example file to help get you started.
You can alter the sample file and rename it without the ".sample".

With the config you can turn features on or off, decide which "slides" the client 
loops through and the order of them.

### Installing

```
git clone https://github.com/cazro/navapp.git
cd navapp
sudo npm install
```
