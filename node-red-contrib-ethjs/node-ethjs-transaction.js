const helper         = require('node-red-viseo-helper');
const Eth            = require('ethjs')
const SignerProvider = require('ethjs-provider-signer');
const sign           = require('ethjs-signer').sign;

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        node.status({});

        if (!config.network)  { node.status({fill:"red", shape:"ring", text: 'Missing network'}); }
        else                  { node.network = RED.nodes.getNode(config.network); }
        
        if (!config.wallet)   { node.status({fill:"red", shape:"ring", text: 'Missing wallet'}); }
        else                  { node.wallet = RED.nodes.getNode(config.wallet); }

        if (!config.contract) { node.status({fill:"red", shape:"ring", text: 'Missing contract'}); }
        else                  { node.contract = RED.nodes.getNode(config.contract); }

        if (node.network && node.wallet && node.contract){
            start(node, RED, config);
            this.on('input', (data)  => { input(node, data, config) });
        }
    }
    RED.nodes.registerType("ethjs-transaction", register, {});
}

let eth = undefined;
const start = (node, RED, config) => {
    let txConfig = {}
    if (node.wallet.credentials.keyPrivate){
        txConfig.signTransaction = (rawTx, cb) => cb(null, sign(rawTx, node.wallet.credentials.keyPrivate))
    }
    if (node.wallet.keyPublic){
        txConfig.accounts = (cb) => cb(null, [node.wallet.keyPublic])
    }

    try {
        const provider = new SignerProvider(node.network.url, txConfig);
        eth = new Eth(provider);
    } catch(ex){ 
        node.status({fill:"red", shape:"ring", text: ex.message });
    }
}

const input = (node, data, config) => {
    findContract(node, data, config, (err, contract) => { 
        if (err){ return node.warn(err);  }
        data.contract = contract;

        let func = contract[config.apiCall]
        let aArgs = [];
        if (config.param1){ aArgs.push(helper.resolve(config.param1, data, config.param1)) }
        if (config.param2){ aArgs.push(helper.resolve(config.param2, data, config.param2)) }
        if (config.param3){ aArgs.push(helper.resolve(config.param3, data, config.param3)) }
        
        console.log(aArgs)


        func.apply(this, aArgs).then((result) => {
            data.result = result[0]
            if (config.unit){
                data.result = Eth.fromWei(data.result, config.unit);
            }
            node.send(data);
        }).catch((error) => { node.warn(error); });
    })
}

const findContract = (node, data, config, callback) => {

    // Build contract
    const abi      = JSON.parse(node.contract.abi);
    const bytecode = node.contract.bin;
    const txObject = { };

    const Contract = eth.contract(abi, bytecode, txObject);
    let contract = undefined;

    // Retrieve from contract Address
    if (node.contract.address){
        contract = Contract.at(node.contract.address);
        return callback(undefined, contract);
    }

    // Retrieve from contract Transaction
    else if (node.contract.transaction){
        eth.getTransactionReceipt(node.contract.transaction).then((result) => { 
            
            node.warn('Retrieve contract from transaction: ' + node.contract.address + ' is ' + result.contractAddress)
            contract = Contract.at(result.contractAddress);
            callback(undefined, contract);
    
        }).catch((error) => { callback(error); });
    }
}