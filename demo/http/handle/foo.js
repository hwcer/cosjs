//路由: /foo/
module.exports = function(callback){
    var fooModel = this.model('foo');
    callback(null,fooModel.test());
}
//路由: /foo/index
module.exports.index = function(callback){
    return callback(null,this.path);
}
