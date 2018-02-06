const helper  = require('node-red-viseo-helper');
const request = require('request-promise');
const fs      = require('fs');
const mustache = require("mustache");

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        start(RED, node, config);
        this.on('input', (data)  => { input(RED, node, data, config)  });
        this.on('close', (done)  => { stop(node, config, done) });
    }
    RED.nodes.registerType("node-diff3", register, {});
}

var TOKEN = "";

async function start(RED, node, config) {

    RED.httpNode.get ("/updates",   (req, res, next) => {
        displayAuth(req, res, next); });

    RED.httpNode.post ("/updates",   (req, res, next) => {

        // Auth
        if (req.body.id && req.body.pass) {
            var host = req.headers.referer.substring(0, req.headers.referer.length-8);
            var auth = getAuth(req.body.id, req.body.pass, host)
                .then( function(ok) {
                    if (!ok) displayUnauth("Unauthorized", "You are not allowed to access this page", req, res, next);
                    else { node.send([{ conf: { action: "refresh" }, req: req, res: res, next: next }, undefined]); } 
                })
                .catch( function(e) { 
                    displayUnauth("Bad request", "An error in the code brings you here", req, res, next);
                });
            return;
        }

        // Error
        if (!req.body.action) {
            displayUnauth("Bad request", "An error in the code brings you here", req, res, next);
            return;
        }

        if (req.body.action === "export") {
            node.send([ { conf: {action: "export"}, req: req, res: res, next: next }, undefined]);
            return;
        }

        if (req.body.action === "refresh") {
            node.send([ { conf: {action: "refresh"}, req: req, res: res, next: next }, undefined]);
            return;
        }

        if (req.body.action === "merge") {
            node.send([ { conf: {action: "merge"}, req: req, res: res, next: next }, undefined]);
            return;
        }
        else {
            return node.error("Error: bad request.")
        }

    });
}

async function input(RED, node, data, config) {
    let conf = data.conf;

    if (conf.action === "export") {
        conf.info = {
            class : "success",
            text : "Same version everywhere."
        }
        data.res.json(conf);
        return node.send([undefined, {'payload': helper.getByString(data, config.flows)}]);
    }

    if (!config.compare || !config.flows || !config.backup ) {
        conf.info = {
            class : "danger",
            text : "Some of the configuration fields are empty."
        }
        displayControl(conf, data.req, data.res, data.next);
        return;
    }

    conf.v1 = config.flows;
    conf.v2 = config.compare;
    conf.bk = config.backup;
    
    let flows =   helper.getByString(data, config.flows),
        compare = helper.getByString(data, config.compare),
        backup =  helper.getByString(data, config.backup);
    
    // 1. Export data : TO DO
    if (typeof compare !== "object" || (compare.length === undefined && Object.keys(compare).length === 0) || compare.length === 0) {
        conf.action = "export";
        conf.info = {
            class : "info",
            text : "One of your two versions is empty! Please start exporting your data to merge them."
        }
        displayControl(conf, data.req, data.res, data.next);
        return;
    }

    // 2. Refresh data : TO DO
    if (typeof backup !== "object" || (backup.length === undefined && Object.keys(backup).length === 0) || backup.length === 0) {
        if (flows.length === undefined) {
            let backup = {};
            for (let elt in flows) { backup[elt] = '' ; }
        }
        else {
            let backup = [];
            for (let i=0; i<flows.length; i++) { backup[i] = '' ; }
        }
        conf.info = {
            class : "info",
            text : "The backup will be set after your first merge."
        }
    }

    conf.compare = merge(flows, compare, backup);
    conf.compare.compareInfos = (conf.compare.added.length > 0 || conf.compare.deleted.length > 0) ? true : false;
    conf.compare.compareNodes = (conf.compare.conflict.length > 0) ? true : false;

    if (conf.compare.deleted.length > 0) {
        conf.info = {
            class : "warning",
            text : "Some nodes will be deleted from " + conf.v2 + '!'
        }
    } 
    else if (conf.compare.added.length === 0 && conf.compare.conflict.length === 0) {
        if (conf.compare.changed === 0) {
            conf.info = {
                class : "info",
                text : "Same version everywhere."
            }
        }
        else {
            conf.info = {
                class : "info",
                text : conf.compare.changed + " nodes to update."
            }
        }
    }
    else if (conf.compare.added.length === 0) {
        conf.info = {
            class : "info",
            text : conf.compare.added.length + " nodes will be added in " + conf.v1 + "."
        }
    }
    else {
        conf.info = {
            class : "info",
            text : "Some conflicts need to be resolved."
        }
    }

    if (conf.action === "merge") {
        if (conf.compare.conflict.length > 0) {
            if (!data.req.body.data) {
                conf.info = {
                    class : "danger",
                    text : "Some conflicts can not be resolved."
                }
                data.res.json(conf);
                return;
            }
            for (let c of conf.compare.conflict) {
                conf.compare.nodes[c.id] = c[data.req.body.data[c.id]];
                delete conf.compare.nodes[c.id].diffText;
            }
        }

        conf.info = {
            class : "success",
            text : "Merged with success!"
        }
        data.res.json(conf);
        return node.send([undefined, { "payload": conf.compare.nodes} ]);
    }

    conf.action = "diff3";
    displayControl(conf, data.req, data.res, data.next);
    return;
}

function displayAuth(req, res, next) {
    data = fs.readFileSync(__dirname + "/authent.html", 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8 '); 
    res.end(data);
}

function displayUnauth(title, message, req, res, next) {
    data = fs.readFileSync(__dirname + "/unauth.html", 'utf8');
    data = mustache.render(data, {title: title, message: message});
    res.setHeader('Content-Type', 'text/html; charset=utf-8 '); 
    res.end(data);
}

function displayControl(conf, req, res, next) { 
    data = fs.readFileSync(__dirname + "/control.html", 'utf8');
    data = mustache.render(data, conf);
    res.setHeader('Content-Type', 'text/html; charset=utf-8 '); 
    res.end(data);
}

function merge(first, second, third) {
    let firstkeys =   Object.keys(first);
    let secondkeys =  Object.keys(second);
    let backupkeys =  Object.keys(third);
    let keys =        Object.keys(first[firstkeys[0]])
    let deleted = [];
    let added =   [];
    let changed = 0;
    let nodes = {};
    let conflict = [];

    for (let rs of secondkeys) {
        if (first[rs] === undefined) {
            deleted.push({
                "id": rs,
                "node": second[rs],
                "info": (third[rs] === undefined) ?  "Node not in flow yet" : "Node not in flow anymore"
            });
        }
    }


    for (let each of firstkeys) {

        let fi = first[each],
            se = second[each],
            th = third[each];

        let obj = { "flows": fi, "sheets": se, "backup": th };

        if (se === undefined) {
            added.push({
                "id":each,
                "node": fi,
                "info": (th === undefined) ? "New node in flow" : "Node always in flow"
            });
            nodes[each] = fi;
            continue;
        }

        if (sameNodes(fi, se)) {
            if (sameNodes(se, th)) {
                nodes[each] = fi;
                continue;
            }
            else {
                nodes[each] = fi;
                changed++;
            }
        }
        else {
            if (sameNodes(fi, th)) {
                nodes[each] = se;
                changed++;
                continue;
            }
            else if (sameNodes(se, th)) {
                nodes[each] = fi;
                changed++;
                continue;
            }
            else {
                var difftext = diffText(fi, se, th);
                var newJson = { 
                    "id": each, 
                    "flows": fi, 
                    "sheets": se, 
                    "backup": th || {}
                }
                newJson.flows.diffText = difftext.ob1;
                newJson.sheets.diffText = difftext.ob2;
                newJson.backup.diffText = difftext.ob3;

                conflict.push(newJson);
            }
        }
    }

    return {
        "changed": changed,
        "deleted": deleted,
        "added":   added,
        "nodes":   nodes,
        "conflict": conflict
    };
}

function diffText(ob1, ob2, ob3) {
    let texts = {
        "ob1": "",
        "ob2": "",
        "ob3": ""
    }

    if (ob3 === undefined) texts.ob3 = "<b>Undefined</b>";
    let allKeys = Object.keys(ob1).concat(Object.keys(ob2));
    
    let obKeys = [];
    for (let k of allKeys) {
        if (obKeys.indexOf(k) !== -1) continue;
        if ((ob1[k] === ob2[k]) && ob3 && (ob1[k] === ob3[k])) continue;

        var newText = "<b>" + k + "</b>: ";
        texts.ob1 += newText + ob1[k] + "<br>"
        texts.ob2 += newText + ob2[k] + "<br>"
        if (ob3) texts.ob3 += newText + ob3[k] + "<br>"
        obKeys.push(k);
    }

    return texts;
}

function sameNodes(content1, content2) {
    if (content1 === undefined && content2 === undefined) return true;
    if (content1 === undefined || content2 === undefined) return false;

    let k1 = Object.keys(content1);
    let k2 = Object.keys(content2);
    
    if (k1.length !== k2.length) return false;
    for (let k of k1) if (k2.indexOf(k) === -1) return false;
    
    for (let i in content1) {
        if (typeof content1[i] !== "object") {
            if (content1[i] !== content2[i]) return false;
        }
        else if (content1[i].length !== undefined) {
            if (content1[i].length !== content2[i].length) return false;
            for (let j=0; j<content1[i].length; j++) {
                if (content1[i][j] !== content2[i][j]) return false;
            }
        }
    }

    return true;
}

async function getAuth (user, pass, host) {
    let req = {
        method: "POST",
        uri: host + "/auth/token",
        form: {
            client_id: 'node-red-admin',
            grant_type : 'password',
            scope: '*',
            username: user,
            password: pass
        }
    }

    try {    
        let result = await request(req);
        TOKEN = JSON.parse(result).access_token;
        return true;
    }
    catch(err) { 
        TOKEN = "";
        return false;
    };
}

function stop (node, config, done) {
    TOKEN = "";
    done();
}