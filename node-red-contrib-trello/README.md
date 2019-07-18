# Node-RED

Trello list Card and Webhooks nodes.

This node is part of project [node-red-contrib-viseo](https://github.com/NGRP/node-red-contrib-viseo) powered by [VISEO](http://www.viseo.com) Technologies. Please find the node documentation in the Node-RED info tab. 

Here is a [French Article](https://goo.gl/DMfJk1) on Bot Ecosystem and more.

## Quick Start

```
npm install node-red-contrib-viseo-trello
```

### Build the Node-RED Flow

The `trello-in` will trigger an event of each action on the target ModelId (board, card, user, ...).

![Flow](https://github.com/NGRP/node-red-contrib-viseo/raw/master/node-red-contrib-trello/doc/flow.jpg)

On a Trello URL, add `.json` to get the board description and retrieve all modelIds.

Credential require a [Trello Application Key and a Token](https://trello.com/app-key).

The `trello-card` will retrieve, create, update or delete a board, a list, a card, a label or a custom field. 

![Flow 2](https://github.com/NGRP/node-red-contrib-viseo/raw/master/node-red-contrib-trello/doc/flow2.jpg)

Configuration can be static or retrieved from the flow (`payload.card.id`). A Good practice is to retrieve a card from it's Id then chain it with an other node to perform an update.

### Limitations

The `trello-in` node add routes to Node-RED server. Updating the node configuration will add new routes but won't remove previous. The Node-RES server must be restarted to clean up routes.

The `trello-in` node trigger add/update Trello webhooks. Previous webhooks are not removed. That's why we use an explicit callback path to limit errors. A webhook can be removed with a DELETE request to trello.

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