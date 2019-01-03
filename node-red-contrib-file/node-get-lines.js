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

    let lines = (config.linesType === "num") ? (Number(config.lines) || 100) : "ALL";
    let split = (config.splitType === "str") ? (config.split || undefined) : undefined;

    let filepath = helper.resolve(config.file);
    if (!filepath) {
        node.warn("File not found");
        return node.send(data);
    }
    filepath = path.normalize(filepath);

    let myarray = new Array();
    
    let readStream = fs.createReadStream(filepath);

    readStream.on('error', function(err) {
        node.err(err);
        return node.send(data);
    })

    readline.createInterface({
        input: readStream
    })
    .each(function(line) {
        if (split) line = line.split(split);
        myarray.push(line);
    })
    .then(function(count) {
        if (lines === "ALL") {
            helper.setByString(data, config.output || "payload", myarray);
            return node.send(data);
        }
        else {
            let result = (myarray.length <= lines) ? myarray : myarray.slice(Math.max(myarray.length - lines, 1));
            helper.setByString(data, config.output || "payload", result);
            return node.send(data);
        }
    })
    .caught(function(err) {
        node.err("Error reading file");
        return node.send(data);
    });
}
