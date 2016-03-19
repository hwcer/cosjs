cosjs - a node.js web server
===========================

This is a  web server for node.js.  easy to create web or mobile game server.


Install with:

    npm install cosjs

## Usage

Simple example, included as `test/index.js`:

```js
    var app = cosjs.http(80);
    app.static(__dirname + '/wwwroot');
    app.server('/api/',__dirname + '/api');
	cosjs.start();
```



## Demo

test/index.js
