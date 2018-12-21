

const helper  = require('node-red-viseo-helper')
const botmgr  = require('node-red-viseo-bot-manager')


const DialogflowApp = require('actions-on-google').DialogflowApp

const CARRIER = "GoogleHome"

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.status({fill:"red", shape:"ring", text: 'Deprecated'});
        node.error("This package is old, please install and use node-red-contrib-viseo-dialogflow instead of node-red-contrib-viseo-api-ai.")

        start(RED, node, config);
        this.on('close', (done)  => { stop(node, config, done) });

    }
    RED.nodes.registerType("api-ai-server", register);
}

let LISTENERS_REPLY = {};
let LISTENERS_PROMPT = {};
const start = (RED, node, config) => {  

    // Start HTTP Route
    let uri = '/api-ai-server/';
    RED.httpNode.post (uri, (req, res, next) => { 
        receive(node, config, req, res); 
    });

    // Add listener to reply
    let listenerReply = LISTENERS_REPLY[node.id] = (srcNode, data, srcConfig) => { reply(node, data, config) }
    helper.listenEvent('reply', listenerReply)

    let listenerPrompt = LISTENERS_PROMPT[node.id] = (srcNode, data, srcConfig) => { prompt(node, data, config) }
    helper.listenEvent('prompt', listenerPrompt)

}

const stop = (node, config, done) => {
    let listenerReply = LISTENERS_REPLY[node.id]
    helper.removeListener('reply', listenerReply)

    let listenerPrompt = LISTENERS_PROMPT[node.id]
    helper.removeListener('prompt', listenerPrompt)
    done();
}

// ------------------------------------------
//  LRU REQUESTS
// ------------------------------------------

const LRUMap = require('./lru.js').LRUMap;
const uuidv4 = require('uuid/v4');

// Should it be init in start() ?
let _CONTEXTS    = new LRUMap(CONFIG.server.contextLRU || 10000);
let _CONTEXT_KEY = 'contextId';

const getMessageContext = (message) => {
    if (message === undefined) return;

    let uuid    = helper.getByString(message, _CONTEXT_KEY);
    let context = _CONTEXTS.get(uuid);
    if (!context) {
        context = {};
        let convId = helper.getByString(message, 'address.conversation.id');
              uuid = convId + '-' + uuidv4();
              helper.setByString(message, _CONTEXT_KEY, uuid);
        _CONTEXTS.set(uuid, context);
    }
    return context;
}

// ------------------------------------------
//  RECEIVE
// ------------------------------------------

const receive = (node, config, req, res) => { 
    let json = req.body
    // try { json = JSON.parse(json); } catch (ex) { console.log('Parsing Error', ex, json) }

    let app = new DialogflowApp({request: req, response: res});

    if(json.originalRequest == undefined) {
        console.log(json);
        node.warn('Empty request received');
        return;
    }

    let data = botmgr.buildMessageFlow({ message : json }, {
        userLocale: 'message.originalRequest.data.user.locale',
        userId:     'message.originalRequest.data.user.userId', 
        convId:     'message.originalRequest.data.conversation.conversationId',
        payload:    'message.originalRequest.data.inputs[0].rawInputs[0].query',
        inputType:  'message.originalRequest.data.inputs[0].rawInputs[0].inputType',
        source:     CARRIER
    })

    data.user.accessToken = data.message.originalRequest.data.user.accessToken;

    let context = getMessageContext(data.message)
    context.DialogflowApp = app

    if(json.originalRequest.data.inputs[0].arguments !== undefined && json.originalRequest.data.inputs[0].arguments.length > 0) {
        data.message.text = json.originalRequest.data.inputs[0].arguments[0].textValue
    }

    // Handle Prompt
    let convId  = botmgr.getConvId(data)
    if (botmgr.hasDelayedCallback(convId, data.message)) return;

    // Trigger received message
    helper.emitEvent('received', node, data, config);
    node.send([data, data]);

}

// ------------------------------------------
// PROMPT
// ------------------------------------------

const prompt = (node, data, config) => {

    const next = function() {
        if (helper.countListeners('prompt') === 1) {
            helper.fireAsyncCallback(data);
        }
    }

    // Assume we send the message to the current user address
    let address = botmgr.getUserAddress(data)
    if (!address || address.carrier !== CARRIER) return next();

    //GEO LOCATION
    if(
        data.prompt.originalRequest.data.device && 
        data.prompt.originalRequest.data.device.location
    ) {

        data.user.location = data.prompt.originalRequest.data.device.location;
    }

    //IDENTITY
    if(data.prompt.originalRequest.data.user.profile) {
        //EMAIL
        if(data.prompt.originalRequest.data.user.profile.email) {
            data.user.profile.email = data.prompt.originalRequest.data.user.profile.email;
        }
        //NAME
        if(data.prompt.originalRequest.data.user.profile.displayName) {
            data.user.profile.displayName = data.prompt.originalRequest.data.user.profile.displayName;
            data.user.profile.givenName = data.prompt.originalRequest.data.user.profile.givenName;
            data.user.profile.familyName = data.prompt.originalRequest.data.user.profile.familyName;
        }
    }

    next();
}


// ------------------------------------------
//  REPLY
// ------------------------------------------

const reply = (node, data, config) => { 
    try {

        let address = botmgr.getUserAddress(data)
        if (!address || address.carrier !== CARRIER) return false;

        // The address is not used because we reply to HTTP Response
        let context = data.prompt ? getMessageContext(data.prompt)
                                  : getMessageContext(data.message)
        let app = context.DialogflowApp

        // Building the message
        if(performAction(app, data.reply) === false) {

            let message = getMessage(app, data.reply);

            if (!message) return false;
            if(message.expectUserResponse == false) {
                app.tell(message.data);
            } else {
                app.ask(message.data);
            }
        }
    
        // Trap the event in order to continue
        helper.fireAsyncCallback(data);

    } catch(ex){ node.warn(ex) }
}

// ------------------------------------------
//  MESSAGES
//  https://github.com/api-ai/fulfillment-webhook-nodejs/blob/master/functions/index.js
// ------------------------------------------

// https://api.ai/docs/fulfillment#response
const getMessage = exports.getMessage = (app, replies) => {

    if(!replies) {
        return
    }

    let msg = {}

    msg.expectUserResponse = false
    for (let reply of replies){ 
        if (reply.prompt) { 
            msg.expectUserResponse = true 
        }
    }

    let reply = replies[0]
    
    msg.data = app.buildRichResponse()


    if(reply.receipt !== undefined) {

        
        let orderUpdate = app.buildOrderUpdate(reply.receipt.orderId, false)
                .setOrderState(reply.receipt.orderState, reply.receipt.orderStateName)
                .setInfo(app.Transactions.OrderStateInfo.RECEIPT, {
                    userVisibleOrderId: reply.receipt.orderId
                })
                .setUpdateTime(Math.floor(Date.now()/1000))
            
        for(let action of reply.receipt.orderActions) {
            orderUpdate.addOrderManagementAction(action.type, action.title, action.url)
        }
                
        msg.data.addOrderUpdate(orderUpdate)
    
/*
        msg.data.items.push({
            userVisibleOrderId: reply.receipt.orderId,
            orderState: { state: reply.receipt.orderState, label: reply.receipt.orderStateName },
            lineItemUpdates: {},
            updateTime: (new Date()).toISOString(),
            orderManagementActions: [],
            userNotification: undefined,
            totalPrice: undefined,
            receipt: { userVisibleOrderId: '069b3a24fcc3142f820d293fa7d99d57' } })
*/
    }



    let simpleResponse = {}
    
    // SimpleResponse (always one at first)
    // https://developers.google.com/actions/reference/rest/Shared.Types/AppResponse#simpleresponse
    let text = reply.text || reply.quicktext

    if((!text) && reply.title) {
        text = reply.title + ' ' + (reply.subtitle||'');
    }

    simpleResponse.displayText = text      // (optional) chat bubble 640 chars. max
    if (reply.speech === true){
        simpleResponse.speech = text // plain text exclusive with ssml
    } else {
        simpleResponse.speech = reply.speech // Structured spoken response to the user in the SSML format
    }


     // BasicCard
    // https://developers.google.com/actions/reference/rest/Shared.Types/AppResponse#BasicCard
    if (reply.type === 'media' || reply.type === 'card') {
        let item = {}
        let card = {}

        if (reply.title){      item.title    = reply.title }
        if (reply.subtitle){   item.subtitle = reply.subtitle }
        if (reply.text){       item.formattedText = reply.text }
        if (reply.quicktext){  item.formattedText = reply.quicktext }

        // Require an Image or formatedText
        if (reply.media || reply.attach) {

            card = app.buildBasicCard(item.formattedText)
                .setImage(reply.media ? helper.absURL(reply.media) : helper.absURL(reply.attach), item.title)
                .setImageDisplay('CROPPED')

        } else if (!item.formattedText){
            if (item.subtitle){
                item.formattedText = item.subtitle
                item.subtitle = undefined
            } else if (item.title) {
                item.formattedText = item.title
                item.title = undefined
            }

            card = app.buildBasicCard(item.formattedText)
                .setTitle(item.title)
                .setSubtitle(item.subtitle);
        }

        if (reply.buttons) {
            for (let btn of reply.buttons){
                
                if (btn.action !== 'openUrl') continue;
                card.addButton(btn.title, helper.absURL(btn.value))

                delete simpleResponse.displayText;
                break;
            }
        }

        msg.data.addBasicCard(card)        
    }


    msg.data.addSimpleResponse(simpleResponse)

    if (reply.type === 'quick'){
         // A unique key that will be sent back to the agent if this response is given.
        // https://developers.google.com/actions/reference/rest/Shared.Types/OptionInfo

        let suggestions = []
        for (let button of reply.buttons){

            if ("string" === typeof button) {
                suggestions.push(button)
               // btn.optionInfo = { key: button, synonyms: [button] }
            } else {
                suggestions.push(button.title)
                //btn.optionInfo = { key: button.value, synonyms: [button.title] }
            }
            // btn.description = ''
            // btn.image = ''
        }

        msg.data.addSuggestions(suggestions)

    }


    console.log(msg.data.items)
    
    return msg;

}

const performAction = (app, replies) => {

    // Carousel of cards
    if (replies.length > 1){

        let carousel = app.buildCarousel()

        for (let card of replies) {

            let item = {}

            item.title = card.title
            item.description = card.subtitle || ''
            if (card.attach){ 
                item.image = helper.absURL(card.attach) 
            }

            // A unique key that will be sent back to the agent if this response is given.
            // https://developers.google.com/actions/reference/rest/Shared.Types/OptionInfo
            item.optionInfo = { key: card.title, synonyms: [] }
            if (card.buttons){
                let button = card.buttons[0];
                if ("string" === typeof button) {
                    item.optionInfo.key = button
                } else {
                    item.optionInfo.key = button.value
                    item.optionInfo.synonyms.push(button.title)
                }
            }

            let optionitem = app.buildOptionItem(item.optionInfo.key, item.optionInfo.synonyms)
                .setTitle(item.title)
                .setDescription(item.description)

            if(item.image) {
                optionitem.setImage(item.image)
            }

            carousel.addItems(optionitem)
        }
        app.askWithCarousel(carousel)
        return true
    }

    let reply = replies[0]

    if (reply.type === 'quick') {

        let text = reply.text || reply.quicktext

        if((!text) && reply.title) {
            text = reply.title + ' ' + (reply.subtitle||'');
        }

        for (let button of reply.buttons){

            if(button.action === 'askLocation') {
                app.askForPermissions(text || '', ["DEVICE_PRECISE_LOCATION"])
                return true
                
            } else if(button.action === 'askIdentity') {

                app.fulfillPermissionsRequest_({
                    optContext: text || '',
                    permissions: ["NAME", "EAP_ONLY_EMAIL"]
                }, {
                    'state': app.state,
                    'data': app.data
                })

                return true
                
            }
        }
    }

    if (reply.type === 'signin'){

        app.askForSignIn()
        return true
    }

    if (reply.type === "transaction") {

        if(reply.intent == "confirm") {

            let items = []
            let totalPrice = 0
            for(let item of reply.orderItems) {
                items.push(app.buildLineItem(item.name, item.name.toLowerCase().replace(/\s/g, '_'))
                    .setPrice(app.Transactions.PriceType.ACTUAL, 'EUR', item.price)
                    .setQuantity(1)
                    .setType(app.Transactions.LineItemType.REGULAR)
                    .setImage(item.imageUrl, item.name)
                    .addSublines([item.description]))


                totalPrice += item.price
            }
            console.log(items)

            let order = app.buildOrder(reply.orderId+"") //must be string
                .setCart(app.buildCart().setMerchant(reply.merchant.toLowerCase().replace(/\s/g, '_'), reply.merchant)
                    .addLineItems(items)
                )
                .setTotalPrice(app.Transactions.PriceType.ESTIMATE, "EUR", totalPrice)

            let paymentInfo = {}

            if(totalPrice > 0) {
                paymentInfo = {
                    type: app.Transactions.PaymentType.ON_FULFILLMENT,
                    displayName: "Règlement en magasin"
                };
            }

            app.askForTransactionDecision(order, paymentInfo)


        } else if(reply.intent == "requirement_check") {

            app.askForTransactionRequirements();
        
        }
        
        return true;
    }


    return false

}