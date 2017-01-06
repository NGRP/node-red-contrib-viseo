
// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


let stdout = undefined;
let stderr = undefined;
module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        stdout = function(data){ node.log(data.toString()); }
        stderr = function(data){ node.log(data.toString()); }
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("thumbnail", register, {});
}

const input = (node, data, config) => {
    let input = data.payload;
    let output1 = input.substring(0, input.lastIndexOf('.')) + '_01.jpg';
    let output2 = output1.replace('_01.jpg','_%02d.jpg');
    convertThumb(config.ffmpeg, input, output2, config.width, function(){
        data.payload = output1;
        node.send(data);
    });
}


const spawn  = require('child_process').spawn;

/*
const convertThumb  = exports.convertMP4 = function(ffmpeg, input, output, width, callback){
    let scale = 'scale='+width+':-1';
    let args  = ['-y','-i', input, '-vf', 'select=gt(scene\,0.4)', '-frames:v', '5', '-vsync', 'vfr', '-vf', 'fps=fps=1/600', '-vf', scale, output];  
    
    const child = spawn(ffmpeg, args);
    child.stdout.on('data', stdout);
    child.stderr.on('data', stderr);
    child.on('exit', callback);
}*/

const convertThumb  = exports.convertMP4 = function(ffmpeg, input, output, width, callback){
    let scale = 'scale='+width+':-1';
    let args  = ['-y','-i', input, '-vf', 'select=eq(pict_type\\,I),'+scale, '-vsync', 'vfr', output];  
    console.log(ffmpeg, args);
    
    const child = spawn(ffmpeg, args);
    child.stdout.on('data', stdout);
    child.stderr.on('data', stderr);
    child.on('exit', callback);
}
