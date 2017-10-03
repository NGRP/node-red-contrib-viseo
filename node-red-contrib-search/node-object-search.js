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
    RED.nodes.registerType("object-search", register, {});
}

const input = (node, data, config) => {
    let process = config.process,
        search = config.search,
        location = config.location,
        output = config.output;

    let searchType = config.searchType,
        locationType = config.locationType,
        outputType = config.outputType;

    if (searchType === 'msg' || searchType === 'global') {
        let loc = (searchType === 'global') ? node.context().global : data;
        search = helper.getByString(loc, search);
    }
    else if (searchType === 'num') search = Number(search);

    let loc = (locationType === 'global') ? node.context().global : data;
    location = helper.getByString(loc, location);

    if (location === null || location === undefined || typeof location !== 'object') return node.error("Unfound object");

    let foundObject = searchValue(location, search, process);

    loc = (outputType === 'global') ? node.context().global : data;
    helper.setByString(loc, output, foundObject);

    return node.send(data);

}

function searchValue(object, value, process) {
    if (typeof object !== 'object' || emptyObj(object)) return {};
    let foundObject = {};

    if (object.length !== undefined) {
        for (let item of object) {
            if (typeof item !== 'object') continue; 
            foundObject = searchValue(item, value, process);
            if (emptyObj(foundObject) === false) break;
        }
    }
    else {
        if (process === "values" && contains(object, value)) foundObject = object;
        else if (process === "properties" && object.hasOwnProperty(value)) foundObject = object;
        else {
            for (let [key, item] of  Object.entries(object)) {
                if (typeof item !== 'object') continue;
                foundObject = searchValue(item, value, process);
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

    console.log(values);
    for (let val of values) {
        if (val === value) return true;
    }
    return false;
}