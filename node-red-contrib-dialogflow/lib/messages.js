const {dialogflow, NewSurface, SimpleResponse, Carousel, SignIn, TransactionDecision, TransactionRequirements, OrderUpdate, Button, BasicCard, Permission, Suggestions, Image, Confirmation} = require('actions-on-google');


class Message {

    constructor(replies) {
        this.expectUserResponse = this.needToWait(replies);
        this.messages = this.getMessages(replies);
    }

    needToWait(replies) {
        if (!replies || !replies.length || replies.length === 0) return false;
        for (let reply of replies) {
            if (reply.prompt) return true;
        }
        return false;
    }

    getMessages(replies) {
        if (!replies) return [];

        let messages = []
        if (isCaroussel(replies)) {
            let firstReply = replies.shift();
            let firstCarousselCard = buidSimpleMessage(firstReply);
            messages.push(firstCarousselCard);

            let caroussel = buildCaroussel(replies);
            messages.push(caroussel);
            return messages;
        }
        
        for (let reply of replies) {
            switch(reply.type) {
                case 'signin':
                    messages.push(new SignIn());
                    break;
                case 'confirm':
                    let text = reply.text;
                    messages.push(new Confirmation(text));
                    break;
                case 'transaction': 
                    let message = buildTransaction(reply);
                    if (message) messages.push(message);
                    break;
                case 'media':
                    messages.push(new Image({ url: helper.absURL(reply.media), alt: '[image]'}));
                    break;
                case 'card':
                    let options = cardOptions(reply)
                    if (options.image) options.display = 'CROPPED';
                    let basicCard = new BasicCard(options)
                    messages.push(basicCard);
                    break;
                case 'text':
                case 'quick':
                    messages.push(buidSimpleMessage(reply));
                    let suggestions = getSuggestions(reply);
                    for (let suggestion of suggestions) {
                        messages.push(suggestion);
                    }
                    break;
                case 'handoff':
                    messages.push(new NewSurface({context: reply.reason, notification: reply.notif, capabilities: reply.capab }));
                    break;
                default:
                    break;
                }

            if (reply.receipt !== undefined) {

                const reservation = reply.receipt.order;
                reservation.lastUpdateTime = new Date().toISOString();

                for(let lineItem of reservation.contents.lineItems) {
                    if(reply.receipt.orderItemNames.indexOf(lineItem.name) !== -1) {
                        lineItem.reservation.status = reply.receipt.orderState;
                        lineItem.reservation.confirmationCode = reservation.userVisibleOrderId;
                        lineItem.reservation.userVisibleStatusLabel = reply.receipt.orderStateName;
                    }
                }

                messages.push(new OrderUpdate({
                    type: 'SNAPSHOT',
                    reason: reply.receipt.orderReason,
                    order: reservation
                }))

                console.log(messages);
            }}
        
        return messages;
    }

    send(conv) {
        let messages = this.messages;
        if (!messages || messages.length === 0) return false;

        let lastMessage = messages.pop();
        
        for (let message of messages) {
            conv.ask(message);
        }

        if (this.expectUserResponse) conv.ask(lastMessage);
        else conv.close(lastMessage);
        return true;
    }


}

module.exports.Message = Message;

function isCaroussel(arrayOfReplies) {
    if (arrayOfReplies.length < 2) return false;
    let firstReply = arrayOfReplies.shift();

    for (let reply of arrayOfReplies) {
        if (reply.type !== "card") {
            return false;
        }
    }

    if (firstReply.type === "card" ||
        firstReply.type === "text" || 
        firstReply.type === "quick") return true;

    return false;
}

function getSuggestions(reply) {
    if (reply.type !== 'quick') return [];
    let text = reply.text || reply.quicktext;
    if (!text && reply.title) text = reply.title + ' ' + (reply.subtitle || '');
    
    let suggestions = [];
    let allMessages = [];

    for (let button of reply.buttons){
        if (button.action && button.action === 'askLocation') {
            allMessages.push(new Permission({context: text || '', permissions: "DEVICE_PRECISE_LOCATION" }));
            continue;
        } 
        if (button.action && button.action === 'askIdentity') {
            allMessages.push(new Permission({context: text || '', permissions: ["NAME", "EMAIL"] }));
            continue;
        }

        if ("string" === typeof button) suggestions.push(button);
        else suggestions.push(button.title);
    }

    allMessages.push(new Suggestions(suggestions));
    return allMessages;
}

function buildCaroussel(arrayOfReplies) {
    if (arrayOfReplies.length < 1) return [];
    let caroussel = [];

    for (let reply of arrayOfReplies) {
        let item = cardOptions(reply);
        item.optionInfo = { key: reply.title, synonyms: [] }

        if (item.subtitle) {
            item.description = item.subtitle;
            delete item.subtitle;
        }

        delete item.text;
        caroussel.push(item) ;
    }

    return (new Carousel({ imageDisplayOptions: 'DEFAULT', items: caroussel }));
}

function buidSimpleMessage(reply) {
    let text = reply.text || reply.quicktext;
    if (!text && reply.title) text = reply.title + ' ' + (reply.subtitle || '');
    let speech = reply.speech || text;
    
    return (new SimpleResponse({speech: speech, text: text }))
}


function cardOptions(reply)  {
    let options = {
        subtitle: reply.subtitle,
        text: reply.subtext,
        title: reply.title
    }

    if(options.subtitle == "") {
       delete options.subtitle;
    }
    if(options.text == "") {
        delete options.text;
    }

    if (reply.media || reply.attach) {
        options.image = { url: helper.absURL(reply.attach), accessibilityText: reply.title || "[image]" }
    }

    if (reply.buttons) {
        let buttons = [];
        for (let btn of reply.buttons){
            
            if (btn.action !== 'openUrl') continue;

            buttons.push(new Button({ title: btn.title, url: helper.absURL(btn.value)}));
        }

        if(buttons.length > 0) {
            options.buttons = buttons;
        }
    }

    return options;
}

function buildTransaction(reply) {
    switch(reply.intent) {
        case 'confirm':
            let confirmation = getConfirmation(reply);
            return confirmation;
        case 'requirement_check':
            return (new TransactionRequirements());
        default:
            return null;
    }
}

function getConfirmation(reply) {

    const getPrice = (price) => {
        let amount = Number(price) * 1000000;
        let priceAttribute = {
            amount: { currencyCode: 'EUR', amountInMicros: amount },
            name: 'service',
            state : 'ESTIMATE',
            type: 'TOTAL'
        }
        return priceAttribute;
    }

    
    let totalPrice = 0;
    let items = [];

    for (let item of reply.orderItems) {
        let itemName = item.name;
        let idItem = itemName.toLowerCase().replace(/\s/g, '_')

        let newItem = {
            id: idItem,
            name: itemName,
            priceAttributes: [getPrice(item.price)],
            image: {
                url: item.imageUrl,
                accessibilityText: item.name
            },
            description: item.description,
            reservation: {
                reservationTime: {
                    timeIso8601: item.reservationTime
                },
                status: 'PENDING',
                  userVisibleStatusLabel: "Reservation is pending",
                  type: 'RESERVATION_TYPE_UNSPECIFIED',
                location: item.address
            }
          }

        items.push(newItem);
        totalPrice += item.price
    }

    const now = new Date().toISOString();
    let merchant = reply.merchant;
    let merchantId = merchant.toLowerCase().replace(/\s/g, '_');

    let order = {
        createTime: now,
        lastUpdateTime: now,
        merchantOrderId: reply.orderId,
        transactionMerchant: {
            id: merchantId,
            name: merchant
        },
        contents: {
            lineItems: items
        },
        priceAttributes: [getPrice(totalPrice)],
        buyerInfo: reply.userInfos
    };


    let options = {
        "order": order,
        "orderOptions": {
            requestDeliveryAddress: 'false',
            userInfoOptions: {
                "userInfoProperties": [] // USER_INFO_PROPERTY_UNSPECIFIED / EMAIL
            }
        },
        "paymentParameters": {},
        "presentationOptions": {
            actionDisplayName: 'RESERVE'
        }
    };


    if (totalPrice > 0) {
        options.paymentParameters = {
            merchantPaymentOption: {
                merchantPaymentMethod: [
                    {
                        paymentMethodId: 'payment_store',
                        paymentMethodDisplayInfo: {
                            paymentType: 'PAYMENT_TYPE_UNSPECIFIED',
                            paymentMethodDisplayName: "Règlement en magasin"
                        }
                    }
                ]
            }
        }
    }


    return (new TransactionDecision(options));
    
}



