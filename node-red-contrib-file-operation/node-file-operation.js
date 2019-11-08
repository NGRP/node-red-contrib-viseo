
const helper = require('node-red-viseo-helper');
const path   = require('path');
const fs     = require('fs');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        this.on('input', (data)  => { 
            input(RED, node, data, config)
        })
    }
    RED.nodes.registerType("file-operation", register, {})
}

async function input(RED, node, data, config) {

    let location = helper.getContextValue(RED, node, data, config.location, config.locationType);
    let result;

    try {
        switch(config.operation) {
            case "stats":
                result = await fileStats(location); 
                break;
            case "list":
                result = await listAllFiles(location); 
                break;
        }

        if (result) helper.setByString(data, config.output || "payload", result);
        return node.send([data, undefined]);
    }
    catch(err) {
        helper.setByString(data, config.output, err);
        return node.send([undefined, data]);
    }
}

async function fileStats(filePath) {
    return new Promise(function(resolve, reject){
        fs.stat(filePath, function (err, stats) {
            if (err) return reject(err);
            else return resolve(stats);
        })
    })
}

async function listAllFiles(dirPath) {
    return new Promise(function(resolve, reject){
        fs.readdir(dirPath, function (err, files ) {
            if (err) return reject(err);
            else return resolve(files);
        })
    })
}