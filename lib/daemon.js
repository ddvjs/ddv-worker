/** vim: et:ts=4:sw=4:sts=4
* see: https://github.com/chengjiabao/ddv for details
*/
/*jshint node: true */
/*jshint esversion: 6 */
/*global module, process */
'use strict';
/**
 * [daemon扩展模块]
 * @author: 桦 <yuchonghua@163.com>
 * @DateTime 2016-09-18T21:12:54+0800
 * @type {Object}
 */
const mEvent = {};
//主模块
const dp = {};
//cjb_base模块
const cjb_base = require('cjb-base');
//工具类
const b = cjb_base.inherit(cjb_base) ;
//child_process模块
const child_process = require('child_process');
//fork - child_process模块
const fork = child_process.fork;

/**
 * [__construct 实例化后的初始化]
 */
dp.__construct = function(){
	//设置子进程总个数 默认一个子进程
	this.options = b.inherit(null) ;
	this.options.args = [];
	this.options.execArgv = process.execArgv;
	this.options.env = process.env;
	this.master = null ;
	this.masterFile = process.argv[1];
	this.sys = b.inherit(null) ;
	this.sys.processCallback = b.inherit(null) ;
	if (this.options.args.indexOf('--color')<0) {
		this.options.args.push('--color');
	}
	if (this.options.args.indexOf('--expose-gc')<0) {
		this.options.args.push('--expose-gc');
	}
	process.nextTick(function(){
		this.emit('loadend');
	}.bind(this));

};
/**
 * [setMasterFile 设置主进程文件路径]
 * @param    {string}                 file [主进程文件路径]
 */
dp.setMasterFile = function(file){
	this.masterFile = file ;
};
/**
 * [run 启动服务器程序]
 */
dp.run = function(){
	this.__runFork();
};
dp.__runFork = function(){
	this.master = fork( this.masterFile, this.options.args,{
		env:b.extend(true, {
			CJB_JSNET_PROCESS_TYPE:'master'
		}, process.env)
	});
	this.__eventInit();
	this.master.on('exit',dp.__onMasterExit.bind(this));
	this.master.on('close',dp.__onMasterClose.bind(this));
	this.master.on('error',dp.__onMasterError.bind(this));
	this.master.on('message',dp.__onMasterMessage.bind(this));
	this.pid = this.master.pid;
};
dp.__eventInit = function(){
	//绑定守护进程对主进程调用的结果回调事件
	this.on('master::event::callMasterRes',function callMasterRes(res, handle){
		if (this.sys.processCallback&&this.sys.processCallback[res.id]&&b.is.function(this.sys.processCallback[res.id])) {
			this.sys.processCallback[res.id]((res.state||false), (res.message||'unknown_error'));
		}
	});
	//主进程对守护进程的调用事件监听
	this.on('master::event::callDaemon',function(res, handle){
		if (!this.emit(('master::call::'+res.name), res.data, handle, function callCallback(state, message, handle, options){
			if (!res) {return ;}
			this.sendToMaster('callDaemonRes', {
				id:res.id,
				state:state,
				message:message
			}, handle, options);
			state = message = handle = options = res = undefined ;
		}.bind(this))){
			if (!res) {return ;}
			this.sendToMaster('callDaemonRes', {
				id:res.id,
				state:false,
				message:'DAEMON_NOT_FIND_CALL_FORM_MASTER'
			});
			res = undefined ;
		}
		handle = undefined ;
	});
	this.on('master::call::init',function masterInit(data, handle, callback){
		return callback&&callback(true, {
			serverGuid:this.serverGuid
		});
	});
	this.on('master::call::ping',function pingRun(data, handle, callback){
		callback(true, true);
	});
};
dp.__onMasterMessage = function(res, handle){
	if (!res) {
		return;
	}
	if (res.type&&res.id) {
		if (this.emit(('master::event::'+res.type), res.message, handle)) {
			this.master.send({
				is_callback:true,
				id:res.id,
				state:true,
				message:'OK'
			});
		}else{
			this.master.send({
				is_callback:true,
				id:res.id,
				state:false,
				message:'DAEMON_NOT_FIND_EVENT_FORM_MASTER'
			});
		}
	}else if (res.is_callback===true&&res.id) {
		if (this.sys.processCallback&&this.sys.processCallback[res.id]&&b.is.function(this.sys.processCallback[res.id])) {
			this.sys.processCallback[res.id]((res.state||false), (res.message||'unknown_error'));
		}
	}
};
dp.callMaster = function(name, data, handle, callback){
	if (callback===undefined&&b.is.function(handle)) {
		callback = handle;
		handle = undefined ;
	}
	if (callback===undefined&&b.is.function(data)) {
		callback = data;
		data = undefined ;
	}
	var body;
		body = b.inherit(null);
		body.id = b.createNewPid();
		body.name = name ;
		body.data = data ;
		this.sys.processCallback[body.id] = callback ;
		this.sendToMaster('callMaster', body, handle, function (state, message){
			if (state!==true&&this.sys.processCallback[body.id]&&
				b.is.function(this.sys.processCallback[body.id])) {
				this.sys.processCallback[body.id](state, message);
				delete this.sys.processCallback[body.id];
			}
			body = undefined ;
		}.bind(this));
};
dp.sendToMaster = function masterSendToMaster(type, message, handle, options, callback){
	if (callback===undefined&&b.is.function(options)) {
		callback = options;
		options = undefined ;
	}
	if (callback===undefined&&b.is.function(handle)) {
		callback = handle;
		options = handle = undefined ;
	}
	if (callback===undefined&&b.is.function(message)) {
		callback = message;
		options = message = undefined ;
	}
	var body, r;
		body = b.inherit(null);
		body.message = message ;
		body.id = b.createNewPid();
		body.type = type ;
		body.is_form_master = false ;
		body.is_form_worker = true ;
		body.is_to_master = true ;
		body.is_to_worker = false ;
		this.sys.processCallback[body.id] = callback ;
		r = this.master.send(body, handle, options);
		if (r!==true) {
			delete this.sys.processCallback[body.id];
			if (b.is.function(callback)) {
				callback(false, 'DAEMON_SEND_TO_MASTER_FAIL');
			}
		}
		body = type = message = handle = options = callback = undefined ;
		return r;
};
dp.__onMasterError = function(err){
	console.log('主进程错了',err);
};
dp.__onMasterClose = function(code, signal){
	console.log('主进程死了',code, signal);
};
dp.__onMasterExit = function(code, signal){
	console.log('主进程Exit了',code, signal);
};
dp.stop = function stop(callback){
	console.log('通天塔')
	this.master.kill();
};
dp.start = function start(callback){

};
/**
 * [restart 重启]
 * @param    {Function}               callback [回调]
 */
dp.restart = function restart(callback){
	this.stop(function stopCb(e, res){
		if (e) {
			if (callback&&b.is.function(callback)) {
				callback(e, res);
			}
		}else{
			this.start(callback);
		}
	});
};
/**
 * [kill 杀掉]
 * @param    {Function}               callback [回调]
 */
dp.kill = function kill(callback){
	this.callMaster('kill', function killCb(state, pids){
		//管理进程杀掉命令以及发送
		if (callback&&b.is.function(callback)) {
			callback(pids);
		}
		setTimeout(function exitRun(){
			process.exit(0);
		},1000);
	});
};
module.exports = dp ;