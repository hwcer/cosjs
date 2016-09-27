
/**
 * 登录信息
 */
exports = module.exports = function (data) {
    var uid = this.socket.id;
    var club = random(0,30);
    var group = random(1,500);
    var scene = random(1,30);
    //data['sid'] = uid;
    data['uid'] = uid;
    data['club'] = club;

    this.club = club;
    this.group = group;
    this.scene = scene;
    this.data = data;

    this.join('club',club);
    this.join('group',group);
    this.join('scene',scene);

    this.socket.send('login',data);
    //this.broadcast().send('online',data);
};


function random(min,max){
    var key = max - min + 1;
    var val = min + Math.floor(Math.random()*key);
    return val;
}
