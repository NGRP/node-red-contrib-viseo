"use strict";

var _            = require('lodash'),
    builder      = require('botbuilder'),
    wechat       = require('wechat'),
    WechatAPI    = require('wechat-api');

const AttachmentType = {
    Image:      'wechat/image',
    Voice:      'wechat/voice',
    Video:      'wechat/video',
    ShortVideo: 'wechat/shortvideo',
    Link:       'wechat/link',
    Location:   'wechat/location',
    Music:      'wechat/music',
    News:       'wechat/news',
    MpNews:     'wechat/mpnews',
    Card:       'wechat/card',
    Hero:       'application/vnd.microsoft.card.hero'
};

var WechatConnector = (function() {
    function WechatConnector(opts) {
        this.options = _.assign({
            enableReply: false
        }, opts);

        this.postMessageHook = undefined;
        this.wechatAPI = new WechatAPI(this.options.appID, this.options.appSecret);
    }

    WechatConnector.prototype.listen = function () {
        var self = this;
        var config = this.options.appToken;

        if (!!this.options.encodingAESKey) {
            config = {
                token: this.options.appToken,
                appid: this.options.appID,
                encodingAESKey: this.options.encodingAESKey
            };
        }

        return wechat(config, function(req, res, next) {
            var wechatMessage = req.weixin;

            if (!self.options.enableReply) {
                self.processMessage(wechatMessage);
                res.status(200).end();
            } else {
                next();
            }
        });
    };

   WechatConnector.prototype.listen = function () {
        var self = this;
        var config = this.options.appToken;

        if (!!this.options.encodingAESKey) {
            config = {
                token: this.options.appToken,
                appid: this.options.appID,
                encodingAESKey: this.options.encodingAESKey
            };
        }

        return wechat(config, function(req, res, next) {
            var wechatMessage = req.weixin;

            if (!self.options.enableReply) {
                self.processMessage(wechatMessage);
                res.status(200).end();
            } else {
                next();
            }
        });
    };

    WechatConnector.prototype.processMessage = function (wechatMessage) {
        var msg,
            addr,
            atts = [],
            msgType = wechatMessage.MsgType;

        if (!this.handler) {
            throw new Error('Error no handler');
        }

        addr = {
            channelId: 'wechat',
            user: { id: wechatMessage.FromUserName, name: 'Unknow' },
            bot: { id: wechatMessage.ToUserName, name: 'Bot' },
            conversation: { id: 'Convo1' }
        };

        msg = new builder.Message()
                         .address(addr)
                         .timestamp(convertTimestamp(wechatMessage.CreateTime))
                         .entities();

        if (msgType == 'text') {
            msg = msg.text(wechatMessage.Content);
        } else {
            msg = msg.text('');
        }

        if (msgType == 'image') {
            atts.push({
                contentType: AttachmentType.Image,
                content: {
                    url: wechatMessage.PicUrl,
                    mediaId: wechatMessage.MediaId
                }
            });
        }

        if (msgType == 'voice') {
            atts.push({
                contentType: AttachmentType.Voice,
                content: {
                    format: wechatMessage.Format,
                    mediaId: wechatMessage.MediaId,
                    recognition: wechatMessage.Recognition
                }
            });
        }

        if (msgType == 'video') {
            atts.push({
                contentType: AttachmentType.Video,
                content: {
                    mediaId: wechatMessage.MediaId,
                    thumbMediaId: wechatMessage.ThumbMediaId
                }
            });
        }

        if (msgType = 'shortvideo') {
            atts.push({
                contentType: AttachmentType.ShortVideo,
                content: {
                    mediaId: wechatMessage.MediaId,
                    thumbMediaId: wechatMessage.ThumbMediaId
                }
            });
        }

        if (msgType == 'link') {
            atts.push({
                contentType: AttachmentType.Link,
                content: {
                    title: wechatMessage.Title,
                    description: wechatMessage.Description,
                    url: wechatMessage.Url
                }
            });
        }

        if (msgType == 'location') {
            atts.push({
                contentType: AttachmentType.Location,
                content: {
                    locationX: wechatMessage.Location_X,
                    locationY: wechatMessage.Location_Y,
                    scale: wechatMessage.Scale,
                    label: wechatMessage.Label
                }
            });
        }

        msg = msg.attachments(atts);
        this.handler([msg.toMessage()]);
        return this;
    };

    WechatConnector.prototype.onEvent = function (handler) {
        this.handler = handler;
    };

    WechatConnector.prototype.send = function (messages, cb) {
        for (var i = 0; i < messages.length; i++) {
            this.postMessage(messages[i]);
        }
    };

    WechatConnector.prototype.startConversation = function (address, cb) {
        var addr = _.assign(address, {
            conversation: { id: 'Convo1' }
        });

        cb(null, addr);
    };

    WechatConnector.prototype.postMessage = function (message, cb) {
        var self = this,
            addr = message.address,
            user = addr.user;

        if (message.text && message.text.length > 0) {
            this.wechatAPI.sendText(user.id, message.text, errorHandle);
        }

        if (message.attachments && message.attachments.length > 0) {
            for (var i = 0; i < message.attachments.length; i++) {
                var atm = message.attachments[i],
                    atmType = atm.contentType,
                    atmCont = atm.content;

                if (!atmCont) continue;

                switch(atmType) {
                    case AttachmentType.Image:
                        this.wechatAPI.sendImage(user.id, atmCont.mediaId, errorHandle);
                        break;
                    case AttachmentType.Voice:
                        this.wechatAPI.sendVoice(user.id, atmCont.mediaId, errorHandle);
                        break;
                    case AttachmentType.Video:
                        this.wechatAPI.sendVideo(user.id, atmCont.mediaId, atmCont.thumbMediaId, errorHandle);
                        break;
                    case AttachmentType.Music:
                        this.wechatAPI.sendMusic(user.id, atmCont, errorHandle);
                        break;
                    case AttachmentType.News:
                        this.wechatAPI.sendNews(user.id, atmCont, errorHandle);
                        break;
                    case AttachmentType.MpNews:
                        this.wechatAPI.sendMpNews(user.id, atmCont.mediaId, errorHandle);
                        break;
                    case AttachmentType.Card:
                        this.wechatAPI.sendCard(user.id, atmCont, errorHandle);
                        break;
                    default:
                        this.postMessageHook(wechatAPI, message, atmType, atmCont, user);
                        break;
                }
            }
        }
    };

    WechatConnector.prototype.postMessageHook = function(callback){
        this.postMessageHook = callback;
    }

    function errorHandle(err) {
        if (err) {
            console.log('Error', err);
        }
    }

    function convertTimestamp(ts) {
        return new Date(parseInt(ts) * 1000).toISOString();
    }

    return WechatConnector;
})();

exports.WechatConnector      = WechatConnector;
exports.WechatAttachmentType = AttachmentType;
