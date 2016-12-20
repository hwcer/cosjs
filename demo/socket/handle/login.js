
/**
 * 登录信息
 */
exports = module.exports = function (name) {
    var uid = this.socket.id;
    var data = {name:name,uid:uid};
    this.data = data;
    this.socket.send('login',data);
    //this.broadcast().send('online',data);
};


function random(min,max){
    var key = max - min + 1;
    var val = min + Math.floor(Math.random()*key);
    return val;
}
