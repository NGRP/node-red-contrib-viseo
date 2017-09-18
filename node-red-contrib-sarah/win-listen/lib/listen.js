const fs      = require('fs');
const path    = require('path');
const spawn   = require('child_process').spawn;
const killPID = require('tree-kill');
let LISTEN    =  __dirname + '/../bin/listen.exe';

let PIDS    = { }
let BUFFERS = { }

const kill = exports.kill = (id) => {
    
    let pid = PIDS[id]; 
    if (!pid){ return; }
    console.log('@@@ Killing ['+ id + '] PID:', pid)
    try { killPID(pid); } catch(ex){ console.log('Kill Error:',ex) }
    PIDS[id] = undefined;
    BUFFERS[id] = undefined;
}

const stdErr = exports.stdErr = (id, data, logback) => {
    logback(data.toString('utf8'))
}

const close = exports.close = (id, code, logback) => {
    logback('@@@ Process "listen.exe" closed with ('+ code + ') for ID '+ id + ' pid: ' + PIDS[id])
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
    let child = spawn(proc, args); logback('Starting: ' + proc + ' ' + args.join(' '));
    child.stdin.setEncoding('utf-8');
    child.stdout.on('data',  (data) => { handleBuffer(id, data, callback); })
    child.stderr.on('data',  (data) => { stdErr(id, data, console.log); })
    child.on(       'close', (code) => { close (id, code, console.log); })
    child.on(       'error', (err)  => { close (id, err,  console.log); });

    // store process
    console.log('@@@ Starting Process', id, child.pid)
    PIDS[id] = child.pid;
    BUFFERS[id] = '';
}

const handleBuffer = (id, data, callback) => {

    BUFFERS[id] += data.toString('utf8'); 
    let buffer = BUFFERS[id];

    let end = buffer.indexOf('</JSON>')
    if (end < 0){ return true; }

    let start = buffer.indexOf('<JSON>')
    if (start < 0){ return true; }

    let json    = buffer.substring(start + 6, end);
    BUFFERS[id] = buffer.substring(end   + 7);

    try { json  = JSON.parse(json); } catch(ex){ console.log('Parsing Error:', ex, json); return; }
    json.buffer = Buffer.from(json.base64, 'base64');

    callback(json);
}
