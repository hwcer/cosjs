var root=__dirname;
var cosjs = require('../index');
var app = cosjs();
app.set('port',80);
app.set('root',root);
app.set('secret','123456');
app.set('views',root + '/view');
app.set('view engine','ejs');
//session配置
app.set('session id','sessid');                       //session id
app.set('session lock',true);                         //是否开启session锁
app.set('session dtype','redis');                    //session 存储类型 redis/momgo/object(自定义对象)
app.set('session dbase','127.0.0.1:27017');         //session 存储数据库(redis/mongo)地址
app.set('session expire',3600);                       //session 有效期(redis有效,mongo需后台程序清理)

app.set('msgPack',function(req,res,data){
    data['time'] = new Date().getTime();
});

app.static('wwwroot');
app.router('get','/*/*/:sid/','api');

//开启多进程
var cluster = cosjs.cluster;
cluster.fork('http',app.start,require('os').cpus().length);
//开启远程管理模式
cluster.fork('manage', require('./manage').start);
//启动群集所有子进程，此函数只能调用一次，必须将所有需要启动的进程都添加进群集（cluster.fork）中之后统一启动
cluster.start();
//*******群集启动后（cluster.start）后面不要在执行任何代码，否则每个子进程都会执行一遍此处代码