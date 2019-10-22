"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bodyParser = require("body-parser");
require("isomorphic-fetch");
const uuidv4 = require("uuid/v4");
const expires_in = 1800;
let conversationId;
let botDataStore = {};
let history;

exports.initializeRoutes = (app, serviceUrl, botUrl) => {
    app.use(bodyParser.json()); // for parsing application/json
    app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, PATCH, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
        res.header('Access-Control-Allow-Credentials', true);
        next();
    });


    // CLIENT ENDPOINT
    app.options('/directline', (req, res) => {
        res.status(200).end();
    });
    //Creates a conversation
    app.post('/directline/conversations', (req, res) => {
        history = [];
        conversationId = uuidv4();
        console.log("Created conversation with conversationId: " + conversationId);
        res.send({
            conversationId,
            expires_in
        });
    });
    app.listen(3000, () => {
        console.log('listening');
    });
    //reconnect API
    app.get('/v3/directline/conversations/:conversationId', (req, res) => { console.warn("/v3/directline/conversations/:conversationId not implemented"); });
    //Gets activities from store (local history array for now)
    app.get('/directline/conversations/:conversationId/activities', (req, res) => {
        let watermark = req.query.watermark && req.query.watermark !== "null" ? Number(req.query.watermark) : 0;
        if (history) {
            //If the bot has pushed anything into the history array
            if (history.length > watermark) {
                let activities = getActivitiesSince(watermark);
                res.status(200).json({
                    activities,
                    watermark: watermark + activities.length
                });
            }
            else {
                res.status(200).send({
                    activities: [],
                    watermark
                });
            }
        }
        else {
            console.warn("Client is polling connector before conversation is initialized.");
            res.status(400).send;
        }
    });
    //Sends message to bot. Assumes message activities. 
    app.post('/directline/conversations/:conversationId/activities', (req, res) => {
        let incomingActivity = req.body;
        //make copy of activity. Add required fields. 
        let activity = createMessageActivity(incomingActivity, serviceUrl);
        fetch(botUrl, {
            method: "POST",
            body: JSON.stringify(activity),
            headers: {
                "Content-Type": "application/json"
            }
        }).then(response => {
            res.status(response.status).json({ id: activity.id });
        });
    });
    app.post('/v3/directline/conversations/:conversationId/upload', (req, res) => { console.warn("/v3/directline/conversations/:conversationId/upload not implemented"); });
    app.get('/v3/directline/conversations/:conversationId/stream', (req, res) => { console.warn("/v3/directline/conversations/:conversationId/stream not implemented"); });
    // BOT CONVERSATION ENDPOINT
    app.post('/v3/conversations', (req, res) => { console.warn("/v3/conversations not implemented"); });
    app.post('/v3/conversations/:conversationId/activities', (req, res) => {
        let activity;
        activity = req.body;
        activity.id = uuidv4();
        activity.from = { id: "id", name: "Bot" };
        if (history) {
            history.push(activity);
            res.status(200).send();
        }
        else {
            console.warn("Client is attempting to send messages before conversation is initialized.");
            res.status(400).send();
        }
    });
    app.post('/v3/conversations/:conversationId/activities/:activityId', (req, res) => {
        let activity;
        activity = req.body;
        activity.id = uuidv4();
        activity.from = { id: "id", name: "Bot" };
        if (history) {
            history.push(activity);
            res.status(200).send();
        }
        else {
            console.warn("Client is attempting to send messages before conversation is initialized.");
            res.status(400).send();
        }
    });
    app.get('/v3/conversations/:conversationId/members', (req, res) => { console.warn("/v3/conversations/:conversationId/members not implemented"); });
    app.get('/v3/conversations/:conversationId/activities/:activityId/members', (req, res) => { console.warn("/v3/conversations/:conversationId/activities/:activityId/members"); });
    // BOTSTATE ENDPOINT
    app.get('/v3/botstate/:channelId/users/:userId', (req, res) => {
        console.log("Called GET user data");
        getBotData(req, res);
    });
    app.get('/v3/botstate/:channelId/conversations/:conversationId', (req, res) => {
        console.log(("Called GET conversation data"));
        getBotData(req, res);
    });
    app.get('/v3/botstate/:channelId/conversations/:conversationId/users/:userId', (req, res) => {
        console.log("Called GET private conversation data");
        getBotData(req, res);
    });
    app.post('/v3/botstate/:channelId/users/:userId', (req, res) => {
        console.log("Called POST setUserData");
        setUserData(req, res);
    });
    app.post('/v3/botstate/:channelId/conversations/:conversationId', (req, res) => {
        console.log("Called POST setConversationData");
        setConversationData(req, res);
    });
    app.post('/v3/botstate/:channelId/conversations/:conversationId/users/:userId', (req, res) => {
        setPrivateConversationData(req, res);
    });
    app.delete('/v3/botstate/:channelId/users/:userId', (req, res) => {
        console.log("Called DELETE deleteStateForUser");
        deleteStateForUser(req, res);
    });
};
const getBotDataKey = (channelId, conversationId, userId) => {
    return `$${channelId || '*'}!${conversationId || '*'}!${userId || '*'}`;
};
const setBotData = (channelId, conversationId, userId, incomingData) => {
    const key = getBotDataKey(channelId, conversationId, userId);
    let newData = {
        eTag: new Date().getTime().toString(),
        data: incomingData.data
    };
    if (incomingData) {
        botDataStore[key] = newData;
    }
    else {
        delete botDataStore[key];
        newData.eTag = '*';
    }
    return newData;
};
const getBotData = (req, res) => {
    const key = getBotDataKey(req.params.channelId, req.params.conversationId, req.params.userId);
    console.log("Data key: " + key);
    res.status(200).send(botDataStore[key] || { data: null, eTag: '*' });
};
const setUserData = (req, res) => {
    res.status(200).send(setBotData(req.params.channelId, req.params.conversationId, req.params.userId, req.body));
};
const setConversationData = (req, res) => {
    res.status(200).send(setBotData(req.params.channelId, req.params.conversationId, req.params.userId, req.body));
};
const setPrivateConversationData = (req, res) => {
    res.status(200).send(setBotData(req.params.channelId, req.params.conversationId, req.params.userId, req.body));
};
const deleteStateForUser = (req, res) => {
    Object.keys(botDataStore)
        .forEach(key => {
        if (key.endsWith(`!{req.query.userId}`)) {
            delete botDataStore[key];
        }
    });
    res.status(200).send();
};
//CLIENT ENDPOINT HELPERS
const createMessageActivity = (incomingActivity, serviceUrl) => {
    return Object.assign({}, incomingActivity, { channelId: "emulator", serviceUrl: serviceUrl, conversation: { 'id': conversationId }, id: uuidv4() });
};
const getActivitiesSince = (watermark) => {
    return history.slice(watermark);
};
//# sourceMappingURL=bridge.js.map