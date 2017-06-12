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

exports.emitAsync  = (type, data, node, config, callback) => {

    let listeners = emitter.listeners(type)
    if (!listeners || listeners.length == 0){
        return callback(data);
    }

    data._tmp = data._tmp || {}
    data._tmp['event_emitter'] = { callback : callback, config : config };   // Only one in a flow otherwise might loose it
    emitter.emit(type, data, node, config);
}