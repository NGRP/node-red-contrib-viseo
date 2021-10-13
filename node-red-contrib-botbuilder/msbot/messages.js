const { AttachmentLayoutTypes, CardFactory } = require("botbuilder");
const helper = require("node-red-viseo-helper");

// ------------------------------------------
//  MESSAGES
// ------------------------------------------

function getMessage(node, address, replies, globalTypingDelay, isPush) {
  let typingIndication = [
    { type: "typing" },
    { type: "delay", value: globalTypingDelay }
  ];

  let messages = [...typingIndication];
  let activity = buildRawMessage(node, replies[0], address, isPush);

  // Is RAW message
  if (activity) {
    messages.push(activity);
    if (replies.length === 1) return messages;
    replies.shift();
    activity.attachments = [];
  } else {
    activity = { attachments: [], type: "message", textFormat: "markdown" };
  }

  // list ou carousel
  if (replies.length > 1)
    activity.attachmentLayout = AttachmentLayoutTypes.Carousel;

  // One or multiple cards
  let expectedInput = false;
  for (let reply of replies) {
    let card =
      reply.type === "AdaptiveCard"
        ? getAdaptiveCard(reply)
        : getHeroCard(reply);

    // Only the latest speech is used
    if (card.speak && reply.speech) {
      card.speak = reply.speech === true ? card._speech || "" : reply.speech;
    }

    // Botbuilder Message (Cortana) should set that for prompt
    if (reply.prompt) expectedInput = true;
    activity.attachments.push(card);
  }

  messages.push(activity);
  if (expectedInput) activity.inputHint = "expectingInput";
  else activity.inputHint = "acceptingInput";
  
  return messages;
}

module.exports = getMessage;

// ------------------------------------------
//  HELPERS
// ------------------------------------------

const CONTENT_TYPE = {
  jpe: "image/jpeg",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  png: "image/png",
  tif: "image/tiff",
  tiff: "image/tiff",
  mp4: "video/mp4",
  mpeg: "video/mpeg",
  mpe: "video/mpeg",
  mpg: "video/mpeg",
  mov: "video/quicktime"
};

function getCardAction(button) {
  switch (button.action) {
    case "signin":
      return {
        type: "Action.Submit",
        title: "Click me for messageBack",
        data: {
          msteams: {
            type: "messageBack",
            displayText: "I clicked this button",
            text: "text to bots",
            value: '{"bfKey": "bfVal", "conflictKey": "from value"}'
          }
        }
      };
    case "invoke":
      return {
        type: "invoke",
        title: button.title,
        value: {
          option: button.value
        }
      };
    case "openUrl":
      return {
        type: "openUrl",
        title: button.title,
        value: button.value
      };
    case "messageBack":
      return {
        type: "messageBack",
        title: "My MessageBack button",
        displayText: "I clicked this button",
        text: "User just clicked the MessageBack button",
        value: '{"property": "propertyValue" }'
      };
    case "postBack":
      return {
        type: "postBack",
        value: button.value,
        title: button.title
      };
    case "imBack":
    default:
      return {
        type: "imBack",
        value: button.value,
        title: button.title
      };
  }
}

function buildRawMessage(node, opts, address, isPush) {
  /* ---------------------------------------------------------- */
  /* --------------------- TO IMPLEMENT ----------------------- */
  /* ---------------------------------------------------------- */
  /*   audioCard
  /*   animationCard
  /*   receiptCard
  /* ---------------------------------------------------------- */

  let msg = {};
  if (opts.prompt) {
    msg.inputHint = "expectingInput";
  } else {
    msg.inputHint = "acceptingInput";
  }

  if (address.channelId === "facebook") {
    msg.data = {};
    msg.data.address = { channelId: "facebook" };

    if (isPush) {
      msg.sourceEvent({
        facebook: {
          messaging_type: "MESSAGE_TAG",
          tag: "NON_PROMOTIONAL_SUBSCRIPTION",
          notification_type: opts.notification ? "REGULAR" : "NO_PUSH"
        }
      });
    }
  }

  switch (opts.type) {
    case "text":
      // Set msg
      msg.type = "message";
      msg.text = opts.text;
      // Set speech value
      if (msg.speak && opts.speech) {
        msg.speak = opts.speech === true ? opts.text : opts.speech;
      }
      return msg;

    case "quick":
      msg.text = opts.quicktext;

      let newQuick = [];
      for (let button of opts.buttons) {
        newQuick.push(getCardAction(button));
      }
      msg.suggestedActions = { actions: newQuick };

      // Set speech value
      if (msg.speak && opts.speech) {
        msg.speak = opts.speech === true ? msg.text : opts.speech;
      }

      return msg;

    case "media":
      // Set msg
      let url = helper.absURL(opts.media);

      let type = opts.mediaContentType;
      if (!type || type === "image" || type === "video") {
        let extension = url.split(".").pop();
        let testType = CONTENT_TYPE[extension.toLowerCase()];
        if (testType) type = testType;
        else if (type === "image") type = CONTENT_TYPE["png"];
        else type = CONTENT_TYPE["mp4"];
      }

      msg.attachments = [];
      msg.attachments.push({
        contentUrl: url,
        contentType: type,
        name: ""
      });
      return msg;

    /* TO IMPLEMENT 
          aspect, autoloop, autostart, buttons, duration, 
          image, media, shareable,subtitle, text, title, value	
      */

    case "signin":
      // Set msg
      msg = CardFactory.signinCard({
        text: opts.text,
        buttons: [{ type: "signin", value: opts.url, title: opts.title }]
      });
      // Set speech value
      if (msg.speak && opts.speech) {
        msg.speak = opts.speech === true ? opts.text : opts.speech;
      }
      return msg;

    case "event":
      msg.data.type = "event";
      msg.data.name = opts.event.name;
      msg.data.value = opts.event.value;
      return msg;

    default:
      return null;
  }
}

function buildFacebookSpecificMessage(template, reply, isPush) {
  let msg = {};

  const buildFacebookButtonObject = obj => {
    if (obj.action === "share")
      return {
        type: "element_share",
        share_contents: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [
                {
                  title: obj.sharedCard.title,
                  subtitle: obj.sharedCard.text,
                  image_url: obj.sharedCard.media,
                  buttons: [
                    {
                      type: "web_url",
                      url: helper.absURL(obj.sharedCard.url),
                      title: obj.sharedCard.button
                    }
                  ]
                }
              ]
            }
          }
        }
      };
    if (obj.action === "openUrl")
      return {
        type: "web_url",
        url: obj.value,
        title: obj.title,
        messenger_extensions: "false"
        //"fallback_url": "https://www.facebook.com/"
      };
    if (obj.action === "call")
      return {
        type: "phone_number",
        title: obj.title,
        payload: obj.value
      };
    else
      return {
        type: "postback",
        title: obj.title,
        payload: obj.value
      };
  };

  let buttons = [];
  for (let button of reply.buttons || []) {
    buttons.push(buildFacebookButtonObject(button));
  }

  msg.data.address = { channelId: "facebook" };

  let attachment = {
    type: "template",
    payload: {
      template_type: template
    }
  };

  let messaging_type = isPush ? "MESSAGE_TAG" : "RESPONSE";
  let tag = isPush ? "NON_PROMOTIONAL_SUBSCRIPTION" : undefined;
  let notification_type = isPush && reply.notification ? "REGULAR" : "NO_PUSH";

  switch (template) {
    case "button":
      attachment.payload.text = reply.subtitle;
      attachment.payload.buttons = buttons;
      break;

    case "generic":
      attachment.payload.elements = [
        {
          title: reply.title,
          subtitle: reply.subtitle,
          image_url: reply.attach ? helper.absURL(reply.attach) : "",
          buttons: buttons
        }
      ];
      break;
  }

  // Only the latest speech is used
  let _speech = "";
  if (!reply.speech) {
    _speech = reply.speech;
  } else {
    if (reply.title) _speech += reply.title + " ";
    if (reply.subtext) _speech += reply.subtext;
    if (reply.subtitle) _speech += reply.subtitle;
  }

  if (msg.speak && reply.speech) {
    msg.speak = _speech || "";
  }

  msg.channelData = {
    facebook: { attachment, messaging_type, tag, notification_type }
  };
  return msg;
}

const getHeroCard = opts => {
  let imgs = [];
  let ttle = "";
  let text = "";
  let subs = "";
  let spch = "";

  // Attach Images to card
  if (!!opts.attach) {
    let url = helper.absURL(opts.attach);
    imgs = CardFactory.images([{ url: url }]);
  }

  // Attach Title to card
  if (!!opts.title) {
    spch += opts.title + " ";
    ttle = opts.title;
  }

  // Attach Subtext, appears just below subtitle, differs from Subtitle in font styling only.
  if (!!opts.subtext) {
    spch += opts.subtext;
    text = opts.subtext;
  }

  // Attach Subtitle, appears just below Title field, differs from Title in font styling only.
  if (!!opts.subtitle) {
    spch += opts.subtitle;
    subs = opts.subtitle;
  }

  /* --- action
    card.tap = CardAction({
        // https://docs.microsoft.com/en-us/javascript/api/botframework-schema/cardaction?view=botbuilder-ts-latest
    })
  */

  // Attach Buttons to card
  let buttons = opts.buttons;
  if (undefined !== buttons) {
    var btns = [];
    for (let button of buttons) {
      if ("string" === typeof button) {
        btns.push({ type: "postBack", title: button, value: button });
      } else if (!button.value) {
        continue;
      } else {
        // 'openUrl', 'imBack', 'postBack', 'playAudio', 'playVideo', 'showImage',
        // 'downloadFile', 'signin', 'call', 'payment', 'messageBack'
        btns.push(getCardAction(button));
      }
    }
  }

  //return CardFactory.heroCard(card);
  return CardFactory.heroCard(ttle, text, imgs, btns, {
    subtitle: subs,
    _speech: spch
  });
};

const getAdaptiveCard = opts => {
  let spch = "";
  /*
  {
    "type": "TextBlock",
    "text": "Default text input"
  }
  ]*/

  // Attach Title to card
  if (!!opts.title) spch += opts.title + " ";

  // Attach Subtext, appears just below subtitle, differs from Subtitle in font styling only.
  if (!!opts.subtext) spch += opts.subtext;

  // Attach Subtitle, appears just below Title field, differs from Title in font styling only.
  if (!!opts.subtitle) spch += opts.subtitle;

  let buttons = opts.buttons;
  if (undefined !== buttons) {
    var btns = [];
    for (let button of buttons) {
      if ("string" === typeof button) {
        btns.push({ type: "postBack", title: button, value: button });
      } else if (!button.value) {
        continue;
      } else {
        btns.push(getCardAction(button));
      }
    }
  }

  let card = {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.3",
    title: opts.title,
    subtext: opts.subtext,
    subtitle: opts.subtitle,
    body: opts.body,
    actions: btns,
    speak: spch
  };

  return CardFactory.adaptiveCard(card);
};
