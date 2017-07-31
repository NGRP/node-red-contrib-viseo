'use strict';

const UUIDv4 = require('uuid/v4');


// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function (RED) {
    const node_uuid = function (config) {
        RED.nodes.createNode(this, config);
        this.output = config.output;

        this.on('input', (msg) => {
            let uuid = UUIDv4();
            RED.util.setMessageProperty(msg, this.output || "payload", uuid, true);
            this.send(msg);
        });
    }

    RED.nodes.registerType('UUID', node_uuid);
}
