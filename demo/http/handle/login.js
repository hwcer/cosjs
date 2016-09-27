//登录，
//路由: /login/
exports = module.exports = function(callback){
    var uid = '10000';
    var data = {"uid":uid,"name":"test"};
    this.session.create(uid,data,callback);
}
