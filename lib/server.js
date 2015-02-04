/**
 * Created by HWC on 2014/10/10.
 */
var path = require('path');
var cluster = require('cluster');

var isweb = require('./isweb')
var router = require('./router');
var config = require('../config');

exports.create = function(){
    return new server();
}

function server() {
    var self = this;

    this.apiPack = null;
    this.msgPack = null;


    this.start = function (port) {
        if (config.workers == 0) {
            config.workers = require('os').cpus().length;
        }
        if (cluster.isMaster) {
            cluster.on('exit', onExist);
            for (var i = 0; i < config.workers; i++) {
                cluster.fork();
            }
        }
        else if (cluster.isWorker) {
            ceateServer(port);
        }
    }


    function onExist(worker, code, signal) {
        var id = worker.id;
        delete(cluster.workers.id);
        console.log('worker[%d] Pid:%d exit (%s)', id, worker.process.pid, signal || code);
        cluster.fork();
    }


    function onError(server, req, res, error) {
        console.error('Error', error.stack);
        try {
            // make sure we close down within 30 seconds
            var killtimer = setTimeout(function () {
                process.exit(1);
            }, 5000);
            // But don't keep the process open just for that!
            killtimer.unref();
            // stop taking new requests.
            server.close();
            // Let the master know we're dead.  This will trigger a
            // 'disconnect' in the cluster master, and then it will fork
            // a new worker.
            cluster.worker.disconnect();
            // try to send an error to the request that triggered the problem
            res.statusCode = 500;
            res.setHeader('content-type', 'text/plain');
            if (config.debug > 0) {
                res.end(error.stack);
            }
            else {
                res.end('there was a problem!');
            }
        } catch (err) {
            // oh well, not much we can do at this point.
            console.error('Error sending 500!', err.stack);
        }
    }

//处理POST内容
    function parsePostData(req, res, callback) {
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
                res['query'][k] = $data[k];
            }
            callback();
        });
    }

//执行任务，分析用户请求
    function onRequest(req, res) {
        var urlParse = require('url').parse(req.url, true);
        var pathname = urlParse.pathname;
        if(!pathname){
            pathname = '/';
        }
        else if(pathname.indexOf('.') < 0 && pathname.substr(-1,1) != '/' ){
            pathname += '/';
        }
        res['query'] = urlParse['query'];
        //接口定位，如果定位不到则指向静态忙碌
        var api = router.get(req, res, pathname);
        var doApi = function () {
            var model = apiLoader(req, res, api);
            if (!model) {
                return false;
            }
            if (config.post) {
                parsePostData(req, res, function () {
                    model[api[1]](model.callback);
                });
            }
            else {
                model[api[1]](model.callback);
            }
        }
        if (!api) {
            isweb.route(req, res, pathname,config.static);
        }
        else if(!Array.isArray(api)){
            isweb.route(req, res, api);
        }
        else {
            doApi();
        }
    }


    function apiLoader(req, res, api) {

        var userip = function () {
            return req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                req.connection.socket.remoteAddress;
        }

        var getQuery = function (key, type) {
            var val = $.dataSelect(res['query'], key);
            if (type) {
                val = $.dataFormat(val, type);
            }
            return val;
        };

        var write = function (result) {
            if (Array.isArray(result)) {
                res.write(JSON.stringify(result));
            }
            else if (typeof result == 'object') {
                res.write(JSON.stringify(result));
            }
            else {
                res.write(result);
            }
            res.end();
        }

        var msgPack = function (code, data, args) {
            var result;
            if (code) {
                if (args) {
                    res.statusCode = args;
                }
                res.setHeader("Error-Code", code);
                result = {"code": code.toString(), "data": data};
            }
            else {
                result = {"code": null, "data": data};
                if (args) {
                    result['cache'] = args;
                }
            }
            if (config.msgid) {
                result[config.msgid] = getQuery(config.msgid);
            }
            return result;
        };

        var error = function (msg) {
            res.statusCode = 500;
            res.end(msg);
            return false;
        }

        res.setHeader("Content-Type", 'text/html; charset="'+config.charset+'"');

        var $modApi = api[0];
        var $modDir = [config.root, config.api, $modApi].join('/');
        var $modReq = require($modDir);
        var $model = $modReq[$modApi] || null;
        if (!$model) {
            return error($modApi + ' not exist');
        }
        else if (typeof $model != 'function') {
            return error($modApi + ' not is function');
        }
        $model.prototype.get = getQuery;
        $model.prototype.debug = config.debug || 0;
        $model.prototype.trust = function () {
            var ip = userip() || '';
            if (!ip) {
                return false;
            }
            var ipArr = config.trust;
            if (!ipArr) {
                return true;
            }
            var ipLen = ipArr.length;
            for (var i = 0; i < ipLen; i++) {
                var str = ipArr[i];
                var len = str.length;
                var subIP = ip.substr(0, len);
                if (subIP == str) {
                    return true;
                }
            }
            return false;
        }
        $model.prototype.header = function (key, val) {
            if (val != undefined) {
                return res.setHeader(key, val);
            }
            else {
                return req.headers[key] || null;
            }
        }
        $model.prototype.cookie = function (keys, callback) {
            if (!res['cookie']) {
                res['cookie'] = require('./cookie').create(req, res);
            }
            if (arguments.length == 0) {
                return res['cookie'];
            }
            if (typeof callback != 'function') {
                callback = $.callback;
            }
            return res['cookie'].get(keys, callback);
        }
        $model.prototype.session = function (keys, callback) {
            if (!res['session']) {
                res['session'] = require('./session').create(req, res);
            }
            if (arguments.length == 0) {
                return res['session'];
            }
            if (typeof callback != 'function') {
                callback = $.callback;
            }
            return res['session'].get(keys, callback);
        }
        $model.prototype.callback = function (code, data, args) {
            var $fun = self.msgPack || msgPack;
            var result = $fun(code, data, args);
            write(result);
        }

        if (typeof self.apiPack == 'function') {
            self.apiPack(req, res, $model);
        }
        var $object = new $model();
        var $func = api[1];
        if (!$object[$func]) {
            return error($func + ' not exist in ' + $modApi);
        }
        return $object;
    }


    function ceateServer(port) {
        console.log('worker[' + cluster.worker.id + '] start');
        var domain = require('domain');
        var server = require('http').createServer(function (req, res) {
            var d = domain.create();
            d.on('error', function (err) {
                onError(server, req, res, err);
            });
            d.add(req);
            d.add(res);
            d.run(function () {
                onRequest(req, res);
            });
        }).listen(port);
    }


}