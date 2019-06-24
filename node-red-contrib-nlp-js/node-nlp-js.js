'use strict';

const helper = require('node-red-viseo-helper');
const { SimilarSearch, SentimentManager, Language } = require('node-nlp');
const fs = require('fs');

let sentimentAnalyzer;
let languageGuesser;
let loadedFile;

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function (RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        let node = this;

        if (config.model) {
            node.conf = RED.nodes.getNode(config.model); 

            if (fs.existsSync(node.conf.file)) {
                node.conf.manager.load(node.conf.file);
                loadedFile = node.conf.file;
            }

        }
        
        this.on('input', (data)  => { input(node, data, config); });
    }
    RED.nodes.registerType('nlp-js', register, {});
};


async function input (node, data, config) {

    // Log activity
    try { setTimeout(function() { helper.trackActivities(node)},0); }
    catch(err) { console.log(err); }

    // Action
    let action = config.action;
    let output = config.output || 'payload';
    let input = (config.inputType === "msg") ?  helper.getByString(data, config.input || 'payload') : config.input || 'payload';

    // Language(s)
    let language = config.language;
    if (language && config.languageType === "msg") language = helper.getByString(data, language);
    if (language) {
        if (typeof language === "object" && !language.length) language = [];
        if (typeof(language) === "string") {
            try {         language = JSON.parse(language); }
            catch(err) {  language = [language]; }
        }
    }

    // Similar
    if (action === 'similar') {
        let similar = new SimilarSearch({ normalize: config.normalize, useCollation: config.useCollation });
        let text2 = (config.compareType === "msg") ?  helper.getByString(data, config.compare) : config.compare;
        
        try {
            let result = (config.similar === getSimilarity) ? similar.getSimilarity(input, text2) : similar.getBestSubstring(input, text2);
            helper.setByString(data, output, result);
            return node.send([data, undefined]);
        }
        catch(err) {
            node.error(err);
            return node.send([undefined, data]);
        }
    }

    if (action === "sentiment") {  
        sentimentAnalyzer = sentimentAnalyzer || new SentimentManager(); 

        try {
            let result = await sentimentAnalyzer.process(language[0] || 'en', input);
            helper.setByString(data, output, result);
            return node.send([data, undefined]);
        }
        catch(err) {
            node.error(err);
            return node.send([undefined, data]);
        }
    }

    if (action === "language") {
        languageGuesser = languageGuesser || new Language();

        try {
            let result = (language.length > 0) ? language.guessBest( input, language) : languageGuesser.guess(input);
            helper.setByString(data, output, result);
            return node.send([data, undefined]);
        }
        catch(err) {
            node.error(err);
            return node.send([undefined, data]);
        }
    }

    if (!node.conf) {
        node.error("No configuration found.");
        return node.send([undefined, data]);
    }

    let file = node.conf.file;
    if (action === "process") {

        try {
            if (!loadedFile || loadedFile !== file) {

                if (!fs.existsSync(file)) {
                    node.error("No model file found.");
                    return node.send([undefined, data]);
                }
                node.conf.manager.load(file);
                loadedFile = file;
            }            

            let result = (language.length > 0) ? await node.conf.manager.process(language[0], input) : node.conf.manager.process(input);
            let formattedResponse = {
                query: result.utterance,
                intent: result.intent,
                score: result.score,
                entities: result.entities,
                source: "nlpjs",
                completeResponse: result
            }

            helper.setByString(data, output, formattedResponse);
            return node.send([data, undefined]);
        }
        catch(err) {
            node.error(err);
            return node.send([undefined, data]);
        }
    }

    if (action === "train") {
        let source = input;
        node.conf.manager.clear();

        try {
            if (typeof source === "string") source = JSON.parse(source);
            if (!source.languages)  throw ("languages missing");
            if (!source.utterances) throw ("utterances missing");
            if (!source.entities) source.entities = [];
            if (!source.answers) source.answers = [];

            for (let language of source.languages) {
                node.conf.manager.addLanguage(language);
            }
            
            for (let i=0; i<source.utterances.length; i++) {
                let utterance = source.utterances[i];
                if (!utterance.value)  throw ("value missing for utterance " +i);
                if (!utterance.intent) throw ("intent missing for utterance " +i);
                node.conf.manager.addDocument(utterance.language || source.languages[0], utterance.value, utterance.intent);
            }

            for (let entity of source.entities) {
                if (!entity.type) throw ("type missing for entity");
                if (!entity.name) throw ("name missing for entity");

                switch(entity.type) {

                    case "enum":
                        node.conf.manager.addNamedEntityText(entity.name, entity.value, entity.languages || source.languages, entity.enum);
                        break;
                    case "regex":
                        node.conf.manager.addRegexEntity(entity.name, entity.languages || source.languages, new RegExp(entity.regex));
                        break;
                    case "trim":
                        let ent =  node.conf.manager.addTrimEntity(entity.name);
                        let lang = entity.languages || source.languages;
                        for (let trim of entity.trim) {
                            if (trim.type === "between") ent.addBetweenCondition(lang, trim.condition[0], trim.condition[1]);
                            if (trim.type === "after") ent.addAfterCondition(lang, trim.condition);
                            if (trim.type === "afterFirst") ent.addAfterFirstCondition(lang, trim.condition);
                            if (trim.type === "afterLast") ent.addAfterLastCondition(lang, trim.condition);
                            if (trim.type === "before") ent.addBeforeCondition(lang, trim.condition);
                            if (trim.type === "beforeFirst") ent.addBeforeFirstCondition(lang, trim.condition);
                            if (trim.type === "beforeLas") ent.addBeforeLastCondition(lang, trim.condition);
                        }
                        break;
                }
            }

            for (let answer of source.answers) {
                node.conf.manager.addAnswer(answer.language || source.languages[0], answer.intent, answer.value, answer.condition);
            }

        }
        catch(err) {
            node.error(err);
            return node.send([undefined, data]);
        }

        console.log("start training")
        const hrstart = process.hrtime();
        await node.conf.manager.train();
    
        let hrend = process.hrtime(hrstart);
        let result = {
            "s": hrend[0] + 's',
            "ms" : hrend[1] / 1000000
        }

        console.log("end training")
        node.conf.manager.save(file);
        if (loadedFile && loadedFile === file) loadedFile = null;

        helper.setByString(data, output, result);
        return node.send([data, undefined]);
        
    }
};
