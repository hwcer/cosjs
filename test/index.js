var cosjs = require('../index');
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


var root = __dirname;
//===================http cluster========================//
var app = cosjs.http(80);
//start static
app.static(root + '/wwwroot');
//start server
app.server('/api/',root + '/api');


//use cosjs Route
//使用 http://127.0.0.1/api/[dir1/dir2/module/]fun            访问api目录下所有前端接口
/**
 *  http://127.0.0.1/api/login             直接访问login模块,此模块类型必须为function,参考api/login.js
 *  http://127.0.0.1/api/test/index        访问test模块下的index方法
 *  http://127.0.0.1/api/dir/test/index    访问dir目录下test模块中index方法,dir不限层数,多层使用:http://127.0.0.1/api/dir1/dir2/.../test/index
 */


////use cosjs Route as express Route
app.get('/test/*',function(req,res,next){
    cosjs.http.handle(req,res,root+'/api','test/index');
});
//===================start cluster========================//
cosjs.start();



