cosjs - a node.js http & socket server
===========================

This is a  web http & socket for node.js.  easy to create web or mobile game server.


Install with:

    npm install cosjs

## Usage

Simple example, included as `demo/index.js`:

```index.js
    var cosjs = require('cosjs');
    var config = require('./develop');
    cosjs.server(config);
    cosjs.start();
```

```develop.js
    var root = __dirname;
    exports = module.exports = {
        debug: 1,
		port     : 80,
		fnum     : 1,
		shell    : root+'/process/http',
    }
```

## Demo

demo/index.js
