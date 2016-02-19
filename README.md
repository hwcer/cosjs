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
        res.end("success");
    });
	cosjs.start();
```



## Demo

test/index.js
