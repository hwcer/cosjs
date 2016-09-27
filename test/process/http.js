//http启动脚本
var cosjs = require('cosjs');
var cookie = require('cookie-parser');
cosjs.on('restart',cosjs.restart);

exports = module.exports = function(port,root){
    //设置数据库
    var pool = cosjs.pool();
    pool.redis( 'redis','192.168.2.250:6379');
    pool.mongodb( 'mongodb','192.168.2.250:27017/test');

    var app = cosjs.http();
    app.set('views',root+'/views');
    app.set('view engine','ejs');

    //启动service服务器
    var server_route    = '/api/*';
    var server_root     = root+ '/handle/api';
    var server_options  = {method:'all',output:'jsonp',subpath:4};
    var session_options = {secret:'123',redis:pool.get('redis'),level:2 };

    app.session(server_route,session_options);  //开启SESSION
    app.use(server_route,cookie());
    app.use('/api/login/',function(req,res,next){
        req.session.level = 0;
        next();
    });


    app.server(server_route,server_root,server_options);
    //启动动态HTML服务器
    var server_route    = '/view/*';
    var server_root     = root+ '/handle/view';
    var server_options  = {method:'all',output:'view',subpath:5,views:{'error':'404'}  };
    app.server(server_route,server_root,server_options);
    //启动静态服务器
    var static_root = root+ '/wwwroot';
    app.static('/',static_root);

    app.listen(port);
};


