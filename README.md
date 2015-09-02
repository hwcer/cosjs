cosjs - a node.js web server
===========================

This is a  web server for node.js.  easy to create web or mobile game server.


Install with:

    npm install cosjs

## Usage

Simple example, included as `test/index.js`:

```js
    var cosjs = require("cosjs");
    var app = cosjs();
    app.set('port',80);
	app.set('root',root);
	app.set('secret',Math.random().toString());
	app.set('views',root + '/view');
	app.set('view engine','ejs');

	app.static('wwwroot');
	app.router('all','/*/*/','api');

	var cluster = cosjs.cluster;
	cluster.fork('http',app.start,require('os').cpus().length);
	cluster.start();
```



## Demo

test/index.js
