# Node-RED: VISEO

A set Node-RED nodes OpenSourced by [VISEO](http://www.viseo.com/) Technologies.

![Framework](https://github.com/NGRP/node-red-contrib-viseo/blob/master/doc/framework.png?raw=true)

## Getting Started

### Install NodeJS

Use [NVM](https://github.com/creationix/nvm) to get a proper NodeJS installation:

```
wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.32.0/install.sh | bash
nvm install 6
```

Using NVM, the installed Node will be tied to user credential. This will prevent security issues with sudo.

You should also install [PM2](https://github.com/Unitech/pm2) to manage NodeJS process.

```
npm install -g pm2
```

### Install Node-RED

Install [Node-RED](https://nodered.org/docs/getting-started/installation)
You could download the [latest build here](https://github.com/node-red/node-red/releases/latest).

```
wget https://github.com/node-red/node-red/releases/download/{version}/node-red-{version}.zip
unzip node-red-{version}.zip
mv node-red-{version} node-red
cd node-red ; npm install
```

### Install Modules

Each module can be installed using `npm` command. 

```
npm install node-red-contrib-viseo-{filename}
```

#### Install Modules: Template

Use this [Project Template](http://bot.viseo.io) to get started with a ChatBot

```
git clone https://github.com/NGRP/node-red-viseo-bot.git directory
```

### Start Node-RED

Start [Node-RED](https://nodered.org/docs/getting-started/running) with a predefined configuration file

```
node node-red/red.js
```

The template store all critical files in `/data` directory. 
The file `data/node-red-config.js` is a copy of `settings.js` to manage custom configuration.

```
node node-red/red.js -s data/node-red-config.js
```

This command line is improved to be used with PM2 in `start.sh` and `start.bat`

You MUST update [the password](http://nodered.org/docs/security) defined in the configuration file. 


## Getting Help

For further help, or general discussion, please use the [github issue tracker](https://github.com/NGRP/node-red-contrib-viseo/issues) and in order to be labeled with `question` tag please specify :
- Your message is a question / discussion
- The module or node name

## Developers

All framework modules are installed with NPM. 
Custom private modules should be deployed in a `node-red-contrib` directory. 
(The project template already contains this directory)


Update `nodesDir` property of [Node-RED configuration](https://nodered.org/docs/configuration) to use absolue path to the `node-red-contrib` folder as a module repository.

## Contributing

Before raising a pull-request, please read our contributing guide.

This project adheres to the Contributor Covenant 1.4. By participating, 
you are expected to uphold this code. 
Please report unacceptable behavior to any of the project's core team.

## Copyright and license

Icons are made by [Freepik](http://www.freepik.com) from [Flaticon](http://www.flaticon.com) is licensed by [CC 3.0 BY](http://creativecommons.org/licenses/by/3.0/)

Copyright 2016-2017 [VISEO](http://www.viseo.com/) under the Apache 2.0 license.
