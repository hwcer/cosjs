//数据绝对一致性:当进程获得进程锁时,将会强制重新获取SESSION,一般需要在SESSION中存放缓存数据时才使用

exports = module.exports = {
    key     : "_sid",                             //session id key
    guid    : true,                              //使用guid作为session id
    method  : "cookie",                          //session id 存储方式,get,post,path,cookie

    level  : 1,                                //安全等级，0:不验证,1:基本验证,2:基本验证+进程锁,3:基本验证+进程锁+数据绝对一致性
    redis  : null,                             //redis options
    crypto : null,                              //对称加密方式
    secret : 'cosjs session',                 //加密字符串
    prefix : "session",                       //session hash 前缀
    expire : 86400,                             //有效期,S
    lockNum : 5,                                //level >=2 ,被锁定时,累计等待次数,超过此值会返回失败
    lockTime : 200,                             //level >=2 ,被锁定时,每次等待时间
}