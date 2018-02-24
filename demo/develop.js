"use strict";
var root = __dirname;

module.exports = {
	root : root,
	debug: 1,
	port     : 80,
	fnum     : 1,
	shell    : root+'/process/http',
	session  : {redis:"192.168.2.250",level:2,lockNum:10},
}