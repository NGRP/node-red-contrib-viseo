"use strict";

const fs      = require("fs");
const builder = require('botbuilder');

// ------------------------------------------
//  HELPERS
// ------------------------------------------

const CONTENT_TYPE = {
    "jpg" :  "image/jpg",
    "gif" :  "image/gif"
}

const absURL = (url) => {
    if (undefined === url) return url;
    if (url.startsWith('http')) return url;
    return CONFIG.server.host + ":" + CONFIG.server.port + url;
}

// TODO review the regexp for simplification and better behavior
const resolveText = (str, ctxt) => {
    if (undefined === str) return str;
    let rgxp = /\{([a-zA-Z0-9_\.\ \/\<\>\:\"\é\è\à\-\ç\ù\[\]\?\=\!\%\|\&\(\)\œ\,\;\$\€\*\°\§\'\@\#]+)\}/i;
    let rgxp2 = /%([a-zA-Z0-9_\.\[\]]+)%/i;
    for (let i = 0 ; i < 1000 &&  rgxp.test(str) ; i++){
        let match  = rgxp.exec(str)[1];
	let parts = (match.indexOf(":else:")>0)?match.split(":else:"):match.split(':');
	let m1 = parts[0];
	if (m1.indexOf('?')>0) {
		let parts2 = m1.split('?');
		let cond = parts2[0]
		let ok = parts2[1];
		let ko = parts[1];
		// do substitution in 'cond' part
		for (let i = 0 ; i < 1000 &&  rgxp2.test(cond) ; i++){
			let m2  = rgxp2.exec(cond)[1];
			let a2 = '"'+getCtxtValue(m2, ctxt)+'"';
			cond = cond.replace("%"+m2+"%", a2);
		}
		let a3;
		try {
			a3 = (eval(cond))?ok:ko;
		} catch (err) {
			a3 = match+':'+err;
			console.log("resolveText: "+a3+" condition=("+cond+")");
		} 
		str = str.replace("{"+match+"}", a3);
	} else {
	        let answer = getCtxtValue(m1, ctxt);
		if ((undefined==answer) && (parts.length > 1)) { 
			answer = parts[1]; 
		}
	        str = str.replace("{"+match+"}", answer)
	}
    }
    return removeHTML(str, ctxt);
}

const removeHTML = (str, ctxt) => {
	if (ctxt.fmsg && ("xml" != ctxt.fmsg)) {
	    str = str.replace(/<[^<]*>/igm, "");
	}
	return str;
} 

const getCtxtValue = (str, ctxt) => {
    if (undefined === str) return "";
    if (undefined === ctxt) return "";
    let parts = str.split('.');
    for (let part of parts){
        if (undefined == ctxt) return "";

        let rgxp = /[a-zA-Z0-9_]+\[(\d+)\]/;
        if (!rgxp.test(part)){
            ctxt = ctxt[part];
            continue;
        }
        
        let idx   = parseInt(rgxp.exec(part)[1]);
            part  = part.substring(0,part.indexOf('['));
        let array = ctxt[part];
        ctxt = array[idx];
    }
    return ctxt;
}

// ------------------------------------------
//  MESSAGES
// ------------------------------------------

/**
 * Multi purpose function can be called
 * - with ONLY a 'text' attribute to create a text (raw) message
 * - with ONLY an 'image' attribute to create an image (raw) message 
 * - with ONLY card's attribute to create a Card message
 */
const getMessage = (cards, ctxt) => {

    // Object means already decoded
    if ('object' === typeof cards){
        cards = [cards];
    }

    let msg = new builder.Message();

    // set the format
    if (ctxt.fmsg) msg.textFormat(ctxt.fmsg);

    // Is Carousel
    if (cards.length > 1){
        msg.attachmentLayout(builder.AttachmentLayout.carousel)
    }
    
    // Is RAW message
    else if (buildRawMessage(msg, cards[0], ctxt)){
        return msg;
    }

    // Message with HERO 
    for (let opts of cards){
        let card = getHeroCard(opts, ctxt)
        msg.addAttachment(card);
    }
    return msg;
};

const buildRawMessage = (msg, opts, ctxt) => {
    if (undefined !== opts.title 
     || undefined !== opts.subtitle
     || undefined !== opts.subtext
     || undefined !== opts.buttons) return false;

    if (undefined !== opts.text){
        let text = resolveText(opts.text, ctxt);
        msg.text(text);
        return true;
    }

    if (undefined !== opts.media){
        let url = absURL(resolveText(opts.media, ctxt));
        msg.attachments([{ 
            "contentType": CONTENT_TYPE[url.substring(url.length-3)],
            "contentUrl": url
        }]);
        return true;
    }

    // Backward compatibility
    if (undefined !== opts.attach && undefined === opts.buttons){
        let url = absURL(resolveText(opts.attach, ctxt));
        msg.attachments([{ 
            "contentType": CONTENT_TYPE[url.substring(url.length-3)],
            "contentUrl": url
        }]);
        return true;
    }
    
    // Work In Progress: Facebook Quick Buttons: Should be exported to a facebook.js hook 
    // if (undefined === opts.attach && undefined !== opts.buttons){
    //     msg.text("Testing");
    //     msg.sourceEvent({ 
    //         facebook: { 
    //             quick_replies: [{
    //                 content_type:"text",
    //                 title:"Red",
    //                 payload:"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_RED"
    //             },            
    //             {
    //                 content_type:"text",
    //                 title:"Blue",
    //                 payload:"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_BLUE"
    //             }]
    //         }
    //     });
    //     return true;
    // }

    return false;
}

const getHeroCard = (opts, ctxt) => {
    let card = new builder.HeroCard();

    // Attach Images to card
    if (undefined !== opts.attach){
        let url = absURL(resolveText(opts.attach, ctxt));
        card.images([ builder.CardImage.create(undefined, url) ])
    }

    // Attach Subtext, appears just below subtitle, differs from Subtitle in font styling only.
    if (undefined !== opts.subtext){
        let text = resolveText(opts.subtext, ctxt);
        card.text(text);
    }

    // Attach Subtitle, appears just below Title field, differs from Title in font styling only.
    if (undefined !== opts.subtitle){ 
        let subtitle = resolveText(opts.subtitle, ctxt);
        card.subtitle(subtitle);
    }

    // Attach Title to card
    if (undefined !== opts.title){
        let title = resolveText(opts.title, ctxt);
        card.title(title);
    }

    // Attach Buttons to card
    let buttons = opts.buttons;
    if (undefined !== buttons){ 
        var btns = [];
        for (let button of buttons){
            if ("string" === typeof button){
                button = resolveText(button, ctxt)
                btns.push(builder.CardAction.postBack(undefined, button, button))
            } else {
                btns.push(builder.CardAction[button.action](undefined, resolveText(button.value, ctxt), 
                                                                       resolveText(button.title, ctxt)));
            }
        }
        card.buttons(btns);
    }

    return card;
}

// ------------------------------------------
//   PROMPTS
// ------------------------------------------

var PROMPT_CALLBACK = {}
const promptNext = (inMsg, callback) => {
    let convId = inMsg.address.conversation.id;
    PROMPT_CALLBACK[convId] = callback;
}

const hasPrompt = (inMsg) => {
    let convId  = inMsg.address.conversation.id;

    let cb = PROMPT_CALLBACK[convId];
    if (undefined === cb) return false;

    delete PROMPT_CALLBACK[convId];
    cb(inMsg);
    return true;
}

// ------------------------------------------
//   TYPING
// ------------------------------------------

const typing = (session) => {
    if (undefined === session) return;
    session.sendTyping();
}

// ------------------------------------------
//   REPLY
// ------------------------------------------

const replyTo = (bot, inMsg, outMsg, next) => {
    if (undefined === inMsg)  return;
    if (undefined === outMsg) return;

    // Set the message address
    outMsg.address(inMsg.address);

    // Send the message
    try {
        bot.send(outMsg, next);
    } catch (ex){ error(ex); next(); }
}

// ------------------------------------------
//   EXPORTS
// ------------------------------------------

exports.promptNext  = promptNext;
exports.hasPrompt   = hasPrompt;
exports.getMessage  = getMessage;
exports.replyTo     = replyTo;
exports.typing      = typing;
