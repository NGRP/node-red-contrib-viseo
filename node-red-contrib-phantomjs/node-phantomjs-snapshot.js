const path         = require('path');
const childProcess = require('child_process');
const phantomjs    = require('phantomjs-prebuilt');
const helper       = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  LOGS
// --------------------------------------------------------------------------

let info  = console.log;
let error = console.log;

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    info  = RED.log.info;
    error = RED.log.error;

    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("phantomjs-snapshot", register, {});
}

const input = (node, data, config) => {
    snapshot(node, data, config, function(err, output){
        data.payload = output;
        node.send(data);
    });
}

const snapshot  = (node, data, config, callback) => {
    let outPath = helper.resolve(data.path || config.path, data, '');
    let binPath = phantomjs.path;
    let width   = config.width  || 1024;
    let height  = config.height || 768;
    let delay   = config.delay  || 0;
    let json    = JSON.stringify(data.phantomjs.data) || '{}';
    let childArgs = [ path.join(__dirname, 'phantomjs-script-snapshot.js'), config.url, outPath, width, height, delay, json]

    childProcess.execFile(binPath, childArgs, function(err, stdout, stderr) {
        info('stderr:' + stderr);
        callback(err, outPath);
    })
}