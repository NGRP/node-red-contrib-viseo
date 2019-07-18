# Node-RED

[channel] SARAH home automation channel nodes.

Node-RED nodes to trigger windows `.exe` command line interface (CLI) for SARAH

This module is part of project [node-red-contrib-viseo](https://github.com/NGRP/node-red-contrib-viseo) powered by [VISEO](http://www.viseo.com) Technologies.

This module is the v5 of [SARAH project](http://sarah.encausse.net)


## Quick Start

```
npm install node-red-contrib-viseo-sarah
```

## Getting Started

### Speak

The `speak` node is a windows CLI that use Microsoft Speech Synthesis to perform Speech to Text with the field defined in input parameter. By default `msg.payload`

![Speak](https://github.com/NGRP/node-red-contrib-viseo/blob/master/node-red-contrib-sarah/doc/speak.png?raw=true)

The process will use the default windows 32bit voice (even on windows 64bit). To select a voice run following command  `%windir%\SysWOW64\speech\SpeechUX\sapi.cpl`

### Listen

The `listen` node is a windows CLI that use Microsoft Speech Engine to trigger action [matching given grammar](https://msdn.microsoft.com/en-us/library/hh378521.aspx) (voice command).

- Grammars are located in `/data/grammar` of the bot's folder
- Only grammar matching given local fr-FR are loaded
- The default HotWord (SARAH) can be overrided wy something else
- Speech recognition must be greater than the given confidence (0.7)

Parameters defined in a grammar will be available in the payload.

![Listen](https://github.com/NGRP/node-red-contrib-viseo/blob/master/node-red-contrib-sarah/doc/listen1.png?raw=true)

15/10/2017: In the next version, I will add rule name in the flow.

#### Sample meteo.xml (in french)

```
<grammar version="1.0" xml:lang="fr-FR" mode="voice" root="ruleMeteo" xmlns="http://www.w3.org/2001/06/grammar" tag-format="semantics/1.0">
  <rule id="ruleMeteo" scope="public">
    <example>Sarah quelle est la météo pour demain ?</example>
    <tag>out.action=new Object(); </tag>
    
    <item>Sarah</item>
    
    <one-of>
      <item>quelle est la météo</item>
      <item>est-ce qu'il pleut</item>
    </one-of>

    <item repeat="0-1">
      <one-of>
        <item>aujourd'hui<tag>out.action.date="0";</tag></item>
        <item>après demain<tag>out.action.date="2_matin";</tag></item>
      </one-of>
    </item>
    
    <tag>out.action._attributes.uri="http://127.0.0.1:8080/sarah/meteo";</tag>
  </rule> 
</grammar>
```

#### Keyword Spotting (HotWord)

Microsoft Speech Engine allow wildcard in grammars. This will allow free speech commands.
This sample provide a `WeshGros` keyword (aka Yo Bitch in english)

```
<grammar version="1.0" xml:lang="fr-FR" mode="voice"  root="ruleWildcard" xmlns="http://www.w3.org/2001/06/grammar" tag-format="semantics/1.0">
  <rule id="ruleWildcard" scope="public">
      <tag>out.action=new Object(); </tag>
      <item>Oueche gro <ruleref special="GARBAGE" /></item> 
  </rule>
</grammar>
```

You can pipe the grammar output buffer to an online Speech2Text (like Google or Bing speech) then pipe to API.ai, LUIS or any other NLP. Then according to NLP's intent and entity you can answer something

![Listen](https://github.com/NGRP/node-red-contrib-viseo/blob/master/node-red-contrib-sarah/doc/listen2.png?raw=true)

This is a very simple flow. You should connect that flow to a cloud server using WebSocket in order to centralize logic in the cloud.
You can also add more connector like Messenger, Slack, GoogleHome, ... to that cloud server.

## TODO

- Add ruleName in the flow
- Update listen.exe to return a JSON of XML Path
- Add a listen node taking a grammar as input
- Add an option to stop process after first match
- Add an option to stop/start listening
- How to retrieve grammar from third party plugins (spreads everywhere) ?
- Nodes listen/speak should use SocketIO or DirectLine to communicate with a Server. In case of SocketIO we should add an algorithm to handle replies and prompts.

## Getting Help

A documentation is available on [this Wiki](https://github.com/NGRP/node-red-viseo-bot/wiki).

For further help, or general discussion, please use the [github issue tracker](https://github.com/NGRP/node-red-contrib-viseo/issues) and in order to be labeled with `question` tag please specify :
- Your message is a question / discussion
- The module or node name

## Contributing

This project adheres to the Contributor Covenant 1.4. By participating, you are expected to uphold [this code](https://www.contributor-covenant.org/). Please report unacceptable behavior to any of the project's core team.

## Authors

This project is a creation of [VISEO](http://www.viseo.com) Technology.

- Jean-Philippe Encausse [@jpencausse](https://twitter.com/jpencausse)
- Klervi Menoret [@klervix](https://github.com/klervix)
- To-Thi Hoang
- Alice Vasseur [@Alice_Vasseur](https://twitter.com/Alice_Vasseur)

## Copyright and license

Copyright 2016-2019 [VISEO](http://www.viseo.com) under the Apache 2.0 license.
Copyright 2012-2019 [SARAH](http://sarah.encausse.net) under the Apache 2.0 license.