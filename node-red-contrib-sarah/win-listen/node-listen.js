const fs     = require('fs');
const path   = require('path');
const spawn  = require('child_process').spawn;
const helper = require('node-red-viseo-helper');

let PROCESS = { }
let BUFFERS = { }

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        
        start(node, config);
        this.on('input', (data)  => { input(node, config, data)  });
        this.on('close', (done)  => { stop(node, done) });
    }
    RED.nodes.registerType("win-listen", register, {});
}

const stop  = (node, done) => { 
    spawn_Kill(node);
    done(); 
}
const start = (node, config) => {
   spawn_Start(node, config)
}

const input = (node, config, data) => {
    spawn_Start(node, config, data)
}

// --------------------------------------------------------------------------
//  SPAWN
// --------------------------------------------------------------------------

const spawn_Kill = (node) => {
    let child = PROCESS[node.id];
    if (!child){ return; }

    try { child.kill(); } catch(ex){ console.log(ex) }
    PROCESS[node.id] = undefined;
    BUFFERS[node.id] = undefined;
}

const spawn_Start = (node, config, msg) => {

    spawn_Kill(node);

    let proc       = helper.resolve(config.process, msg, undefined);
        proc       = path.normalize(proc || __dirname + '/bin/listen.exe');
    let confidence = config.confidence || '0.7';
    let grammar    = path.normalize(process.cwd() + '/data/grammar');
    let args       = ['-device', 'Microphone', '-grammar', grammar, '-confidence', confidence];

    if (!fs.existsSync(grammar)){
        fs.mkdirSync(grammar, 0744);
    }

    if (config.language){   args.push('-language');   args.push(config.language); }
    if (config.recognizer){ args.push('-recognizer'); args.push(config.recognizer); }
    if (config.hotword){    args.push('-hotword');    args.push(config.hotword); }
 
    let child = spawn(proc, args);
    child.stdout.on('data',  function(data){ spawn_StdOut(node, data, config, msg); })
    child.stderr.on('data',  function(data){ spawn_StdErr(node, data); })
    child.on(       'close', function(code){ spawn_Close (node, code); })
    child.on(       'error', function(err) { spawn_Close (node, err); console.log('Error: ', err); });

    PROCESS[node.id] = child;
    BUFFERS[node.id] = '';
}

const spawn_StdOut = (node, data, config, msg) => {

    BUFFERS[node.id] += data.toString('utf8'); 
    let buffer = BUFFERS[node.id];

    let end = buffer.indexOf('</JSON>')
    if (end < 0){ return true; }

    let start = buffer.indexOf('<JSON>')
    if (start < 0){ return true; }

    let json   = buffer.substring(start + 6, end);
    BUFFERS[node.id] = buffer.substring(end   + 7);

    try { json = JSON.parse(json); } catch(ex){ console.log('Parsing Error:', ex); return; }
    json.buffer = Buffer.from(json.base64, 'base64');

    msg = msg || {}
    helper.setByString(msg, config.output || 'payload', json);
    node.send(msg);
}

const spawn_StdErr = (node, data) => {
    node.warn('Error in process "listen.exe" for node '+ node.id + ' : ' + data)
}

const spawn_Close = (node, code) => {
    node.warn('Process "listen.exe" closed with ('+ code + ') for node '+ node.id)
    PROCESS[node.id] = undefined;
    BUFFERS[node.id] = undefined;
}