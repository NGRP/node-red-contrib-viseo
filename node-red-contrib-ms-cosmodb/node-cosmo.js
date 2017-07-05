const MongoClient = require('mongodb').MongoClient
const helper  = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        start(node, config);
        this.on('input', (data)  => { input(node, data, config)  });
        this.on('close', (cb)    => { stop(node, cb, config)  });
    }
    RED.nodes.registerType("cosmodb", register, {});
}

let db = undefined
const stop = (node, cb, config) => {
    node.status({fill:"red", shape:"ring", text: ''});
    if (!db) return cb();

    db.close();
    db = undefined;
    cb();
}

const start = (node, config) => {
    node.status({fill:"red", shape:"ring", text: '' });
    if (!config.url) {
        node.status({fill:"red", shape:"ring", text: 'Missing CosmoDB URL' });
        return node.warn('Missing CosmoDB URL');
    }

    MongoClient.connect(config.url, (err, database) => {
        if (err) {
            node.status({fill:"red", shape:"ring", text: err });
            return node.warn(err)
        }
        console.log("Connected successfully to server");
        node.status({fill:"green", shape:"dot", text:"connected"});
        db = database;
    });
}

const input = (node, data, config) => {
    // Get the documents collection
    let collection = db.collection('documents');

    // Insert some documents
    collection.insertMany([
        {a : 1}, {a : 2}, {a : 3}
    ], (err, result) => {
        if (err) return node.warn(err)
        console.log(result.result.n);
        console.log(result.ops.length);
        console.log("Inserted 3 documents into the collection");
    });

}