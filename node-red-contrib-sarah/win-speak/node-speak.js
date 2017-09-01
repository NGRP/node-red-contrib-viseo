const fs = require('fs');
const spawn = require('child_process').spawn;

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("win-speak", register, {});
}

const input = (node, data, config) => {
    
    let path = __dirname+'/bin/speak.exe';
    let args = ['-tts', data.payload.text];
    const child = spawn(path, args);
    
    child.stdout.on('data', (data) => {
        console.log(data)
    });
    child.stderr.on('data', (data) => {
        console.log('stderr: ' + data);
    });
    child.on('close', (code) => {
        node.send(data);
    });
}