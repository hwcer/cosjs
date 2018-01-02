"use strict";
const util = require('util');
const emitter = require('events');

function cosjs_agents(app){
    if (!(this instanceof cosjs_agents)) {
        return new cosjs_agents(app)
    }
    this.app = app;
    this.agents = {};
}

util.inherits(cosjs_agents, emitter);

exports = module.exports = cosjs_agents;

cosjs_agents.prototype.login = function(sid,uid,data){
    var socket = this.app.sockets.sockets[sid];
    if(!socket){
        return false;
    }
    if( this.agents[uid] ){
        var agent = this.agents[uid];
        if( agent.sid ){
            disconnect.call(this,agent.sid);
        }
        agent.reset(sid,uid,data);
    }
    else{
        var agent = cosjs_agent(this.app,sid,uid,data);
        this.agents[uid] = agent;
        this.emit("login",uid);
    }
    socket.uid = uid;
    socket.on('disconnect', ()=>{
        if(socket.uid ){
            logout.call(this,socket.id,socket.uid);
        }
    });
}


function logout(sid,uid){
    if(!this.agents[uid]){
        return false;
    }
    var agent = this.agents[uid];
    if( agent['sid'] && agent['sid'] === sid){
        delete this.agents[uid];
        this.emit('logout',uid);
    }

}


function disconnect(sid){
    var socket = this.app.sockets.sockets[sid];
    if(!socket){
        return false;
    }
    delete socket.uid;
    socket.disconnect(true);
}



function cosjs_agent(app,sid,uid,data) {
    if (!(this instanceof cosjs_agent)) {
        return new cosjs_agent(app,sid,uid,data)
    }
    this.app = app;
    this.sid = sid;
    this.data = data;
}


cosjs_agent.prototype.emit = function(){
    var socket = this.app.sockets.sockets[this.sid];
    if(!socket){
        return false;
    }
    socket.emit.apply(socket,arguments);
}

cosjs_agent.prototype.send = function(){
    var socket = this.app.sockets.sockets[this.sid];
    if(!socket){
        return false;
    }
    socket.send.apply(socket,arguments);
}



cosjs_agent.prototype.get = function(key){
    if(!this.data || !key ){
        return this.data
    }
    else{
        return this.data[key]||null;
    }
}

cosjs_agent.prototype.set = function(key,val){
    if(!this.data  ){
        this.data = {};
    }
    if(typeof key === 'object'){
        for(var k in key){
            this.data[k] = key[k];
        }
    }
    else{
        this.data[key] = val;
    }
}

cosjs_agent.prototype.reset = function(sid,uid,data){
    this.sid = sid;
    this.data = data;
}