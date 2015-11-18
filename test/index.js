
var cosjs = require('../index');
//===================test cluster========================//

cosjs.fork('test1',1,function(){
    console.log('test1 start');
});
//test2 进程数量为0,不会自动启动
cosjs.fork('test2',0,function(){
    console.log('test2 start');

});

cosjs.fork('test3',1,function(){
    console.log('test3 start');
    //启动test2
    process.send('start test2');
    //重启test1
    process.send('restart test1');
    //自己也没事了 可以关闭了
    process.exit();  //process.send('stop test3');
});
//===================database pool========================//
cosjs.pool.set('cache','redis','127.0.0.1:6379');    //REDIS 缓存
//===================http cluster========================//
var app = cosjs.http();
//start session
app.use(cosjs.session);
app.set('session id','_id');                               //session id ,通过此id前端向后端[get,post]传session认证信息
app.set('session key','cache');                           //session 在cache中的前缀
app.set('session lock',[5,500]);                          //每次锁定500MS 最多5次,false:关闭session锁
app.set('session secret','cosjs');                       //SESSION 密匙
app.set('session storage','cache');                     //存储,必须为pool中一个REDIS连接名称,或者自定义的数据库操作对象
app.set('session expire',7200);                          //session过期时间(S)
//use Route
app.loader( 'get','/api/*/*/',__dirname+'/api/');
//===================start cluster========================//
cosjs.start();



