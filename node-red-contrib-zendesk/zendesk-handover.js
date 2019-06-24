'use strict';

const helper  =     require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function (RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);

        let node = this;
        this.on('input', (data)  => { input(node, data, config); });
    }
    RED.nodes.registerType('zendesk-handover', register, {});
};

async function input (node, data, config) {
    helper.emitAsyncEvent('transfer', node, data, config, (data) => {
        return (data.payload.error) ? node.send([null, data]) : node.send([data, null])
    });
};
