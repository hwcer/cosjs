/**
 * Created by HWC on 2014/10/10.
 */
var url      = require("url"),
    mime     = require("./mime"),
    config   = require("../config"),
    library  = require('./library');

exports.create = function(){
    return new http();
}

var http=function() {
    var self = this,
        router   = require('./router'),
        cluster  = require('cluster'),
        cookie   = require('./cookie'),
        session  = require('./session');

    this.config  = config.http;
    //路由
    this.router = router.router;
    //静态服务器
    this.static = router.static;
    //接口封装
    this.apiPack = null;
    //消息封装
    this.msgPack = null;

    this.start = function() {
        var port = self.config['port'];
        var domain = require('domain');
        var server = require('http').createServer(function (req, res) {
            var d = domain.create();
            d.on('error', function (err) {
                onError(server, req, res, err);
            });
            //d.add(req);
            //d.add(res);
            d.run(function () {
                onRequest(req, res);
            });
        }).listen(port);
    }

    function onError(serv, req, res, error) {
        console.log(error.stack || error);
        try {
            // make sure we close down within 30 seconds
            var killtimer = setTimeout(function () {
                process.exit(1);
            }, 1000);
            // But don't keep the process open just for that!
            killtimer.unref();
            // stop taking new requests.
            serv.close();
            // Let the master know we're dead.  This will trigger a
            // 'disconnect' in the cluster master, and then it will fork
            // a new worker.
            cluster.worker.disconnect();
            // try to send an error to the request that triggered the problem
            if(!res.statusMessage){
                res['cosjs']['callback']('error','appliction crash',500);
            }
        } catch (err) {
            // oh well, not much we can do at this point.
            console.error('Error sending 500!',err.toString());
        }
    }

    //执行任务，分析用户请求
    function onRequest(req, res) {
        var cosjs = new _cosjs(req,res,self.config);
        res['cosjs'] = cosjs;
        var pathname = cosjs['pathname'];
        var api = router.match(cosjs, pathname);
        if(!api){
            cosjs['callback']('error','unknown request',404);
        }
        else if ( api[0] ) {
            apiServer(req, res, api[1]);
        }
        else {
            webServer(req, res, api[1], pathname);
        }
    }
    //处理POST内容
    function postData(req, res, callback) {
        req.setEncoding('utf-8');
        var postData = [];
        // 数据块接收中
        req.addListener("data", function (postDataChunk) {
            postData.push(postDataChunk);
        });
        // 数据接收完毕，执行回调函数
        req.addListener("end", function () {
            var $data = require('querystring').parse(postData.join(''));
            for (var k in $data) {
                res['cosjs'].set(k,$data[k]);
            }
            return callback();
        });
    }

    function apiServer(req, res, api) {
        var arr = api.split('/');
        var fun = arr.pop();
        var object = apiLoader(req, res, arr);
        if (!object) {
            return false;
        }
        if (!object[fun]) {
            return res['cosjs']['callback']('error',fun + ' not exist in ' + arr.join('/') );
        }
        if (self.config['post']) {
            postData(req, res, function () {
                object[fun]();
            });
        }
        else {
            object[fun]();
        }
    }

    function webServer(req, res, dir, pathname) {
        var fs = require('fs');
        var zlib = require("zlib");
        var root = config['root'];

        var file = pathname;
        if(file.indexOf('.')<0){
            file += 'index.html';
        }
        var realPath = [root,dir,file].join('/');
        fs.stat(realPath, function (err, stats) {
            if (err) {
                return res['cosjs']['callback']('error',pathname+' not exist',404);
            }
            if (stats.isDirectory()) {
                return res['cosjs']['callback']('error',"the request " + pathname + " is not file",500);
            }
            var type = mime.parse(file);

            res.setHeader("Content-Type", type+'; charset="utf-8"');

            var lastModified = stats.mtime.toUTCString();
            var ifModifiedSince = "If-Modified-Since".toLowerCase();
            res.setHeader("Last-Modified", lastModified);

            if (req.headers[ifModifiedSince] && lastModified == req.headers[ifModifiedSince]) {
                res.writeHead(304, "Not Modified");
                return res.end();
            }

            var raw = fs.createReadStream(realPath);
            var acceptEncoding = req.headers['accept-encoding'] || "";
            if (acceptEncoding.match(/\bgzip\b/)) {
                res.writeHead(200, "Ok", {'Content-Encoding': 'gzip'});
                raw.pipe(zlib.createGzip()).pipe(res);
            } else if (acceptEncoding.match(/\bdeflate\b/)) {
                res.writeHead(200, "Ok", {'Content-Encoding': 'deflate'});
                raw.pipe(zlib.createDeflate()).pipe(res);
            } else {
                res.writeHead(200, "Ok");
                raw.pipe(res);
            }
        });
    }

    function apiLoader(req, res, apiArrPath) {
        var cosjs = res['cosjs'];
        var $modApi = apiArrPath.pop();
        var $modDir = apiArrPath.join('/') || '/';
        var $modReq = library.loader($modApi,$modDir);

        if(!$modReq){
            return cosjs['callback']( 'error','file['+$modApi + '] not exist',404);
        }

        var $model = $modReq[$modApi] || null;
        if (!$model) {
            return cosjs['callback']('error','class['+$modApi + '] not exist');
        }
        else if (typeof $model != 'function') {
            return cosjs['callback']('error',$modApi + ' not is function');
        }
        var $object = new $model();

        $object.get = cosjs['get'];

        $object.header = function (key, val) {
            if (val != undefined) {
                return res.setHeader(key, val);
            }
            else {
                return req.headers[key] || null;
            }
        }

        $object.cookie = function (keys, callback) {
            if (!cosjs['cookie']) {
                cosjs['cookie'] = cookie.create(req, res);
            }
            if (arguments.length == 0) {
                return cosjs['cookie'];
            }
            if (typeof callback != 'function') {
                callback = library.callback;
            }
            return cosjs['cookie'].get(keys, callback);
        }

        $object.session = function (keys, callback) {
            if (!cosjs['session']) {
                cosjs['session'] = session.create(req, res);
            }
            if (arguments.length == 0) {
                return cosjs['session'];
            }
            if (typeof callback != 'function') {
                callback = library.callback;
            }
            return cosjs['session'].get(keys, callback);
        }
        //输出
        $object.output = cosjs['output'];

        $object.callback = cosjs['callback'];

        if (typeof self.apiPack == 'function') {
            self.apiPack(cosjs,$object);
        }

        return $object;
    }

}


var _cosjs = function(req,res,config){
    var self = this;
    var urlParse = url.parse(req.url, true);
    var pathname = urlParse.pathname;
    if(!pathname){
        pathname = '/';
    }
    else if(pathname.indexOf('.') < 0 && pathname.substr(-1,1) != '/' ){
        pathname += '/';
    }
    this.pathname = pathname;

    this.query = urlParse['query'];

    this.host = urlParse['host'];

    this.userip = function () {
        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress || null;
        if(!ip){
            return null;
        }
        return ip.replace('::ffff:','');
    }

    this.get = function (key, type) {
        if(!self['query'] || !self['query'][key]){
            return null;
        }
        var val = self['query'][key];
        if (type) {
            val = library.dataFormat(val, type);
        }
        return val;
    }

    this.set = function(key,val){
        self['query'][key] = val;
    }

    this.output = new _output(req,res,config);

    this.callback = function(code,message,status){
        var func = config['output'];
        if(func == 'json'){
            self.output['json'](code,message,status);
        }
        else{
            res.statusCode = status || 200;
            var data = code ? [code,message].join(':') : message;
            self.output[func](data);
        }
        return false;
    }

}


var _output = function(req,res,config){
    var self = this;

    this.write = function(data,ContentType){
        if(typeof data=='object'){
            data = JSON.stringify(data);
        }
        else{
            data = data.toString();
        }
        if(!ContentType){
            ContentType = "text/plain";
        }
        res.setHeader("Content-Type", ContentType + '; charset="' + config['charset']+'"');
        res.write(data);
        res.end();
        //结束SESSION
        if( res['cosjs']['session'] ){
            res['cosjs']['session']['finish']();
        }
    }

    this.binary = function(name,data){
        var ContentType = mime.parse(name);
        res.setHeader("Content-Length", data.length);
        res.setHeader("Content-Disposition", "attachment; filename=" + name);
        self.write(data,ContentType);
    }

    this.html = function(html){
        self.write(html,"text/html");
    }

    this.text  = function(text){
        self.write(text,"text/plain");
    }

    this.json = function (code, data, SC) {
        var result = {"code": code || null, "data": data};
        if (code) {
            res.statusCode = SC || 200;
        }
        else if (SC) {
            result['cache'] = SC;
        }
        if(self['msgPack']){
            self['msgPack'](res['cosjs'],result);
        }
        var text = JSON.stringify(result);
        var type = "text/plain";
        if (config['jsonp']) {
            var jsonp = res['cosjs']['get'](config['jsonp']);
            if (jsonp) {
                text = jsonp + '(' + text + ')';
                type = 'text/plain';
            }
        }
        self.write(text,type);
    };

}