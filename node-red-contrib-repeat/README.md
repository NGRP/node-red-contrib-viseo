# Node-RED

Uses different repeat calls according to outputs.

This node is part of project [node-red-contrib-viseo](https://github.com/NGRP/node-red-contrib-viseo) powered by [VISEO](http://www.viseo.com) Technologies. Please find the node documentation in the Node-RED info tab. 

Here is a [French Article](https://goo.gl/DMfJk1) on Bot Ecosystem and more.


## Quick Start

```
npm install node-red-contrib-viseo-repeat
```

### Build the Node-RED Flow

The `repeat` node 
- *First call:* creates a specific counter in a field according to the chosen scope, 
- Sends the message to the first output ;
- *Next calls:* retrieves the counter and increment it,
- Sends the message to the corresponding output ;

When the value is reached, it is possible to select the node behavior:
- Stopping sending messages ;
- Reset the counter and continue with the normal node behavior ;
- Always use the last output ;

The scope can be set to:
- *msg* - The current message in the flow ;
- *user* - The msg.user field in the flow (can be stored in a database) ;
- *global* - The node context (could be not working on multi-server networks) ;

![Flow](https://github.com/NGRP/node-red-contrib-viseo/raw/master/node-red-contrib-repeat/doc/flow.jpg)

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

Copyright 2016-2019 [VISEO](http://www.viseo.com) under the Apache 2.0 license.
Copyright 2012-2019 [SARAH](http://sarah.encausse.net) under the Apache 2.0 license.