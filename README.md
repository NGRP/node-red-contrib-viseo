# Node-RED: VISEO

A set Node-RED nodes OpenSourced by [VISEO](http://www.viseo.com/) Technologies.


| Node                                                                                                           | Description |
| -------------------------------------------------------------------------------------------------------------- |-------------|
| [botbuilder](https://github.com/NGRP/node-red-contrib-viseo/tree/master/node-red-contrib-viseo-botbuilder)     | wrapper on top of Microsoft Bot Builder Framework |
| [random](https://github.com/NGRP/node-red-contrib-viseo/tree/master/node-red-contrib-viseo-random)             | perform random call between outputs               |
| [nedb](https://github.com/NGRP/node-red-contrib-viseo/tree/master/node-red-contrib-viseo-nedb)                 | set/get data from NeDB Database                   |

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

### Start Node-RED

Start [Node-RED](https://nodered.org/docs/getting-started/running) with a predefined configuration file

```
node node-red/red.js
```

We used to create a `/data` folder to store all generated files. You should copy `settings.js` 
to that folder and run Node-RED with `-s` parameter:

```
node node-red/red.js -s data/node-red-config.js
```

See also sample [node-red-conf.js](https://gist.github.com/JpEncausse/1d2e72c65749d7704df59a9c38273f7f). 
Do not forget to [set a password](http://nodered.org/docs/security) ! Here is a [start.sh](https://gist.github.com/JpEncausse/20af7c946e4bb105ac7da7f24a287ca5)

## Getting Help

For further help, or general discussion, please use the [github issue tracker](https://github.com/NGRP/node-red-contrib-viseo/issues) and in order to be labeled with `question` tag please specify :
- Your message is a question / discussion
- The module or node name

## Developers

If you want to run the latest code from git, here's how to get started:

Clone the code in a `node-red-contrib` folder

```
mkdir node-red-contrib
git clone https://github.com/NGRP/node-red-contrib-viseo.git
```

Update `nodesDir` property of [Node-RED configuration](https://nodered.org/docs/configuration) 
to use absolue path to the `node-red-contrib` folder as a module repository.

## Contributing

Before raising a pull-request, please read our contributing guide.

This project adheres to the Contributor Covenant 1.4. By participating, 
you are expected to uphold this code. 
Please report unacceptable behavior to any of the project's core team.

## Copyright and license

Icons are made by [Freepik](http://www.freepik.com) from [Flaticon](http://www.flaticon.com) is licensed by [CC 3.0 BY](http://creativecommons.org/licenses/by/3.0/)

Copyright 2016 [VISEO](http://www.viseo.com/) under the Apache 2.0 license.
