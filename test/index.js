
var cosjs = require('../index');
var cookie = require('cookie-parser');
//===================test cluster========================//

cosjs.fork('test1',1,function(){
    console.log('test1 start');
    cosjs.message('hello',function(arg){
        console.log('test1 message:',arg);
    });
});
//test2 进程数量为0,不会自动启动
cosjs.fork('test2',0,function(){
    console.log('test2 start');

});

cosjs.fork('test3',1,function(){
    console.log('test3 start');
    setTimeout(function(){
        //启动2个test2,主进程中test2进程数量为0,不会自动启动
        cosjs.send('test2','start',2);
        //向进程1发送一个消息,执行hello命令,参数为cosjs;hello命令必须在test1中使用cosjs.message注册
        cosjs.send('test1','hello','cosjs');
        //自己也没事了 可以关闭了
        cosjs.send('test3','stop');
    },5000);
});
//===================database pool========================//
cosjs.pool.set('cache','redis','127.0.0.1:6379');    //REDIS 缓存
//===================http cluster========================//
var app = cosjs.http();
//===================静态服务器开启========================//
app.use(cosjs.static(__dirname + '/wwwroot'));

app.use(cookie());
//start session
app.use(cosjs.session({ lock:[10,500,0],store:"cache",expire:7200}));

//use express Route
app.get('/app/',function(req,res,next){
    res.end('ok');
});

//use cosjs Route
//使用 http://127.0.0.1/api/[dir1/dir2/module/]fun            访问api目录下所有前端接口
/**
 *  http://127.0.0.1/api/login             直接访问login模块,此模块类型必须为function,参考api/login.js
 *  http://127.0.0.1/api/test/index        访问test模块下的index方法
 *  http://127.0.0.1/api/dir/test/index    访问dir目录下test模块中index方法,dir不限层数,多层使用:http://127.0.0.1/api/dir1/dir2/.../test/index
 */

var route = cosjs.route(app,__dirname);
route.get('/api/','api');
//route.post('/api/','api');
//route.all('/api/','api');

//use cosjs Route as express Route
route.get('/test/',function(req,res,next){
    res.end('ok');
});
//===================start cluster========================//
cosjs.start();



