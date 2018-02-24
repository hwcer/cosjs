
exports = module.exports = function(){
    var uid = '1001';
    var data = {uid:uid,name:"test",vip:10,lv:100}
    this.session.create(uid,data,this.callback);
}