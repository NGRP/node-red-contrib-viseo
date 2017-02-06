'use strict';

const sqlite3 = require('sqlite3').verbose();

const insertActionsStats = (node, actions, user) => {
    node.statsDb.run('INSERT INTO actions(user_id, intent, question, input) VALUES($userId, $intent, $question, $input)', {
        $userId: user.id,
        $intent: actions.intent,
        $question: actions.question,
        $input: actions.payload
    });
};

const insertUserStats = (node, user) => {
    const params = {
        $fbId: user.id,
        $lastSeen: user.mdate
    };

    node.statsDb.run('UPDATE OR IGNORE users SET last_seen = CURRENT_TIMESTAMP WHERE facebook_id = $fbId', params);
    node.statsDb.run('INSERT OR IGNORE INTO users(facebook_id, last_seen) VALUES($fbId, CURRENT_TIMESTAMP)', params);
};

const insertHotelStats = (node, hotel) => {
    node.statsDb.run('INSERT INTO hotels(rid, hotel_name) VALUES($rid, $name)', {
        $rid: hotel.code,
        $name: hotel.name || null
    });
};

const inputHandler = (node, data, config) => {
    if (data.log && data.log.actions && data.user) {
        insertActionsStats(node, data.log.actions, data.user);
        delete data.log.actions;
    }

    if (data.user) {
        insertUserStats(node, data.user);
    }

    if (data.log && data.log.hotel) {
        insertHotelStats(node, data.log.hotel);
        delete data.log.hotel;
    }

    node.send(data);
};

module.exports = function (RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        const db = new sqlite3.Database('./dbstats');
        this.statsDb = db;

        let node = this;

        this.on('input', (data) => {
            inputHandler(node, data, config);
        });
    };

    RED.nodes.registerType('stats-db', register, {});
};
