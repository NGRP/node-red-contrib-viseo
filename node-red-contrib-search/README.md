# Node-RED

A Node-RED node to perform loops on objects.

This node is part of project [node-red-contrib-viseo](https://github.com/NGRP/node-red-contrib-viseo) powered by [VISEO](http://www.viseo.com) Technologies.

## Quick Start

```
npm install node-red-contrib-viseo-loop
```

### Build the Node-RED Flow

The `loop` node 
- *First call:* creates a specific field according to the chosen scope to stock the information, 
- *All calls:* retrieves the counter in the field and increment it,
- IF (value < object length): sends the message to the first output, with the current value of the object ;
- ELSE: forgot the informations and sends the message to the last output ;

The scope can be set to:
- *msg* - The current message in the flow ;
- *user* - The msg.user field in the flow (can be stored in a database) ;
- *global* - The node context (could be not working on multi-server networks) ;

![Flow](https://github.com/NGRP/node-red-contrib-viseo/raw/master/node-red-contrib-loop/doc/flow.jpg)

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
