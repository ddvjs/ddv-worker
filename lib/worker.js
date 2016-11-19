/** vim: et:ts=4:sw=4:sts=4
* see: https://github.com/chengjiabao/ddv for details
*/
/*jshint node: true */
/*jshint esversion: 6 */
/*global module, process */
'use strict';
//cjb_base模块
const cjb_base = require('cjb-base');
//工具类
const b = cjb_base.inherit(cjb_base) ;
//文件操作
const fs = require('fs');
//ws模块
const ws = require('ws');
//网络模块
const net = require('net');
//http模块
const http = require('http');
//https模块
const https = require('https');
//cluster模块
const cluster = require('cluster');
//domain模块
const domain = require('domain');
module.exports = function(worker){
	//主模块

	//系统内部配置
	const sys = worker.__sys_private__ = b.inherit(null) ;
	//创建存储站点配置信息的对象
	const config = sys.config = b.inherit(null) ;

	worker.c = b.inherit(null) ;
	worker.start_time_stamp = b.time();
	worker.socketSum = 0;
	worker.webSocketSum = 0;
	worker.httpSum = 0;
	worker.socketTimeout = 120000 ;

	//发信息个主进程的结果回调存储容器
	sys.processCallback = b.inherit(null);
	sys.masterPingTimeOut = 30*1000;

	worker.run = function workerRun(){
		if (sys.is_run) {
			//防止重复初始化
			return;
		}
		sys.is_run = true;
		sys.run();
	};
	worker.on('master::event::workerSendToWorkerCallback', function workerSendToWorkerCallback(res, handle){
		if (sys.processCallback&&sys.processCallback[res.id]&&b.is.function(sys.processCallback[res.id])) {
			sys.processCallback[res.id]((res.state||false), (res.message||'unknown_error'));
			delete sys.processCallback[res.id];
		}
	});
	worker.sendToWorker = function workerSendToWorker(worker_id, type, message, handle, options, callback){
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
		var body;
			body = b.inherit(null);
			body.message = message ;
			body.to_worker_id = worker_id ;
			body.id = b.createNewPid();
			body.type = type ;
			sys.processCallback[body.id] = callback ;
			if (!true) {

			}else{
				worker.sendToMaster('workerSendToWorker', body, handle, options, function sendToMasterCb(state, message){
					if (state!==true) {
						delete sys.processCallback[body.id];
						if (b.is.function(callback)) {
							callback(state, message);
						}
					}
					state = message = undefined ;
				});
			}
	};
	worker.sendToMaster = function workerSendToMaster(type, message, handle, options, callback){
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
			sys.processCallback[body.id] = callback ;
			r = process.send(body, handle, options);
			body = type = message = handle = options = undefined ;
			if (r!==true) {
				delete sys.processCallback[body.id];
				if (b.is.function(callback)) {
					callback(false, 'WORKER_NOT_FIND_EVENT_FORM_MASTER');
				}
			}
			return r;
	};
	worker.callMaster = function(name, data, handle, callback){
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
			sys.processCallback[body.id] = callback ;
			worker.sendToMaster('callMaster', body, handle, function (state, message, handle){
				if (state!==true&&sys.processCallback[body.id]&&
					b.is.function(sys.processCallback[body.id])) {
					sys.processCallback[body.id](state, message);
					delete sys.processCallback[body.id];
				}
				body = undefined ;
			});
	};


	sys.init = function(){
		//是否已经运行过
		sys.is_run =false ;
		//绑定
		sys.masterEventBind();
		//通过守护进程初始化
		sys.initByMaster();
	};
	sys.run = function(){
		sys.serverListen();
	};
	sys.serverListen = function server(){
		worker.on('master::event::socket::handle', function socketHandleCb(res, socket){
			worker.server.socketEmit(res, socket);
		});
	};
	sys.masterPingInit = function masterPingInit() {
		if (sys.isMasterPingInit === true) {
			return ;
		}
		sys.isMasterPingInit = true ;
		sys.masterPingLastTime = b.now();
		sys.setIntervalHandle = setInterval(sys.masterPing, sys.masterPingTimeOut);
	};
	sys.masterPing = function masterPing() {
		if ((b.now() - (sys.masterPingLastTime||0)) > (sys.masterPingTimeOut*2) ) {
			console.error('master exit');
			process.exit(0);
			return ;
		}
		try{
			//和主进程ping
			worker.callMaster('ping',{
				'socketSum':worker.socketSum,
				'webSocketSum':worker.webSocketSum,
				'httpSum':worker.httpSum
			},function pingCb(state, message, handle){
				//最后的时间
				if (state) {
					sys.masterPingLastTime = b.now();
				}else{
					console.error(message);
					process.exit(1);
				}
			});
		}catch(e){
			//设定过去
			sys.masterPingLastTime = 0;
			//设定ping
			sys.masterPing();
		}
	};
	sys.initByMaster = function sysInitByMaster() {
		worker.callMaster('init',{},function getSiteInfoCb(state, message, handle){
			if (state&&message) {
				worker.id = message.worker_id;
				worker.worker_id = message.worker_id;
				worker.server_id = message.server_id;
				worker.site_id = message.site_id;
				worker.serverConf = message.serverConf;
				worker.serverGuid = message.serverGuid;
				worker.debug = message.serverConf.debug;
				sys.masterPingInit();
				//触发初始化完毕事件
				process.nextTick(function(){
					worker.emit('init::end');
				});
			}else{
				console.error(message);
				process.exit(1);
			}
		});
	};
	/** 局部使用开始 **/
	/**
	 * [__init.masterEventBind 主进程事件初始化]-[内部使用]
	 */
	sys.masterEventBind = function masterEventBind(){
		process.on('message', sys.onMasterMessage.bind(worker));
	};
	/**
	 * [__init.onMasterMessage 主进程消息]-[内部使用]
	 */
	sys.onMasterMessage = function onMasterMessage(res, handle){
		if (!res) {
			return ;
		}
		if (res.type&&res.id) {
			if (worker.emit(('master::event::'+res.type), res.message, handle)) {
				process.send({
					is_callback:true,
					id:res.id,
					state:true,
					message:'OK'
				});
			}else{
				process.send({
					is_callback:true,
					id:res.id,
					state:false,
					message:'WORKER_NOT_FIND_EVENT_FORM_MASTER'
				});
			}
		}else if (res.is_callback===true&&res.id) {
			if (sys.processCallback&&sys.processCallback[res.id]&&b.is.function(sys.processCallback[res.id])) {
				sys.processCallback[res.id]((res.state||false), (res.message||'unknown_error'));
			}
		}

	};
	/** 局部使用结束 **/
	/** 管理进程的事件开始 **/

	//绑定守护进程对主进程调用的结果回调事件
	worker.on('master::event::callMasterRes',function callMasterRes(res, handle){
		if (sys.processCallback&&sys.processCallback[res.id]&&b.is.function(sys.processCallback[res.id])) {
			sys.processCallback[res.id]((res.state||false), (res.message||'unknown_error'));
		}
	});
	//守护进程对主进程的调用事件监听
	worker.on('master::event::callWorker',function(res, handle){
		if (!worker.emit(('master::call::'+res.name), res.data, handle, function callCallback(state, message, handle, options){
			if (!res) {return ;}
			worker.sendToMaster('callWorkerRes', {
				id:res.id,
				state:state,
				message:message
			}, handle, options);
			state = message = handle = options = res = undefined ;
		})){
			if (!res) {return ;}
			worker.sendToMaster('callWorkerRes', {
				id:res.id,
				state:false,
				message:'WORKER_NOT_FIND_FN_FORM_MASTER'
			});
			res = undefined ;
		}
		handle = undefined ;
	});
	//守护进程对主进程的调用事件监听
	worker.on('master::call::kill',function getSiteLists(data, handle, callback){
		callback(true,{pid:process.pid});
		setTimeout(function exitRun(){
			process.exit(0);
		},200);
	});
	/** 管理进程的事件结束 **/


	//建立监听作用域
	worker.server = domain.create();

	//通过 socket 触发服务
	worker.server.socketEmit = function socketEmit(message, socket){
		process.nextTick(function socketEmitNextTick(){
			worker.server.run(function socketEmitDomainRun(){
				worker.server.socketEmitRun(message, socket);
				message = socket = undefined ;
			});
		});
	};
	//运行
	worker.server.socketEmitRun = function socketEmitRun(message, socket){
		var data;
		if(socket) {
			data = new Buffer(message.data_by_base64,'base64');
			socket.info = message.info;
			socket.readable = socket.writable = true;
			socket.server = worker.server.http;
			socket.isSocketNotEnd = true ;
			worker.server.http.emit("connection", socket);
			socket.emit("connect");
			socket.emit('data',data);
			socket.setTimeout(worker.socketTimeout);
			socket.resume();
		}
		message = socket = data = undefined ;
	};
	worker.server.connectionHttp = function serverConnectionHttp(request, response){
		var C;
			C = domain.create();
			//添加变量监听对象
			C.add(request);
			C.add(response);
			C.id = b.createNewPid();
			C.add_time = b.time();
			C.gwcid = worker.serverGuid +'-'+ worker.id+'-'+C.id.toString()+'-'+worker.start_time_stamp;
			C.destroy=worker.server.connectionHttpDestroy.bind(C);
			C.notClosed = true ;
			C.run(function serverConnectionHttpRun(){
				//组合基本信息
				if (request&&request.socket&&b.type(request.socket.info, 'object')) {
					b.extend(true, this, request.socket.info);
				}
				//基本信息
				b.extend(true, this, {
					//用户访问协议 - http | https
					protocol:(this.type==='ssl'?'https:':'http:'),
					//请求操作指针
					request:request,
					//响应操作指针
					response:response,
					//socket
					socket:request.socket
				});
				this.socket.info.protocol = this.protocol;
				this.on('httpSum::remove',function httpSumRemove(){
					if (this.isHttpSumRemove===false) {
						worker.httpSum--;
						delete this.isHttpSumRemove;
					}
				});
				this.on('httpSum::add',function httpSumAdd(){
					this.isHttpSumRemove = false ;
					worker.httpSum++;
				});
				this.emit('httpSum::add');
				this.on('error',function httpSumRemove(){
					this.emit('httpSum::remove');
				});

				//this.socket.on('error::socket', function _onRequestClose(){
				//	this.emit('error',arguments);
				//}.bind(this));
				request.on('aborted', function _onRequestAborted(){
					this.emit('httpSum::remove');
					this.emit('request::aborted');
				}.bind(this));
				request.on('close', function _onRequestClose(){
					this.emit('httpSum::remove');
					this.emit('request::close');
					if(delete this.notClosed){delete this.notClosed;}
				}.bind(this));
				request.on('end', function _onRequestEnd(){
					this.emit('httpSum::remove');
					this.emit('request::end');
					if(delete this.notClosed){delete this.notClosed;}
				}.bind(this));
				request.on('error', function _onRequestError(){
					this.emit('error',arguments);
					if(delete this.notClosed){delete this.notClosed;}
				}.bind(this));
				response.on('error', function _onRequestError(){
					this.emit('error',arguments);
					if(delete this.notClosed){delete this.notClosed;}
				}.bind(this));
				response.on('response::close', function _onRequestClose(){
					this.emit('httpSum::remove');
					this.emit('close');
				}.bind(this));
				worker.emit('connection::http',this);
				process.nextTick(function serverConnectionHttpNextTick(){
					this.emit('conn::run');
				}.bind(this));
				request = response = undefined ;
			});
			C = undefined ;
	};
	worker.server.connectionWs = function serverConnectionWs(WebSocket){
		var C;
			C = domain.create();
			//添加变量监听对象
			C.add(WebSocket);
			C.id = b.createNewPid();
			C.add_time = b.time();
			C.gwcid = worker.serverGuid +'-'+ worker.id+'-'+C.id.toString()+'-'+worker.start_time_stamp;
			C.destroy=worker.server.connectionWsDestroy.bind(C);
			C.close = function closeWs(){
				return this.ws.close.apply(this.ws,arguments);
			}.bind(C);
			C.send = function sendWs(){
				return this.ws.send.apply(this.ws,arguments);
			}.bind(C);
			C.notClosed = true ;
			C.run(function serverConnectionWsRun(){
				//组合基本信息
				if (WebSocket&&WebSocket._socket&&b.type(WebSocket._socket.info, 'object')) {
					b.extend(true, this, WebSocket._socket.info);
				}
				b.extend(true, this, {
					//用户访问协议 - ws | wss
					protocol:(this.type=='ssl'?'wss:':'ws:'),
					//本次访问的ws指针
					ws:WebSocket,
					//socket
					socket:WebSocket._socket
				});
				WebSocket = undefined ;
				this.socket.info.protocol = this.protocol;
				worker.webSocketSum++;
				this.url = this.ws.upgradeReq.url||this.url||'';
				this.ws.on('open', function _onRequestClose(){
					this.emit('open');
				}.bind(this));
				this.socket.on('error::socket', function _onRequestClose(){
					this.emit('error',arguments);
					if(delete this.notClosed){delete this.notClosed;}
				}.bind(this));
				this.ws.on('error', function _onRequestClose(){
					this.emit('error',arguments);
					if(delete this.notClosed){delete this.notClosed;}
				}.bind(this));
				this.ws.on('close', function _onRequestClose(){
					worker.webSocketSum--;
					this.emit('close');
					if(delete this.notClosed){delete this.notClosed;}
				}.bind(this));
				this.ws.on('timeout', function _onRequestClose(){
					this.emit('timeout');
					if(delete this.notClosed){delete this.notClosed;}
				}.bind(this));
				this.ws.on('message', function _onRequestClose(){
					var args = b.argsToArray(arguments);
						args.unshift('message');
					this.emit.apply(this,args);
					args = undefined;
				}.bind(this));
				worker.emit('connection::ws',this);
				process.nextTick(function serverConnectionWsEmit(){
					this.emit('conn::run');
				}.bind(this));
			});
			C = undefined ;
	};
	worker.server.connectionHttpDestroyRun = function connectionHttpDestroyRun(){
		var key ;
		for (key in this) {
			if (!this.hasOwnProperty(key)) continue;
			delete this[key];
		}
		key = undefined ;	
	};
	worker.server.connectionHttpDestroy = function connectionHttpDestroy(){
		process.nextTick(function serverConnectionHttpNextTick(){
			worker.server.connectionHttpDestroyRun.call(this);
		}.bind(this));
	};
	worker.server.connectionWsDestroyRun = function connectionWsDestroyRun(){
		var key ;
		for (key in this) {
			if (!this.hasOwnProperty(key)) continue;
			delete this[key];
		}
		key = undefined ;	
	};
	worker.server.connectionWsDestroy = function connectionWsDestroy(){
		process.nextTick(function serverConnectionWsNextTick(){
			worker.server.connectionWsDestroyRun.call(this);
		}.bind(this));
	};

	//创建httpServer - 也就是创建http服务 传入回调
	worker.server.http = http.createServer();

	worker.server.http.on('request', worker.server.connectionHttp);
	worker.server.http.on('clientError', function(e) {
		worker.server.emit('error', e);
	});
	worker.server.http.on('error', function(e) {
		worker.server.emit('error', e);
	});
	worker.server.http.on('connection',function serverHttpTimeout(socket) {
		socket.on('socketSum::remove',function socketSumRemove(){
			if (this.isSocketNotEnd === true) {
				worker.socketSum--;
				delete this.isSocketNotEnd ;
			}
		});
		socket.on('socketSum::add',function socketSumAdd(){
			worker.socketSum++;
		});
		socket.on('connect',function onConnect(){
			this.emit('socketSum::add');
		});
		//结束
		socket.on('end',function onEnd(){
			this.emit('socketSum::remove');
		});
		//结束
		socket.on('error',function onError(e){
			//客户端socket重置 忽略这一错误
			if (e.message == 'read ECONNRESET'&&e.name === 'Error') {
				this.emit('socketSum::remove');
				try{this.end();}catch(e1){}
				try{this.destroy();}catch(e1){}
				return false;
			}else{
				var args = b.argsToArray(arguments);
					args.unshift('error::socket');
				this.emit.apply(this,args);
				args = undefined;
			}
		});
		//长连接超时
		socket.on('timeout',function serverHttpTimeout(socket) {
			if (this&&this.info&&this.info.protocol) {
				if (['http:','https:'].indexOf(this.info.protocol)>-1) {
					this.emit('socketSum::remove');
					if (this&&this.end&&b.is.function(this.end)) {
						try{this.end();}catch(e){}
					}
				}
			}
		});
		socket = undefined ;
	});
	//
	//设定超时-自定义处理超时
	worker.server.http.setTimeout(worker.socketTimeout, function serverHttpTimeout(){});
	

	//创建WebSocketServer - 也就是创建WebSocket服务 - 使用httpServer 一样的端口
	worker.server.ws = ws.createServer({server:worker.server.http});

	worker.server.ws.on('connection', worker.server.connectionWs);
	worker.server.ws.on('clientError', function(e) {
		worker.server.emit('error', e);
	});
	worker.server.ws.on('error', function(e) {
		worker.server.emit('error', e);
	});

	//添加变量监听对象
	worker.server.add(worker.server.http);
	worker.server.add(worker.server.ws);
	worker.server.add(worker.server.socketEmit);
	worker.server.add(worker.server.socketEmitRun);
	//异常捕获事件绑定
	worker.server.on('error', function (e) {
		//客户端socket重置 忽略这一错误
		if (e.message == 'read ECONNRESET'&&e.name === 'Error') {
			return false;
		}else{
			worker.emit('server::error',e);
		}
		e = undefined ;
	});

	sys.init();

};