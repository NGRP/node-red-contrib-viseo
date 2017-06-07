const request = require('request');
const extend  = require('extend');
const helper  = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("irma-loop-management", register, {});
}

const input = (node, data, config) => {
    let array = helper.getByString(data, config.array || "irma.persons");
    if (typeof array !== 'object'){
        data.payload = "ERROR : Array is not an object";
        return node.send(data);
    }

    if (typeof config.loopvar !== 'string'){
        data.payload = "ERROR : Loop variable is not a string";
        return node.send(data);
    }

    let exists = "irma." + config.loopvar;
        exists = helper.getByString(data, exists);

    if (exists === undefined) {
        var jason = new Object();
        jason[config.loopvar] = new Object();
        jason[config.loopvar].max = array.length;
        jason[config.loopvar].state = 0;
        jason[config.loopvar].info = "";
        jason[config.loopvar].active = array[0];
        extend(true, data.irma, jason);
        data.payload = "OK";
        return node.send([data, undefined]);

    } else {

        let actualState = "irma." + config.loopvar + ".state",
            actualParse = "irma." + config.loopvar + ".active",
            getActualState = helper.getByString(data, actualState);
        data.payload = "OK";

        if (getActualState < array.length-1) {
            helper.setByString(data, actualState, getActualState+1);
            helper.setByString(data, actualParse, array[getActualState+1]);
            return node.send([data, undefined]);
        } else {
            delete data.irma[config.loopvar];
            return node.send([undefined, data]);
        }
    }
}