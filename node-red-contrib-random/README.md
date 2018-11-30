# Node-RED

Performs random calls according to outputs.

This node is part of project [node-red-contrib-viseo](https://github.com/NGRP/node-red-contrib-viseo) powered by [VISEO](http://www.viseo.com) Technologies. Please find the node documentation in the Node-RED info tab. 

Here is a [French Article](https://goo.gl/DMfJk1) on Bot Ecosystem and more.

## Quick Start

```
npm install node-red-contrib-viseo-random
```

### Build the Node-RED Flow

The `random` node 
- *First call:* creates an array containing all the possible output values in a field according to the chosen scope.
- Randomly shuffles the array.
- *All calls:* retrieve the array,
- Gets the value of the last element of the array,
- Deletes this element from the array,
- Sends the message to the output corresponding to the value.

When all the outputs were used, the array is reset and shuffled.

The scope can be set to:
- *msg* - The current message in the flow ;
- *user* - The msg.user field in the flow (can be stored in a database) ;
- *global* - The node context (could be not working on multi-server networks) ;

![Flow](https://github.com/NGRP/node-red-contrib-viseo/raw/master/node-red-contrib-random/doc/flow.jpg)

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