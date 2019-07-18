const spawn = require('child_process').spawn;
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
    RED.nodes.registerType("win-speak", register, {});
}

const input = (node, data, config) => {
    let tts = config.input;
    if (config.typeInput === 'msg'){
        tts = helper.getByString(data, config.input || 'payload', undefined);
    }
    if (!tts) return;

    let path = __dirname+'/bin/speak.exe';
    let args = ['-tts', tts];
    const child = spawn(path, args);
    
    child.stdout.on('data', (data) => {
        // console.log(data)
    });
    child.stderr.on('data', (data) => {
        console.log('stderr: ' + data);
    });
    child.on('close', (code) => {
        node.send(data);
    });
}