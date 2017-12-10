const helper         = require('node-red-viseo-helper');
const Eth            = require('ethjs')
const SignerProvider = require('ethjs-provider-signer');
const sign           = require('ethjs-signer').sign;
const MAX_GAS        = 300000

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

        if (config.contract)  { node.contract = RED.nodes.getNode(config.contract); }

        if (node.network){
            this.on('input', (data)  => { input(node, data, config) });
        }
    }
    RED.nodes.registerType("ethjs-transaction", register, {});
}

const input = (node, data, config) => {

    // Build eth object to sign transaction
    let eth = getEth(node.network.url, node.wallet.credentials.keyPrivate, node.wallet.keyPublic);

    // If there is a Contract, apply the contract
    if (node.contract) {
        let txObject = { from: node.wallet.keyPublic, gas: MAX_GAS }
        findContract(eth, node.contract, txObject, (err, contract) => { 
            if (err){ return node.warn(err);  }
            data.contract = contract;

            let func = contract[config.apiCall]
            let aArgs = [];
            if (config.param1){ aArgs.push(helper.resolve(config.param1, data, config.param1)) }
            if (config.param2){ aArgs.push(helper.resolve(config.param2, data, config.param2)) }
            if (config.param3){ aArgs.push(helper.resolve(config.param3, data, config.param3)) }
            
            func.apply(this, aArgs).then((result) => {
                
                let cb = (err, t) => { 
                    if (err) return node.warn(err);
                    let value = config.unit ? Eth.fromWei(result, config.unit) : result
                    helper.setByString(data, config.output || 'payload', value)
                    node.send(data);
                }
    
                if (!config.wait){ return cb() }
                waitTransaction(eth, result, cb)

            }).catch((error) => { node.warn(error); });
        })
        return;
    }

    // Otherwise call ethereum transaction 
    let address = node.wallet.keyPublic
    if (config.address){
        address = helper.getByString(data, config.address, config.address);
    }

    let wei = undefined;
    if (config.ether){
        wei = helper.getByString(data, config.ether, config.ether);
    }
    
    // Balance or Transaction ?
    if (!wei){
        let isAccount = address.length <= 42
        let promise = isAccount ? eth.getBalance(address)
                                : eth.getTransactionByHash(address)

        promise.then((result) => { 
            result = isAccount ? Eth.fromWei(result, 'wei') : result
            helper.setByString(data, config.output || 'payload', result)
            node.send(data);
        }).catch((err) => { node.warn(err) })
        
    } else { 

        eth.sendTransaction({
            from: node.wallet.keyPublic,
            to:   address,
            value: wei, gas: MAX_GAS, data: '0x',
        }).then((transAddr) => { 

            let cb = (err, result) => {
                if (err) return node.warn(err);
                helper.setByString(data, config.output || 'payload', result)
                node.send(data);
            }

            if (!config.wait){ return cb() }
            waitTransaction(eth, transAddr, cb)

        }).catch((err) => { node.warn(err) })

    }
}

// ------------------------------------------
//  HELPERS
// ------------------------------------------

const getEth = (networkURL, keyPrivate, keyPublic) => {
    let txConfig = {}
    if (keyPrivate){ txConfig.signTransaction = (rawTx, cb) => cb(null, sign(rawTx, keyPrivate)) }
    if (keyPublic) { txConfig.accounts = (cb) => cb(null, [keyPublic]) }
    const provider = new SignerProvider(networkURL, txConfig);
    return new Eth(provider);
}

const findContract = (eth, contract, txObject, callback) => {

    // Build contract
    const abi      = JSON.parse(contract.abi);
    const bytecode = contract.bin;

    const Contract = eth.contract(abi, bytecode, txObject);
    let _contract = undefined;

    // Retrieve from contract Address
    if (contract.address){
        _contract = Contract.at(contract.address);
        return callback(undefined, _contract);
    }

    // Retrieve from contract Transaction
    else if (contract.transaction){
        eth.getTransactionReceipt(contract.transaction).then((result) => { 
            
            console.log('Retrieve contract from transaction: ' + contract.address + ' is ' + result.contractAddress)
            _contract = Contract.at(result.contractAddress);
            callback(undefined, _contract);
    
        }).catch((error) => { callback(error); });
    }
}

const waitTransaction = (eth, address, callback, _max) => {
    if (_max === 0){ return callback('Timeout waiting transaction') }
    if (_max === undefined) { max = 10; }
    eth.getTransactionByHash(address)
       .then((t) => {
           if (t.blockNumber){ return callback(undefined, t); }
           setTimeout(() => { waitTransaction(eth, address, callback, _max-1) }, 1000)
       })
       .catch((err) => { return callback(err) })
}