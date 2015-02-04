/**
 * 正式环境启动：node index
 * 调试环境启动：node index 1
 */
//var cosjs = require('cosjs')
var cosjs = require('../index')
var debug = parseInt(process.argv[2] || 0);
var root  = __dirname;

var server = new cosjs.http();
//debug状态
server.set('debug', debug);
//程序根目录
server.set('root',  root);
//前端接口目录，相对于root root + '/' + api）
server.set('api',   'api');
/**
 * 静态文件目录,相对于root（root + '/' + api）
 * 静态服务器在api路由匹配失败或者路由返回一个路径时自动执行
 * 访问方式:http://URL/index.html ; http://URL/js/jquery.js
 */
server.set('static','wwwroot');
//IP信任列表
server.set('trust', ["119.15.138","127.0.0.1","10.96.29"]);
//MSGID 前端发送，后端原样返回
server.set("msgid","msgid");
//关闭POST数据
server.set("post",false);
//启动worker进程数量，默认：0, CPU个数
server.set("workers",0);
/**
 * 公共模块路径
 * 公共模块可以供多个程序共享使用，比如数据层可以供游戏逻辑和后台管理程序共同使用
 * 公共模块调用：var userMod = $.loader('mod/user');var gameLib = $.loader('lib/game')
 * $.loader 可以也代替 require ，如 $.loader('api/test') == require('./api/test');
 * $.loader 加载文件路径以root为根目录,
 * 共享目录为绝对路径
 */
server.set("share",{
    "lib":'/data/share',
    "mod":'/data/share'
});
/**
 * server.apiPack 在实例化api前可以为api附加公共属性,这些属性可以在所有api中使用this调用
 * 如下面示例，在api/test.js 中 可以使用this.sid ; this.display() 等方法
 */

server.apiPack(function(req,res,api){
    //use sid(server id) on the api
    api.prototype.sid =  res.sid || 0;
    //use ejs as api.display
    api.prototype.display = function (tpl, data) {
        var ejs = require('ejs');
        var ext = require('path').extname(tpl);
        if (!ext) {
            tpl = tpl + '.html';
        }
        var file = root+'/view/'+tpl;
        var text = require('fs').readFileSync(file, 'utf8');
        var html = ejs.render(text, data);
        res.end(html);
    };
    //api.redirect
    api.prototype.redirect = function (url) {
        res.writeHead(301, { 'Location': url});
        res.end(url);
    }
});

/**
 * server.msgPack 对api中使用this.callback返回的结果进行统一包装并输出到客户端
 * 注意：如果 server.msgPack（function）被定义，cosjs不会再调用系统默认的msgPack来包装输出结果
 * api中的callback有两种模式
 * 错误：callback(err,args,[statusCode])  ;statusCode 状态码，默认 200
 * 成功：callback(null,data,[cache])      ;data:api执行结果，cache：用来更新前端缓存，如道具，英雄数据发生的变化
 * msgPack 包装器 直接接收callback的三个参数
 */

/*
server.msgPack(function(err,ret,cache) {
    if (err) {
        return {"code": err, "data": ret};
    }
    else {
        return {"code": null, "data": ret,"cache":cache};
    }
});
*/

/********************router(当路由全部匹配失败，则自动指向静态目录使用静态服务器)*********************/
/**
 * 针对性访问api/test.js下的接口，
 * 比如一些调试性接口的路由，可以在debug > 0 情况下开启
 * 格式：http://URL/test/index
 */
server.router('/test/', function (req, res, name) {
    res.sid = 1;
    var arr = name.split('/');
    if(debug > 0) {
        return ['test', arr[2] || 'index'];   //debug状态
    }
    else{
        return ['test','error'];             //非DEBUG状态下指向特定接口
    }
});

/**
 * 访问api下的所有接口，
 * 格式：http://URL/api/test/index
 * api 可以随意改变，只想要改变url中api对应字符就行了
 * 如 server.router('/cmd/',function(){}) URL就变成了：http://URL/cmd/test/index
 */
server.router('/api/', function (req, res, name) {
    res.sid = 1;
    var arr = name.split('/');
    return [arr[2],arr[3]];
});

/**
 * 游戏常用方式
 * 格式：http://URL/Sn/test/index
 * Sn中n为服务器ID
 * 如:http://URL/S1/test/index,这样程序就知道用户当前访问的是1服
 * 建议：每个服务器的（数据库）配置放在一个单独的文件中，根据URL中的Sn来选择不同的数据库配置，这样一台服务器就能处理多个游戏服的数据
 * 如果使用负载均衡，前端使用负载均衡地址连接，后端根据机器负载完美实现横向扩展，同时最大化利用硬件资源，再也不用担心村服浪费资源，新服压力大了
 */
var gameServApi = new RegExp('^\/(S[0-9]{1,3})\/([a-zA-Z0-9]{2,10})\/([a-zA-Z0-9]{2,10})(|\/)$', 'i') ;
server.router(gameServApi,function(req,res,args){
    res.sid = parseInt(args[1].substr(1),10);  //设置服务器ID
    return [args[2],args[3]];
} );

/**
 * 定义一个静态服务器路由将所有http://URL/images/* 的请求全部 指向 root/images/*
 * 静态服务器默认路径是：root/static/images/*
 * 一般情况下静态服务器router不需要定义，所有静态文件丢在static目录可以直接访问
 */
server.router('/images/', function (req, res, name) {
    return name;
});
/**********************************************session**********************************************/
//session 在redis中的hash前缀，或者在mongo中的对象名
server.session('key','sess');
//session锁定，格式：[锁定时间(毫秒)，最大锁定次数],lock=null OR false 不锁定,
// [500,10] 每500毫秒内同一用户只能请求一次，出现并发时，后面的请求会delay 500MS后重新检查并执行后续操作，
//单个请求在delay 10次后会返回错误，最大锁定次数 为0时，出现并发立即报错
server.session('lock',[500,10]);
//session id 名称，
server.session('idKey','$id');
//session id保存方式，get方式下前端请求每次都需要带上$id=cookieID 这个参数，参数名由session.idKey来决定
server.session('idType',['get', 'cookie']);
//session 有效期，0-永不过期，单位：秒
server.session('expires',0);
//session 数据库（redis）配置（近期实现mongodb和自定义存储方式）
server.session('dbase',function(req,res){
    return "127.0.0.1:6379";
});
/**********************************************cookie**********************************************/
//cookie 路径
server.cookie('path','/');
//cookie domain
server.cookie('domain',null);
//cookie expires ;0:默认关闭浏览器失效
server.cookie('expires',0);
//oauth不为空开启cookie安全签名，oauth值为签名密匙，可以防止前端纂改cookie，
// 签名认证失败后无法get到cookie信息，可以认为没有用登录
server.cookie('oauth','hello cosjs');
//ooauth_key 参与签名的参数（一个数组）
server.cookie('oauth_key',['id','lastTime']);

server.start(80);