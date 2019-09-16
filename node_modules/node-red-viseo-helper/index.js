"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const rp = require("request-promise");
const EventEmitter = require("events");

// ------------------------------------------
//  CONFIG
// ------------------------------------------

require("./lib/config.js").init();
exports.CONFIG = CONFIG;

const mkpathsync = (exports.mkpathsync = (dirpath, mode) => {
  dirpath = path.resolve(dirpath);

  if (typeof mode === "undefined") {
    mode = parseInt("0777", 8) & ~process.umask();
  }

  try {
    if (!fs.statSync(dirpath).isDirectory()) {
      throw new Error(dirpath + " exists and is not a directory");
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      mkpathsync(path.dirname(dirpath), mode);
      fs.mkdirSync(dirpath, mode);
    } else {
      throw err;
    }
  }
});

const absURL = (exports.absURL = url => {
  if (undefined === url) return url;
  if (url.startsWith("http")) return url;

  if (CONFIG.server === undefined || CONFIG.server.host === undefined) {
    console.log(
      "To use relative url, please assign server.host in your configuration file"
    );
    return url;
  }
  return CONFIG.server.host + url;
});

// ------------------------------------------
//  STRING
// ------------------------------------------

const RXP_JSFIELD = /^[a-zA-Z0-9\._]+$/;
const getByStringFast = (exports.getByStringFast = (obj, str, def) => {
  if (!str) return def;
  try {
    let tmp = obj;
    for (let field of str.split(".")) {
      if (tmp[field] === undefined) {
        return def;
      }
      tmp = tmp[field];
    }
    return tmp;
  } catch (err) {
    return def;
  }
});

const getByString = (exports.getByString = (obj, str, def) => {
  if (!str) return def;
  if (RXP_JSFIELD.test(str)) {
    return getByStringFast(obj, str, def);
  }
  let ctxt = { data: obj, value: undefined };
  const context = new vm.createContext(ctxt);
  const script = new vm.Script("value = data." + str);
  try {
    script.runInContext(context);
  } catch (ex) {
    return def === undefined ? ex.message : def;
  }

  let result = ctxt.value === undefined ? def : ctxt.value;
  return result;
});

const setByStringFast = (exports.setByStringFast = (obj, str, value, error) => {
  if (!str) return def;
  try {
    let fields = str.split(".");
    let tmp = obj;
    for (let i = 0; i < fields.length; i++) {
      let field = fields[i];
      if (i === fields.length - 1) {
        tmp[field] = value;
        return;
      }
      if (tmp[field] === undefined) {
        return; // Should we create the object instead ?
      }
      tmp = tmp[field];
    }
  } catch (ex) {
    if (error) error(ex);
    else console.log(ex);
  }
});

const setByString = (exports.setByString = (obj, str, value, error) => {
  if (!str) return;
  if (RXP_JSFIELD.test(str)) {
    return setByStringFast(obj, str, value, error);
  }
  let ctxt = { data: obj, value: value };
  const context = new vm.createContext(ctxt);
  const script = new vm.Script("data." + str + "=value");
  try {
    script.runInContext(context);
  } catch (ex) {
    if (error) error(ex);
    else console.log(ex);
  }
});

const setContextValue = (exports.setContextValue = (
  RED,
  node,
  data,
  str,
  value,
  type
) => {
  try {
    if (type === "msg") {
      RED.util.setMessageProperty(data, str, value);
      return true;
    } else if (type === "global" || type === "flow") {
      let contextKey = RED.util.parseContextStore(str);
      let target = node.context()[type];
      target.set(contextKey.key, value, contextKey.store, null);
      return true;
    }
    return false;
  } catch (err) {
    error(err);
    return false;
  }
});

const getContextValue = (exports.getContextValue = (
  RED,
  node,
  data,
  str,
  type
) => {
  if (!str) return str;
  try {
    let value = RED.util.evaluateNodeProperty(str, type, node, data, null);
    return value;
  } catch (err) {
    error(err);
    return null;
  }
});

const resolve = (exports.resolve = (str, obj, def) => {
  if (str === undefined) return str;

  str = fastResolve(str);
  if (obj === undefined) return str;

  let rgxp = /\{([a-zA-Z0-9_'"\|\.\[\]])+\}/i;
  for (let i = 0; i < 100 && rgxp.test(str); i++) {
    let match = rgxp.exec(str)[0];
    let prop = match.substring(1, match.length - 1);

    //if {obj.a|obj.b} then use obj.a if exists, obj.b otherwise
    let split = prop.split("|");
    def = split.length > 1 ? getByString(obj, split[1], def) : def;
    prop = split[0];

    //basic use case
    let value = getByString(obj, prop, "");

    //just in case : check in config
    if (value === "") {
      value = global.CONFIG ? getByString(global.CONFIG, prop, def) : def;
    }
    value = fastResolve(value);

    str = str.replace(match, value);
  }
  return str;
});

const fastResolve = str => {
  if (typeof str !== "string") return str;
  if (str.indexOf("{cwd}") >= 0) str = str.replace("{cwd}", process.cwd());
  if (str.indexOf("{timestamp}") >= 0)
    str = str.replace("{timestamp}", Date.now());

  return str;
};

// ------------------------------------------
//  EVENT
// ------------------------------------------

class NodeEmitter extends EventEmitter {}
global.VBM = global.VBM || {};
global.VBM.event_emitter = global.VBM.event_emitter || new NodeEmitter();

const emitEvent = (exports.emitEvent = (type, node, data, config) => {
  global.VBM.event_emitter.emit(type, node, data, config);
});

const listenEvent = (exports.listenEvent = (type, callback) => {
  global.VBM.event_emitter.addListener(type, callback);
});

const removeListener = (exports.removeListener = (type, callback) => {
  global.VBM.event_emitter.removeListener(type, callback);
});

const emitAsyncEvent = (exports.emitAsyncEvent = (
  type,
  node,
  data,
  config,
  callback
) => {
  if (countListeners(type) === 0) {
    return callback(data);
  }

  data._tmp = data._tmp || {};
  data._tmp["event_emitter"] = data._tmp["event_emitter"] || [];
  data._tmp["event_emitter"].push({ callback: callback, config: config });

  global.VBM.event_emitter.emit(type, node, data, config);
});

const countListeners = (exports.countListeners = type => {
  let listeners = global.VBM.event_emitter.listeners(type);
  if (!listeners) {
    return 0;
  }
  return listeners.length;
});

const fireAsyncCallback = (exports.fireAsyncCallback = data => {
  if (!data._tmp) return;
  if (!data._tmp.event_emitter) return;

  let emitterData = data._tmp.event_emitter.pop();

  if (!emitterData) return;

  let callback = emitterData.callback;

  if (!callback) return;

  callback(data);
});

// ------------------------------------------
//  TRACKING
// ------------------------------------------

let activities = {};
let oldKeys = [];
let actKey = "";

exports.trackActivities = async function trackActivities(node) {
  function nextErr(err) {
    node.status({
      fill: "red",
      shape: "ring",
      text: "Missing VISEO Bot Maker key"
    });
    node.error(err);
    return false;
  }

  if (!actKey) {
    try {
      actKey =
        (CONFIG || global.CONFIG).server.key ||
        node.context().global.get("VISEO_BOT_MAKER_KEY");
    } catch (err) {
      actKey = "";
      return nextErr("Missing VISEO Bot Maker key - Read the documentation.");
    }
  }
  if (!actKey || actKey.length !== 40 || oldKeys.indexOf(actKey) !== -1) {
    actKey = "";
    return nextErr("Missing VISEO Bot Maker key - Read the documentation.");
  }

  node.status({});
  let time = Date.now();

  if (!activities.info) {
    // First pass : set start time
    activities = { info: { start: time, key: actKey } };
  } else if (time - activities.info.start > 86400000) {
    // 24h :  24 * 3600 * 1000 = 86400000
    let logsToSend = JSON.parse(JSON.stringify(activities));
    activities = { info: { start: Date.now(), key: actKey } };
    try {
      await sendActivities(logsToSend);
    } catch (err) {
      if (err.statusCode === 401) {
        oldKeys.push(actKey);
        return nextErr("Invalid VISEO Bot Maker key - Read the documentation.");
      }
      return true;
    }
  } else {
    // Set last time
    activities.info.end = time;
  }

  if (!activities[node.type]) {
    activities[node.type] = {
      type: node.type,
      start: time,
      end: time,
      nodes: [node.id],
      calls: 1
    };
    return true;
  }

  if (activities[node.type].nodes.indexOf(node.id) === -1) {
    activities[node.type].nodes.push(node.id);
  }
  activities[node.type].calls++;
  activities[node.type].end = time;

  return true;
};

async function sendActivities(obj) {
  let body = {
    info: obj.info,
    data: []
  };

  for (let key in obj) {
    if (key === "info") continue;
    let newObj = {
      type: obj[key].type,
      start: obj[key].start,
      end: obj[key].end,
      nodes: obj[key].nodes.length,
      calls: obj[key].calls
    };
    body.data.push(newObj);
  }

  let request = {
    url:
      "https://nodedatafunction.azurewebsites.net/api/sendActivities?code=rriqcWx/cCsUQ0oxcVqTTaxsXWj5gf2AOCqhSayw8vaGaQKf6SgaQw==",
    resolveWithFullResponse: true,
    method: "post",
    json: true,
    body: body
  };

  return rp(request);
}
