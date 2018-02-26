exports = module.exports = function(){
    //this.session.set("foo",Date.now());


    return this.success({
        name:this.session.get('name'),
        vip:this.session.get("vip",'int'),
        lv:this.session.get("lv","int"),
        uid:this.session.get('uid'),
        foo:this.session.get('foo') }
    );
}