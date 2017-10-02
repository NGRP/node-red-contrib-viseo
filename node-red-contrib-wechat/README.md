# Node-RED

A Node-RED wrapper on top of [Microsoft Bot Builder](https://github.com/Microsoft/BotBuilder) Framework.

![Framework](https://raw.githubusercontent.com/NGRP/node-red-contrib-viseo/master/node-red-contrib-botbuilder/doc/framework.png)

This node is part of project [node-red-contrib-viseo](https://github.com/NGRP/node-red-contrib-viseo) powered by [VISEO](http://www.viseo.com) Technologies.

Here is a [French Article](https://goo.gl/DMfJk1) on Bot Ecosystem and more.

## Quick Start

```
npm install node-red-contrib-viseo-botbuilder
```


### Get Started

Here is a [sample configuration](https://github.com/NGRP/node-red-contrib-viseo/blob/master/node-red-contrib-botbuilder/doc/flow-start.json) to start you server. 
Switch will route to the convenient SendCard according to business logic.

![Kickstart Nodes](https://github.com/NGRP/node-red-contrib-viseo/blob/master/node-red-contrib-botbuilder/doc/node_start.jpg?raw=true)

### Requirement

- An access to [Microsoft Bot Framework](https://dev.botframework.com/)
- An SSL certificate (like Let's Encrypt) declared in node-red-config.js (or a proxy)
- Storage is performed in memory in NeDB or any other third party database.

### Multilang

- The profile node handle the default locale
- The user's locale is defined throught MSBotBuilder priorities
- All fields of Card node are translated according to the user's locale
- Locales files are defined in `/data/locales/lang_country.json`

The JSON file can be generated from XLSX:

```
node path/to/xlsx2json.js path/to/input.xlsx path/to/output.json
```

## Getting Help

For further help, or general discussion, please use the [github issue tracker](https://github.com/NGRP/node-red-contrib-viseo/issues) and in order to be labeled with `question` tag please specify :
- Your message is a question / discussion
- The module or node name

## Contributing

Before raising a pull-request, please read our contributing guide.

This project adheres to the Contributor Covenant 1.4. By participating, 
you are expected to uphold this code. 
Please report unacceptable behavior to any of the project's core team.

## Authors

This project is a creation of [VISEO](http://www.viseo.com) Technology.

- Eric Brulatout [@ebrulato](https://twitter.com/ebrulato)
- Jean-Philippe Encausse [@jpencausse](https://twitter.com/jpencausse)
- Alice Vasseur [@Alice_Vasseur](https://twitter.com/Alice_Vasseur)
- Klervi Menoret [@klervix](https://twitter.com/klervix)
- To-Thi Hoang 


## Copyright and license

Copyright 2016-2017 [VISEO](http://www.viseo.com) under the Apache 2.0 license.