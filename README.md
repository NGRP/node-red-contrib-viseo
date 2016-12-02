# Node-RED: VISEO

A set Node-RED nodes OpenSourced by [VISEO](http://www.viseo.com/) Technologies.


| Node                                                                                                           | Description |
| -------------------------------------------------------------------------------------------------------------- |-------------|
| [botbuilder](https://github.com/NGRP/node-red-contrib-viseo/tree/master/node-red-contrib-viseo-botbuilder)     | wrapper on top of Microsoft Bot Builder Framework |
| [random](https://github.com/NGRP/node-red-contrib-viseo/tree/master/node-red-contrib-viseo-random)     | perform random call between outputs |

## Quick Start

Each module can be installed using `npm` command

```
npm install node-red-contrib-viseo-{filename}
```

## Getting Help

For further help, or general discussion, please use the [github issue tracker](https://github.com/NGRP/node-red-contrib-viseo/issues) and in order to be labeled with `question` tag please specify :
- Your message is a question / discussion
- The module or node name

## Developers

If you want to run the latest code from git, here's how to get started:

1. Install [Node-RED](https://nodered.org/)

2. Clone the code in a `node-red-contrib` folder

        cd node-red
        mkdir node-red-contrib
        git clone https://github.com/NGRP/node-red-contrib-viseo.git

3. Install dependencies for each sub folder

        cd /{subfolder}
        npm install

4. Update `nodesDir` property of [Node-RED configuration](https://nodered.org/docs/configuration) to use the `node-red-contrib` folder as a module repository.

5. [Start Node-RED](https://nodered.org/docs/getting-started/running)

## Contributing

Before raising a pull-request, please read our contributing guide.

This project adheres to the Contributor Covenant 1.4. By participating, 
you are expected to uphold this code. 
Please report unacceptable behavior to any of the project's core team.

## Copyright and license

Copyright 2016 [VISEO](http://www.viseo.com/) under the Apache 2.0 license.
