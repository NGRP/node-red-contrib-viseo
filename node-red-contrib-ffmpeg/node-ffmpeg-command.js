// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------
var helper  = require('node-red-viseo-helper');
var spawn =   require('child_process').spawn;
var exec =    require('child_process').exec;
var isUtf8 =  require('is-utf8');
var ffmpegPath = "";

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        this.activeProcesses = {};
        let node = this;

        this.on('input', (data)  => { input(node, data, config)  });
        this.on('close', () => { close(node) });
    }
    RED.nodes.registerType("ffmpeg-command", register, {});
}

function cleanup (node, p) { 
    node.activeProcesses[p].kill();
}

async function input (node, msg, config) {

    if (!ffmpegPath) {
        try {
            result = await exec('which ffmpeg');
            ffmpegPath = true;
        } catch (err) {
            try {
                result = await exec('where.exe ffmpeg');
                ffmpegPath = true;
            }
            catch (err) {
                return node.error("ffmpeg was not found. Please intall it and make sure it is part of the PATH.");
            }
        }
    }

    let command = config.cmd,
        useSpawn = (config.spawn === "true") ? true : false;

    if (config.cmdType !== "str") {
        let loc = (config.cmdType === 'global') ? node.context().global : msg;
        command = helper.getByString(loc, command);
    }
    command = command.replace(/^ffmpeg(\.exe)+ /g, '');
    command = 'ffmpeg ' + command;

    let child;
    if (useSpawn) {
        command = command.match(/(?:[^\s"]+|"[^"]*")+/g).map((a) => {
            if (/^".*"$/.test(a)) return a.slice(1,-1);
            else return a;
        });

        var cmd = command.shift();
        child = spawn(cmd, command);

        node.status({fill:"blue", shape:"dot", text:"pid:" + child.pid});
        var unknownCommand = (child.pid === undefined);

        node.activeProcesses[child.pid] = child;

        child.stdout.on('data', function (data) {
            if (node.activeProcesses.hasOwnProperty(child.pid) && node.activeProcesses[child.pid] !== null) {
                result = {stderr: null, stdout: null, error: null};
                if (isUtf8(data)) result.stdout = data.toString();
                else result.stdout = data;

                helper.setByString(msg, config.output || "payload", result);
                node.send(msg);
            }
        });
        child.stderr.on('data', function (data) {
            if (node.activeProcesses.hasOwnProperty(child.pid) && node.activeProcesses[child.pid] !== null) {
                result = {stderr: null, stdout: null, error: null};
                if (isUtf8(data)) result.stderr = data.toString();
                else result.stderr = Buffer.from(data);

                helper.setByString(msg, config.output || "payload", result);
                node.send(msg);
            }
        });
        child.on('close', function (code,signal) {
            if (unknownCommand || (node.activeProcesses.hasOwnProperty(child.pid) && node.activeProcesses[child.pid] !== null)) {
                delete node.activeProcesses[child.pid];
                if (child.tout) clearTimeout(child.tout);

                result = {stderr: null, stdout: {code:code, signal: signal}, error: null};

                if (!code || code === 0) node.status({});
                else if (code < 0)   node.status({fill:"red",shape:"dot",text:"rc:"+code});
                else node.status({fill:"yellow",shape:"dot",text:"rc:"+code});

                helper.setByString(msg, config.output || "payload", result);
                node.send(msg);
            }
        });
        child.on('error', function (code) {
            if (child.tout) { clearTimeout(child.tout); }
            delete node.activeProcesses[child.pid];
            if (node.activeProcesses.hasOwnProperty(child.pid) && node.activeProcesses[child.pid] !== null) {
                result = {stderr: null, stdout: null, error: { code:error.code, message: error.message }};
                helper.setByString(msg, config.output || "payload", result);
                node.error(error);
                node.send(msg);
            }
        });
    }
    else {
        child = exec(command, { encoding:'binary', maxBuffer:10000000 }, function (error, stdout, stderr) {
            var result = {stderr: stderr, stdout: stdout, error: error}
                result.stdout = Buffer.from(stdout, "binary");

            if (isUtf8(result.stdout)) result.stdout = result.stdout.toString();
            node.status({});
            
            if (error) {
                result.error = { code:error.code, message: error.message };
                if (error.signal) result.error.signal = error.signal;
                if (!error.code) node.status({fill:"red", shape:"dot", text:"killed"});
                else node.status({fill:"red",shape:"dot",text:"error:"+error.code});
                node.error(error);
            }
            else {
                if (!result.stdout) result.stdout = { code: 0};
                if (!result.stderr) result.stderr = { code: 0};
            }
            
            helper.setByString(msg, config.output || "payload", result);
            node.send(msg);

            if (child.tout) clearTimeout(child.tout);
            delete node.activeProcesses[child.pid];
        });
        node.status({fill: "blue", shape: "dot", text: "pid:" + child.pid});
        child.on('error',function() {});
        node.activeProcesses[child.pid] = child;
    }
}

function close(node) {
    for (var pid in node.activeProcesses) {
        if (node.activeProcesses.hasOwnProperty(pid)) {
            if (node.activeProcesses[pid].tout) { clearTimeout(node.activeProcesses[pid].tout); }
            var process = node.activeProcesses[pid];
            node.activeProcesses[pid] = null;
            process.kill();
        }
    }
    node.activeProcesses = {};
    node.status({});
}


