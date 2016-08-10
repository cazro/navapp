# NAVAPP

Navapp is a NodeJS app that is meant to run on a Raspberry Pi but can
be run on any architecture.  There are optional features such as if you have buttons
connected the any GPIO pins you can set them in the config in order to use them
to navigate through your list of URLs the server will cycle through.

You can also add weather alert support and have it check the local weather and it will
insert a radar gif in rotation while there is bad weather in the area.

The last feature I've added is the ability to have the server grab images from a Reddit
subreddit and have it choose a random image to put in rotation that will change every 
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


### Installing

Store the navapp files under /opt/navapp

Make sure your normal user account has r/w access to the navapp folder.


```
cd /opt/navapp
npm install
```

After installing the node modules, an extra script is run that will install some required
packages and move configuration files to the right location for your system.





