
const botmgr   = require('node-red-viseo-bot-manager');
const helper   = require('node-red-viseo-helper');


module.exports = function(RED) {

    const register = function(config) {
        RED.nodes.createNode(this, config);

        let node = this;
        node.prompt = true;

        start(RED, node, config);

        this.on('input', (data) => {
            input(node, data, config);
        });
        
        this.on('close', (done) => {
            stop(done);
        });
           
    }

    RED.nodes.registerType("node-bot-transaction", register, {});

}


const start = (RED, node, config) => {

};

const input = (node, data, config) => {

    let convId = botmgr.getConvId(data)

    // Prepare the prompt
    if (node.prompt){
        botmgr.delayCallback(convId, (prompt) => {
            data.prompt = prompt
            node.send(data)
        })

    }

    // Retrieve replies
    let reply = buildReply(node, data, config);
    if (!reply){ 
        node.send(data)
        return;
    }
    
    // Emit reply message
    data.reply = [ reply ];
    helper.emitAsyncEvent('before-reply', node, data, config, (beforeData) => {
        helper.emitAsyncEvent('reply', node, beforeData, config, (newData) => {
            helper.emitAsyncEvent('replied', node, newData, config, () => {})
            if (node.prompt) return; 
            node.send(data)
        });
    });
};

const buildReply = (node, data, config) => {

    let reply = {
        type: "transaction",
        intent: config.intent,
        prompt: node.prompt
    }

    if(config.intent == "confirm") {
        reply.orderItems = helper.getByString(data, config.orderItems, [])
        reply.orderId = helper.getByString(data, config.orderId, config.orderId)
        reply.merchant = config.merchant
    }

    if(config.intent == "receipt") {
        let receipt = {
            'carrierId': helper.getByString(data, config.carrierId, config.carrierId),
            'orderState': config.receiptStatus,
            'orderStateName': config.receiptStatusName,
            'orderId': helper.getByString(data, config.orderId, config.orderId),
            'orderActions': helper.getByString(data, config.orderActions, [])
        }
        if(receipt.carrierId !== undefined) {
            data._receipt = receipt //save to be sent along the next message
        }

        return;
    }


    return reply;
}


const stop = (done) => {
    //nothing to do.
    done();
};