# Node-RED: VISEO

This project contains a set of Node-RED nodes OpenSourced by [VISEO](http://www.viseo.com/) to build Conversational Assistant. 
- It is architectured on top of [Microsoft Bot Framework](https://dev.botframework.com/) in order to connect to multiple channels. 
- New channels like WeChat, Google Home, Amazon Echo are also in the roadmap.

![Framework](https://github.com/NGRP/node-red-contrib-viseo/blob/master/doc/framework.png?raw=true)

This project is also the v5 and full re-engineering of a SmartHome Assistant named [SARAH](http://sarah.encausse.net) (build in 2012).

- A roadmap is available on [GitHub Project](https://github.com/NGRP/node-red-contrib-viseo/projects/1)
- A documentation is available on [GitHub Wiki: Getting Started](https://github.com/NGRP/node-red-contrib-viseo/wiki/Getting-started)

[VISEO](http://www.viseo.com/) is not a Software Editor but a Consulting Company (1300 people). Since 2016, everybody wants to build it's own bot. We believe that the key is to **focus on User Exprience** because technologies are not mature. That's why 
- we choose Node-RED platform to let developpers switch between pieces of NLP, Computer Vision, etc ...
- we open-sourced our work to share the state of the art between our customers

**If you are** a company **looking for experts** to build a project of textual and/or vocal conversationnal assistant, feel free to contact us: **contact [at] viseo [dot] io**

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

Copyright 2016-2019 [VISEO](http://www.viseo.com/) under the Apache 2.0 license.
