# Node-RED

Node-RED nodes to trigger CLI windows .exe for SARAH

This module is part of project [node-red-contrib-viseo](https://github.com/NGRP/node-red-contrib-viseo) powered by [VISEO](http://www.viseo.com) Technologies.

This module is the v5 of [SARAH project](http://sarah.encausse.net)

TODO:
- Update listen.exe to return a JSON of XML Path
- Add a listen node taking a grammar as input
- Add an option to stop process after first match
- Add an option to stop/start listening
- How to retrieve grammar from third party plugins (spreads everywhere) ?
- Nodes listen/speak should use SocketIO or DirectLine to communicate with a Server. In case of SocketIO we should add an algorithm to handle replies and prompts.

## Quick Start

```
npm install node-red-contrib-viseo-sarah
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

- Jean-Philippe Encausse [@jpencausse](https://twitter.com/jpencausse)


## Copyright and license

Copyright 2016-2017 [VISEO](http://www.viseo.com) under the Apache 2.0 license.