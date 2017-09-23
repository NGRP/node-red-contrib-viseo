"use strict";

const fs      = require('fs');
const helper  = require('node-red-viseo-helper');

/**
 * Locale is defined in bot builder with the following order:
 * https://docs.botframework.com/en-us/node/builder/chat/localization
 * 
 * - Locale saved by calling session.preferredLocale(). This value is stored in session.userData['BotBuilder.Data.PreferredLocale'].
 * - Detected locale assigned to session.message.textLocale.
 * - Bots configured default locale.
 * - English (‘en’).
 * 
 * It is stored in session.preferredLocale()
 */

let LOCALES = {};
const tryLoadJSON = (file, path) => {
    let idx = file.indexOf('.json');
    if (idx < 0) return;

    let locale = file.substring(0, idx).toLowerCase();
    let json = fs.readFileSync(path);
        json = JSON.parse(json);
    LOCALES[locale] = json;
    console.log("Loading locale: " + locale + " for " + path);
}

exports.init = () => {
    let folder = '{cwd}/data/locales';
        folder = helper.resolve(folder);
    if (!fs.existsSync(folder)){ return; }

    let files  = fs.readdirSync(folder);
    for (let file of files){
        let path = folder + '/' + file;
        if (fs.statSync(path).isDirectory()) continue;
        try {
            tryLoadJSON(file, path);
        } catch(ex){ console.log(ex); }
    }
};

exports.translate = (locale, key, def) => {
    if (!locale) return def || key;
    locale = locale.toLowerCase();

    let cleanKey = key.replace(/^\s*(.+)\s*$/mg,'$1').trim();
    
    if (LOCALES[locale]){
        let value = LOCALES[locale][cleanKey]
        if (value) return value;
    }
    if (LOCALES['default']){
        let value = LOCALES['default'][cleanKey]
        if (value) return value;
    }

    return def || key; 
    
}

exports.resolve = (data) => {
    let session = data.context.session;
    if (!session) return;
    
    return session.preferredLocale();
}