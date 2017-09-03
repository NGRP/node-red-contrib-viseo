const fs     = require('fs');
const path   = require('path');
const spawn  = require('child_process').spawn;

let LISTEN   =  __dirname + '/../bin/listen.exe';

let PROCESS = { }
let BUFFERS = { }

const kill = exports.kill = (id) => {
    let child = PROCESS[id];
    if (!child){ return; }

    try { child.kill(); } catch(ex){ console.log(ex) }
    PROCESS[id] = undefined;
    BUFFERS[id] = undefined;
}

const stdErr = exports.stdErr = (id, data, logback) => {
    logback('Error in process "listen.exe" for ID '+ id + ' : ' + data)
}

const close = exports.close = (id, code, logback) => {
    logback('Process "listen.exe" closed with ('+ code + ') for ID '+ id)
    PROCESS[id] = undefined;
    BUFFERS[id] = undefined;
}

const start = exports.start = (id, options, callback, logback) => {

    // kill previous process
    kill(id);

    if (!options.grammar) return;
    let grammar    = path.normalize(options.grammar);
    let proc       = path.normalize(options.proc    || LISTEN);
    let confidence = options.confidence || '0.7';

    // create grammar directory
    if (!fs.existsSync(grammar)){
        fs.mkdirSync(grammar, 0744);
    }

    // build arguments
    let args = ['-device', 'Microphone', '-grammar', grammar, '-confidence', confidence];
    if (options.language){   args.push('-language');   args.push(options.language); }
    if (options.recognizer){ args.push('-recognizer'); args.push(options.recognizer); }
    if (options.hotword){    args.push('-hotword');    args.push(options.hotword); }
 
    // run process
    let child = spawn(proc, args);
    child.stdout.on('data',  (data) => { handleBuffer(id, data, callback); })
    child.stderr.on('data',  (data) => { stdErr(id, data, logback); })
    child.on(       'close', (code) => { close (id, code, logback); })
    child.on(       'error', (err)  => { close (id, err,  logback); });

    // store process
    PROCESS[id] = child;
    BUFFERS[id] = '';
}

const handleBuffer = (id, data, callback) => {

    BUFFERS[id] += data.toString('utf8'); 
    let buffer = BUFFERS[id];

    let end = buffer.indexOf('</JSON>')
    if (end < 0){ return true; }

    let start = buffer.indexOf('<JSON>')
    if (start < 0){ return true; }

    let json   = buffer.substring(start + 6, end);
    BUFFERS[id] = buffer.substring(end   + 7);

    try { json = JSON.parse(json); } catch(ex){ console.log('Parsing Error:', ex); return; }
    json.buffer = Buffer.from(json.base64, 'base64');

    callback(json);
}
