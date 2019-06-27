const helper  = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        this.on('input', (data)  => { input(RED, node, data, config)  });
    }
    RED.nodes.registerType("object-search", register, {});
}

const input = (RED, node, data, config) => {
    let process = config.process,
        deep = config.deep;

    let search = helper.getContextValue(RED, node, data, config.search, config.searchType);
    let location = helper.getContextValue(RED, node, data, config.location, config.locationType);

    if (location === null || location === undefined || typeof location !== 'object') return node.error("Unfound object");

    let foundObject = searchValue(location, search, process, deep);
    helper.setContextValue(RED, node, data, config.output, foundObject, config.outputType);

    return node.send(data);

}

function searchValue(object, value, process, deep) {
    if (typeof object !== 'object' || emptyObj(object)) return {};
    let foundObject = {};

    if (object.length !== undefined) {
        for (let item of object) {
            if (typeof item !== 'object') continue; 
            foundObject = searchValue(item, value, process, deep);
            if (emptyObj(foundObject) === false) break;
        }
    }
    else {
        if (process === "values" && contains(object, value)) foundObject = object;
        else if (process === "properties" && object.hasOwnProperty(value)) foundObject = object;
        else {
            if (!deep) return foundObject;
            for (let [key, item] of  Object.entries(object)) {
                if (typeof item !== 'object') continue;
                foundObject = searchValue(item, value, process, deep);
                if (emptyObj(foundObject) === false) break;
            }
        }
    }
    return foundObject;
}

function emptyObj(obj) {
    if (typeof obj !== 'object') return false;
    else if (obj.length !== undefined) {
        if (obj.length === 0) return true;
        else return false;
    } 
    else if (Object.keys(obj).length === 0) return true;
    else return false;
}

function contains(obj, value) {
    let values = Object.values(obj);

    for (let val of values) {
        if (val === value) return true;
    }
    return false;
}