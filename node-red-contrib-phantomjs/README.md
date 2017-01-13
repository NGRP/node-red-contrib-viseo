# Node-RED

A Node-RED node using PhantomJS to snapshot pages. A usecase is to snapshot pages with D3JS charts.

This node is part of project [node-red-contrib-viseo](https://github.com/NGRP/node-red-contrib-viseo) powered by [VISEO](http://www.viseo.com) Technologies.

## Quick Start

### Windows

install npm
```
npm install node-red-contrib-viseo-phantomjs
```

### Linux

Install `bzip2` to unzip phnatojs

```
sudo apt-get install bzip2
```

PhantomJS works with Ghostscript Font Type1
```
sudo apt-get install libfontconfig
sudo apt-get install fontconfig
```

Font should be installed here:
```
sudo cp fonts/arial/type1/* /usr/share/fonts/type1/
fc-cache -fv
```

Use `fc-list` command to check if font are correctly installed. The provided font name is not Arial but `A030`

Then install npm
```
npm install node-red-contrib-viseo-phantomjs
```

On Linux, for a better rendering of font, Type1 font must be added in `/usr/share/fonts/type1` and the run `fc-cache -fv`

### Demo

A demonstration flow can be imported from /demo/demo.json.

![Demo Flow](https://github.com/NGRP/node-red-contrib-viseo/blob/master/node-red-contrib-viseo-phantomjs/demo/demo.jpg?raw=true)


## Getting Help

For further help, or general discussion, please use the [github issue tracker](https://github.com/NGRP/node-red-contrib-viseo/issues) and in order to be labeled with `question` tag please specify :
- Your message is a question / discussion
- The module or node name

## Contributing

Before raising a pull-request, please read our contributing guide.

This project adheres to the Contributor Covenant 1.4. By participating, 
you are expected to uphold this code. 
Please report unacceptable behavior to any of the project's core team.

## Authors

This project is a creation of [VISEO](http://www.viseo.com) Technology.

- Jean-Philippe Encausse [@jpencausse](https://twitter.com/jpencausse)


## Copyright and license

Copyright 2016-2017 [VISEO](http://www.viseo.com) under the Apache 2.0 license.