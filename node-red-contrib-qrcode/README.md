# Node-RED

A Node-RED node to decode QRCode using PureJS 

This node is part of project [node-red-contrib-viseo](https://github.com/NGRP/node-red-contrib-viseo) powered by [VISEO](http://www.viseo.com) Technologies.

## Quick Start

```
npm install node-red-contrib-viseo-qrcode
```

### Build the Node-RED Flow

The `qrDecode` node 
- retrieve a *Buffer* or an *URL* from the given input, 
- if it's an *URL*, download the *Buffer*
- retrieve and decode the *Buffer* QRCode
- parse encoded data to a JSON object
- If data is an URL, convert it's querystring to a JSON object

![Flow](https://github.com/NGRP/node-red-contrib-viseo/raw/master/node-red-contrib-qrcode/doc/flow.jpg)


### Best Practices

[ZXing](https://zxing.appspot.com/generator/) webservice can be use to generate a QRCode.

Generated QRCode should contains an URL with parameters.
- Anyone using the QRCode will be redirected to that URL (that could explain the webservice)
- Decoding the QRCode will still works

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

This project is a creation of [VISEO](http://www.viseo.com) Innovation.

- Jean-Philippe Encausse [@jpencausse](https://twitter.com/jpencausse)


## Copyright and license

Copyright 2016-2017 [VISEO](http://www.viseo.com) under the Apache 2.0 license.