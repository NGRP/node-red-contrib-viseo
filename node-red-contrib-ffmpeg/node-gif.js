
// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


let stderr = undefined;
module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        stderr = function(data){ node.log(data.toString()); }
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("gif", register, {});
}

const input = (node, data, config) => {
    let input = data.payload;
    let output = input.substring(0, input.lastIndexOf('.')) + '.gif';
    convertGIF(config.ffmpeg, input, output, config.width, function(){
        data.payload = output;
        node.send(data);
    });
}


const child  = require('child_process');
const convertGIF  = exports.convertMP4 = function(ffmpeg, input, output, width, callback){
  let scale = 'scale='+width+':-1';
  let args  = ['-y','-i', input, '-r', '5', '-vf', scale, output];  
  console.log(ffmpeg, args);
  child.spawn(ffmpeg, args).on('exit', callback).stderr.on('data', stderr);
}