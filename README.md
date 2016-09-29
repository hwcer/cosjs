cosjs - a node.js http & socket server
===========================

This is a  web http & socket for node.js.  easy to create web or mobile game server.


Install with:

    npm install cosjs

## Usage

Simple example, included as `demo/index.js`:

```index.js
    var cosjs = require('../index');
    var config = require('./config');
    cosjs.http(config.http);
    cosjs.socket(config.socket);
    cosjs.start();
```

```config.js
    var root = __dirname;
    exports = module.exports = {
        debug: 1,
        cache   : '127.0.0.1:6379',
        mongodb : '127.0.0.1:27017/test',
    }

    exports.http = {
        'port'    : 80,
        'root'    : root + '/http',
        'shell'   : root+'/process/http',
        'host'    : '127.0.0.1',
        'worker'  : 0,
        'static'  : {route:'/',handle: 'wwwroot'},
        'server'  : [
            {route:'/api/:m/(*)?',handle:'handle',method:'all',output:'jsonp',subpath:4}
        ],
    };
```

## Demo

demo/index.js
