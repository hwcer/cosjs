
//默认,路由: /test/
exports = module.exports = function(){
    var self = this;
    setTimeout(function(){
        self.callback(null,self.session.uid);
    },50);
}

//路由: /test/index
exports.index = function(){
    return this.callback(null,this.path);
}


//路由: /test/error
exports.error = function(){
    return this.callback('error', 'test error');
}