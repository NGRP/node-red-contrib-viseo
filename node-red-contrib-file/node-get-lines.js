const helper    = require('node-red-viseo-helper');
const path      = require('path');
const fs        = require('fs');
const readline  = require('readline-promise');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        
        start(RED, node, config);
        this.on('input', (data) => { input(node, data, config)  });
        this.on('close', (done) => { stop(done) });
    }
    RED.nodes.registerType("get-lines", register, {});
}

const stop  = (done) => { done();       } 
const start = (RED, node, config)  => { }

const input = (node, data, config) => {

    let filepath = helper.resolve(config.file);
    if (!filepath) {
        node.warn("File not found");
        return node.send(data);
    }
    filepath = path.normalize(filepath);

    let myarray = new Array();

    readline.createInterface({
        input: fs.createReadStream(filepath) 
    })
    .each(function(line) {
        myarray.push(line);
    })
    .then(function(count) {
        helper.setByString(data, config.output || "payload", myarray);
        return node.send(data);
    })
    .caught(function(err) {
        node.err("Error reading file");
        return node.send(data);
    });
}