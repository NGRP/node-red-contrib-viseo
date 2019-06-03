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
    RED.nodes.registerType('iadvize-handover', register, {});
};

async function input (node, data, config) {
    let rule = "";

    if (config.ruleway === "id") {
        rule = (config.ruleidType === "str") ? config.ruleid : data[config.ruleid];
    }
    else {
        /* to do */
    }

    data.reply = [{
        "type": "text",
        "text": (config.messageType === "str") ? config.message : data[config.message]
    }, {
        "type": "transfer",
        "distributionRule":  rule
    }, {
        "type": "text",
        "text": (config.errmessageType === "str") ? config.errmessage : data[config.errmessage]
    }]

    helper.emitAsyncEvent('reply', node, data, config, (newData) => {
        node.warn(newData)
        return (newData.error) ? node.send([null, newData]) : node.send([newData, null])
    });
};
