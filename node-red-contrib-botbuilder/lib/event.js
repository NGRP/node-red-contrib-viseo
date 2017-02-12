const EventEmitter = require('events');

class NodeEmitter extends EventEmitter {}
const emitter = new NodeEmitter();

exports.emit  = (type, data, node, config) => {
    emitter.emit(type, data, node, config);
}

exports.listen  = (type, callback) => {
    emitter.addListener(type, callback);
}

exports.removeListener =  (type, callback) => {
    emitter.removeListener(type, callback);
}