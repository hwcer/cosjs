/**
 * 静态文件服务器
 * Created by wanchao.huang on 2014/12/26.
 */

var fs = require('fs');
var path = require("path");
var zlib = require("zlib");
var mime = require("./mime").types;
var config = require("../config");

var error = function(req,res,file){
    res.writeHead(404, "not found", {'Content-Type': 'text/html; charset="utf-8"'});
    res.end('"'+ file + '" not exist');
}

var contentType = function(ext){
    var ctype = mime[ext] || "text/plain";
    if(Array.isArray(ctype)){
        return ctype[0];
    }
    else{
        return ctype;
    }
}


exports.route=function(req, res, pathname, dirname) {

    //res.setHeader("Access-Control-Allow-Origin", "*");
    //res.setHeader("Access-Control-Allow-Headers", "X-Requested-With");
    //res.setHeader("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    var root,file,ext,realPath;
    if(!pathname) {
        var urlParse = require('url').parse(req.url, true);
        pathname = urlParse.pathname;
    }
    ext = path.extname(pathname);
    if (!ext) {
        file = path.normalize(pathname + '/index.html');
        ext = '.html';
    }
    else{
        file = pathname;
    }

    if(dirname){
        root = [config['root'],dirname].join('/');
    }
    else{
        root = config['root'];
    }

    realPath = [root ,file].join('/');

    fs.stat(realPath, function (err, stats) {
        if (err) {
            return error(req,res,pathname);
        }
        if (stats.isDirectory()) {
            return res.end("the request " + file + " is not file");
        }

        ext = ext ? ext.slice(1) : 'unknown';
        var type = contentType(ext);

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