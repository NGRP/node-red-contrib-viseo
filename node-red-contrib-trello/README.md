# Node-RED

A Node-RED node to play with Trello. 

This node is part of project [node-red-contrib-viseo](https://github.com/NGRP/node-red-contrib-viseo) powered by [VISEO](http://www.viseo.com) Technologies.

## Quick Start

```
npm install node-red-contrib-viseo-trello
```

### Build the Node-RED Flow

The `trello-in` will trigger an event of each action on the target ModelId (board, card, user, ...)

![Flow](https://github.com/NGRP/node-red-contrib-viseo/raw/master/node-red-contrib-trello/doc/flow.jpg)

On a Trello URL, add `.json` to get the board description and retrieve all modelIds.

Credential require a [Trello Application Key and a Token](https://trello.com/app-key).

The `trello-card` will retrieve, create or update a card. 
- A POST (create) is performed if there is no Card Id
- A PUT (update) is performed if there is a Card Id and a List Id
- A GET (read) is performed if there is a Card Id but no List Id

![Flow 2](https://github.com/NGRP/node-red-contrib-viseo/raw/master/node-red-contrib-trello/doc/flow2.jpg)

Configuration can be static or retrieved from the flow (`payload.card.id`). A Good practice is to retrieve a card from it's Id then chain it with an other node to perform an update.

### Limitations

The `trello-in` node add routes to Node-RED server. Updating the node configuration will add new routes but won't remove previous. The Node-RES server must be restarted to clean up routes.

The `trello-in` node trigger add/update Trello webhooks. Previous webhooks are not removed. That's why we use an explicit callback path to limit errors. A webhook can be removed with a DELETE request to trello.


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