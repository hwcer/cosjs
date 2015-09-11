cosjs - a node.js web server
===========================

This is a  web server for node.js.  easy to create web or mobile game server.


Install with:

    npm install cosjs

## Usage

Simple example, included as `test/index.js`:

```js
    var express = require('express');
    var app = express();
    var cosjs = require('cosjs')(app);

	app.get('/*/*/',function(req,res){
        cosjs.handle(req,res,'api/'+req.params[0],req.params[1],{"session":true});
    });

    var cluster = cosjs.cluster;
    cluster.fork('http',cosjs.start ,require('os').cpus().length);
    cluster.start();
```



## Demo

test/index.js
