// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("random", register, {});
}

let COUNTER = [];
const input = (node, data, config) => {

    const randomKey = 'rand_' + node.id.replace('.', '_');

    let out  = new Array(parseInt(config.outputs));
    let scope = config.scope || 'msg';

    // 1. Scope: Global
    if (scope === 'global') {
        // Increment counter
        console.log(COUNTER);

        if (COUNTER.length === 0){
            // Complete the array with the outputs
            for (let i=0; i < config.outputs ; i++) COUNTER.push(i);
            // Shuffle the outputs
            shuffle(COUNTER);
        }
        out[COUNTER.pop()] = data;
        return node.send(out);
    }

    // 2. Scope flow
    let rand = Math.round(Math.random() * (out.length-1));
    let _tmp = data._tmp = data._tmp || {};

     // 3. Scope User
    if (scope === 'user'){
        data.user = data.user || {};
        _tmp = data.user._tmp = data.user._tmp ||{};
    } 

     // Get array
    let arr = _tmp[randomKey] || [] ;

    // Reset the array
    if (arr.length === 0) {
        for (let i=0; i < config.outputs ; i++) arr.push(i);
        shuffle(arr);
    } 

    out[arr.pop()] = data;
    _tmp[randomKey] = arr;
    return node.send(out);
}

const shuffle = (a) => {
    for (let i = a.length; i; i--) {
        let j = Math.floor(Math.random() * i);
        [a[i - 1], a[j]] = [a[j], a[i - 1]];
    }
}