cosjs - a node.js web server
===========================

This is a  web server for node.js.  easy to create web or mobile game server.


Install with:

    npm install cosjs

## Usage

Simple example, included as `test/index.js`:

```js
    var cosjs = require('cosjs');
	var app = cosjs.http();
	app.get('/*/*/',function(req,res,next){
        var file = __dirname + '/api/'+ req.params[0];
        var fun = req.params[1];
        app.loader(req,res,file,fun);
    });
	cosjs.start();
```



## Demo

test/index.js
