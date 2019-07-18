# Node-RED

Nodes to send/receive data using Socket.io.

These nodes use [Socket.io](http://socket.io/).

This node is part of project [node-red-contrib-viseo](https://github.com/NGRP/node-red-contrib-viseo) powered by [VISEO](http://www.viseo.com) Technologies. Please find the node documentation in the Node-RED info tab. 

Here is a [French Article](https://goo.gl/DMfJk1) on Bot Ecosystem and more.

## Quick Start

```
npm install node-red-contrib-viseo-socketio
```

## Client code example

```javascript
var socket = io('https://myserver.com', { path: '/myPath/socket.io', secure: true });

socket.on('myNamespace', function (data) {
    if (data.event) socket.emit('myNamespace', { type: "event", content: 'ok' });
});
    
socket.on('disconnect', function () {
    console.log('you have been disconnected');
    socket.removeAllListeners('myNamespace');
    socket.removeAllListeners('disconnect');
    socket.removeAllListeners('reconnect');
    socket.removeAllListeners('connect');
});

socket.on('reconnect', function () {
    console.log('you have been reconnected');
});
    
socket.on('connect', function () {
    console.log('you have been connected');
});
```

## Getting Help

A documentation is available on [this Wiki](https://github.com/NGRP/node-red-viseo-bot/wiki).

For further help, or general discussion, please use the [github issue tracker](https://github.com/NGRP/node-red-contrib-viseo/issues) and in order to be labeled with `question` tag please specify :
- Your message is a question / discussion
- The module or node name

## Contributing

This project adheres to the Contributor Covenant 1.4. By participating, you are expected to uphold [this code](https://www.contributor-covenant.org/). Please report unacceptable behavior to any of the project's core team.

## Authors

This project is a creation of [VISEO](http://www.viseo.com) Technology.

- Jean-Philippe Encausse [@jpencausse](https://twitter.com/jpencausse)
- Klervi Menoret [@klervix](https://github.com/klervix)
- To-Thi Hoang
- Alice Vasseur [@Alice_Vasseur](https://twitter.com/Alice_Vasseur)

## Copyright and license

Copyright 2016-2019 [VISEO](http://www.viseo.com) under the Apache 2.0 license.
Copyright 2012-2019 [SARAH](http://sarah.encausse.net) under the Apache 2.0 license.