
<h3 align="center">- Node-RED open-source nodes -</h3>
<h1 align="center">
  <a href="https://bot.viseo.io">
    <img src="https://v1zo.viseo.io/static/ban2.png" alt="VISEO Bot Maker" width="100%">
  </a>
  <a href="https://bot.viseo.io/"><img src="https://v1zo.viseo.io/static/web2.png" alt="VISEO Bot Maker" width="120"></a>
  <a href="https://github.com/NGRP/node-red-contrib-viseo/wiki/Getting-started"><img src="https://v1zo.viseo.io/static/doc2.png" alt="VISEO Bot Maker" width="120"></a>
  <a href="mailto:contact@viseo.io"><img src="https://v1zo.viseo.io/static/mail2.png" alt="VISEO Bot Maker" width="120"></a>
</h1>

<p align="center"><i>
  This project contains a set of Node-RED nodes open-sourced by </i><b><a href="http://www.viseo.com/">VISEO</a></b><i> to build smart applications and conversational assistants.</i>
</p>
<br>
 
 
 ## About VISEO Bot Maker
 ### Features

<br>

VISEO Bot Maker is a framework built on top of Node-RED. This is also the full re-engineering V5 of the smart-home assistant [SARAH](http://sarah.encausse.net), architectured by [@jpencausse](https://twitter.com/jpencausse) in 2012.

<br>
<img src="https://v1zo.viseo.io/static/archi.png" alt="VISEO Bot Maker channels" width="100%">
<br>

Different **bot Servers** nodes act as adapters between the flow and text or voice channels, allowing your program to behave independently of the channel. 

As Node-RED is a graphical programming tool, it makes easy for both developers and administrators to create complete conversationnal flows and to connect to multiple channels.



### Development



The roadmap is available on [this GitHub Project](https://github.com/NGRP/node-red-contrib-viseo/projects/1).

Note that [VISEO](http://www.viseo.com/) is not a Software Editor but a Consulting Company (1300 people). Since 2016, everybody wants to build its own bot. We believe that the key is to **focus on User Exprience** because technologies are not mature. That's why:
- we chose Node-RED platform to let developpers switch between pieces of NLP, Computer Vision, etc ...
- we open-sourced our work to share the state of the art between our customers

**If you are** a company **looking for experts** to build a project of textual and/or vocal conversationnal assistant, feel free to contact us: **contact [at] viseo [dot] io**



---

## Getting started

A documentation is available on [this GitHub Wiki](https://github.com/NGRP/node-red-contrib-viseo/wiki/Getting-started)

## Getting Help

For further help, or general discussion, please use the [github issue tracker](https://github.com/NGRP/node-red-contrib-viseo/issues) and in order to be labeled with `question` tag please specify :
- Your message is a question / discussion
- The module or node name

## Developers

All framework modules are installed with NPM. 
Custom private modules should be deployed in a `node-red-contrib` directory. 
(The project template already contains this directory)


Update `nodesDir` property of [Node-RED configuration](https://nodered.org/docs/configuration) to use absolue path to the `node-red-contrib` folder as a module repository.

## Contributing

Before raising a pull-request, please read our contributing guide.

This project adheres to the Contributor Covenant 1.4. By participating, 
you are expected to uphold this code. 
Please report unacceptable behavior to any of the project's core team.

## Copyright and license

Icons are made by [Freepik](http://www.freepik.com) from [Flaticon](http://www.flaticon.com) is licensed by [CC 3.0 BY](http://creativecommons.org/licenses/by/3.0/)

Copyright 2016-2017 [VISEO](http://www.viseo.com/) under the Apache 2.0 license.
