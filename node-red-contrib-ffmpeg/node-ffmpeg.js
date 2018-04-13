
// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

const helper  = require('node-red-viseo-helper');
const child   = require('child_process');
const path    = require('path');
const fs      = require('fs');
const toArray = require('stream-to-array')

let stdout = undefined;
let stderr = undefined;

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        stderr = function(data){ node.log(data.toString()); }
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("ffmpeg", register, {});
}

const input = (node, data, config) => {

    let input  = config.input,
        output = config.output,
        ffmpeg = config.ffmpeg,
        action = config.action || "cut",
        width =  config.width || 360,
        cmd =    config.cmd,
        tstart = config.tstart,
        duration = config.duration;

    if (config.inputType !== 'str') {
        let loc = (config.inputType === 'global') ? node.context().global : data;
        input = helper.getByString(loc, input);
    }
    if (config.outputType !== 'str') {
        let loc = (config.outputType === 'global') ? node.context().global : data;
        output = helper.getByString(loc, output);
    }
    if (config.ffmpegType !== 'str') {
        let loc = (config.ffmpegType === 'global') ? node.context().global : data;
        ffmpeg = helper.getByString(loc, ffmpeg);
    }

    // --------- Ensure path
    input = path.normalize(input);
    output = path.normalize(output);
    ffmpeg = path.normalize(ffmpeg);
    helper.mkpathsync(path.dirname(input));
    helper.mkpathsync(path.dirname(output));
    helper.mkpathsync(path.dirname(ffmpeg));

    // --------- Free command line
    if (action === "cmd" && config.cmdType !== 'str') {
        let loc = (config.cmdType === 'global') ? node.context().global : data;
        cmd = helper.getByString(loc, cmd);
    }
    cmd = cmd.replace(/{input}/ig, input);
    cmd = cmd.replace(/{output}/ig, output);
    cmd = helper.resolve(cmd, data, '');

    // --------- Gif or thumbnail
    if ((action === "gif" || action === "thumb") && config.widthType !== "num") {
        let loc = (config.widthType === 'global') ? node.context().global : data;
        width = helper.getByString(loc, width);
    }
    width = String(width);

    // --------- Cut stream
    if (action === "cut") {
        if (config.tstartType !== 'str'  && config.tstartType !== "num") {
            let loc = (config.tstartType === 'global') ? node.context().global : data;
            tstart = helper.getByString(loc, tstart);
        }
        tstart = String(tstart);
        if (config.durationType !== 'str'  && config.durationType !== "num") {
            let loc = (config.durationType === 'global') ? node.context().global : data;
            duration = helper.getByString(loc, duration);
        }
        duration = String(duration);
    }

    // --------------------------------------------------- //

    let scale = 'scale=' + width + ':-1';
    let args  = [];

    if    (action === "thumb") args  = ['-loglevel','panic','-y','-i', input, '-vf', 'select=eq(pict_type\\,I),' + scale, '-vsync', 'vfr', output];  
    else if (action === "gif") args  = ['-loglevel','panic','-y','-i', input, '-r', '5', '-vf', scale, output]; 
    else if (action === "cut") args  = ['-loglevel','panic','-y','-i', input, '-ss', tstart, '-t', duration, '-acodec','copy', output]; 
    else args = cmd.split(' ');

    child.spawn(ffmpeg, args)
    .on('exit', function() {

        var readableStream  = fs.createReadStream(output);
        toArray(readableStream).then(function (parts) {
            var buffers = [];
    
            for (var i = 0; i < parts.length; ++i) {
            var part = parts[i];
            buffers.push((part instanceof Buffer) ? part : new Buffer(part));
            }
    
            data.payload = {
                args: args,
                input: input,
                output: output,
                buffer: Buffer.concat(buffers)
            };
            node.send(data);
        })

        
    }).stderr.on('data', stderr);
}