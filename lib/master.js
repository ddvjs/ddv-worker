'use strict';
//网络模块
const fs = require('fs');
const masterServerInit = require('./server.master.js');
//cjb_base模块
const os = require('os');
//工具类
const b = require('cjb-base');
//扩展模块初始化
module.exports = function masterInit(master){
	/**
	 * [master 管理模块]
	 * 仅仅实例化一次
	 * 因为一个守护进程只能产生一个管理进程，所以本模块只能被实例化一次
	 */

	//系统内部配置
	const sys = master.__sys_private__ = Object.create(null) ;
	//服务器workerid转serverid
	const workerIdToSiteId = sys.workerIdToSiteId = Object.create(null) ;
	//服务器id转workerInfo
	const siteIdToServerConfig = sys.siteIdToServerConfig = Object.create(null) ;
	//服务器workerid转pid
	const workerIdToPId = sys.workerIdToPId = Object.create(null) ;
	/**
	 * [sendToWorker 发送子进程]
	 * @author: 桦 <yuchonghua@163.com>
	 * @DateTime 2016-11-14T14:16:23+0800
	 * @param    {string|object}          worker   [worker|workerId]
	 * @param    {string}                 type     [类型]
	 * @param    {object}                 message  [description]
	 * @param    {handle}                 handle   [description]
	 * @param    {object}                 options  [参数]
	 * @param    {Function}               callback [回调]
	 * @return   {boolean}                         [发送成功与否]
	 */
	master.sendToWorker = function masterSendToWorker(worker, type, message, handle, options, callback){
		if (callback===undefined&&master.isFunction(options)) {
			callback = options;
			options = undefined ;
		}
		if (callback===undefined&&master.isFunction(handle)) {
			callback = handle;
			options = handle = undefined ;
		}
		if (callback===undefined&&master.isFunction(message)) {
			callback = message;
			options = message = undefined ;
		}
		if (worker&&(master.type(worker, 'number')||master.type(worker, 'string'))) {
			worker = (master&&master.workers[worker]) || worker ;
		}
		if (!(worker&&master.type(worker, 'object')&&master.type(worker.send, 'function'))) {
			if (master.isFunction(callback)) {
				callback(false, 'MASTER_NOT_FIND_WORKER');
			}
			worker = type = message = handle = options = callback = undefined ;
			return false;
		}
		var body, r;
			body = Object.create(null);
			body.message = message ;
			body.id = master.createNewPid();
			body.type = type ;
			sys.processCallback[body.id] = callback ;
			r = worker.send(body, handle, options);
			if (r!==true) {
				delete sys.processCallback[body.id];
				if (master.isFunction(callback)) {
					callback(false, 'MASTER_SEND_WORKER_FAIL');
				}
			}
			body = worker = type = message = handle = options = callback = undefined ;
			return r;
	};
	/**
	 * [sendToDaemon 发送守护进程]
	 * @author: 桦 <yuchonghua@163.com>
	 * @DateTime 2016-11-14T14:19:19+0800
	 * @param    {string}                 type     [description]
	 * @param    {object}                 message  [description]
	 * @param    {handle}                 handle   [description]
	 * @param    {object}                 options  [description]
	 * @param    {Function}               callback [description]
	 * @return   {boolean}                         [description]
	 */
	master.sendToDaemon = function masterSendToDaemon(type, message, handle, options, callback){
		if (callback===undefined&&master.isFunction(options)) {
			callback = options;
			options = undefined ;
		}
		if (callback===undefined&&master.isFunction(handle)) {
			callback = handle;
			options = handle = undefined ;
		}
		if (callback===undefined&&master.isFunction(message)) {
			callback = message;
			options = message = undefined ;
		}
		var body, r;
			body = Object.create(null);
			body.message = message ;
			body.id = master.createNewPid();
			body.type = type ;
			sys.processCallback[body.id] = callback ;
			r = process.send(body, handle, options);
			if (r!==true) {
				delete sys.processCallback[body.id];
				if (master.isFunction(callback)) {
					callback(false, 'MASTER_SEND_WORKER_FAIL');
				}
			}
			body = type = message = handle = options = callback = undefined ;
			return r;
	};
	/**
	 * [callDaemon 调用守护线程]
	 * @author: 桦 <yuchonghua@163.com>
	 * @DateTime 2016-11-14T14:20:08+0800
	 * @param    {string}                 name     [description]
	 * @param    {object}                 data     [description]
	 * @param    {handle}                 handle   [description]
	 * @param    {object}                 options  [description]
	 * @param    {Function}               callback [description]
	 * @return   {boolean}                         [description]
	 */
	master.callDaemon = function(name, data, handle, options, callback){
		if (callback===undefined&&master.isFunction(options)) {
			callback = options;
			options = undefined ;
		}
		if (callback===undefined&&master.isFunction(handle)) {
			callback = handle;
			options = handle = undefined ;
		}
		if (callback===undefined&&master.isFunction(data)) {
			callback = data;
			options = data = undefined ;
		}
		var body;
			body = Object.create(null);
			body.id = master.createNewPid();
			body.name = name ;
			body.data = data ;
			sys.processCallback[body.id] = callback ;
			master.sendToDaemon('callDaemon', body, handle, options, function (state, message, handle){
				if (state!==true&&sys.processCallback[body.id]&&
					master.isFunction(sys.processCallback[body.id])) {
					sys.processCallback[body.id](state, message);
					delete sys.processCallback[body.id];
				}
				body = undefined ;
			});
	};
	/**
	 * [callWorker 调用子进程]
	 * @author: 桦 <yuchonghua@163.com>
	 * @DateTime 2016-11-14T14:20:53+0800
	 * @param    {[type]}                 worker   [description]
	 * @param    {string}                 name     [description]
	 * @param    {object}                 data     [description]
	 * @param    {handle}                 handle   [description]
	 * @param    {object}                 options  [description]
	 * @param    {Function}               callback [description]
	 * @return   {boolean}                         [description]
	 */
	master.callWorker = function(worker, name, data, handle, options, callback){
		if (callback===undefined&&master.isFunction(options)) {
			callback = options;
			options = undefined ;
		}
		if (callback===undefined&&master.isFunction(handle)) {
			callback = handle;
			options = handle = undefined ;
		}
		if (callback===undefined&&master.isFunction(data)) {
			callback = data;
			options = data = undefined ;
		}
		var body;
			body = Object.create(null);
			body.id = master.createNewPid();
			body.name = name ;
			body.data = data ;
			sys.processCallback[body.id] = callback ;
			master.sendToWorker(worker, 'callWorker', body, handle, function (state, message, handle){
				if (state!==true&&sys.processCallback[body.id]&&
					master.isFunction(sys.processCallback[body.id])) {
					sys.processCallback[body.id](state, message);
					delete sys.processCallback[body.id];
				}
				body = undefined ;
			});
	};



	/**
	 * [masterError 主线程错误]
	 * @author: 桦 <yuchonghua@163.com>
	 * @DateTime 2016-11-14T14:39:39+0800
	 * @param    {string}                 message [description]
	 * @param    {string}                 stack   [description]
	 * @return   {error}                          [description]
	 */
	master.MasterError = class MasterError extends Error{
		//构造函数
		constructor(message, stack){
			//调用父类构造函数
			super(message);
			this.name = this.name||'Error';
			this.type = this.type||'MasterError';
			this.stack += stack?('\n'+stack):'';
			message = stack = void 0 ;
		}
	};

	/**************************** 子进程对管理进程调用开始 ****************************/
	//子进程中转-转发子进程数据到子进程
	master.on('worker::event::workerSendToWorker', function workerSendToWorker(body, handle, worker){
		master.sendToWorker(body.toWorkerId, body.type, body.message,function(state,message){
			master.sendToWorker(worker.id, 'workerSendToWorkerCallback', {
				id:body.id,
				state:state,
				message:message
			});
		});
	});
	//子进程要求初始化
	master.on('worker::call::init',function getSiteInfoCb(data, handle, callback, worker){
		var res;
		if (worker&&worker.id&&workerIdToSiteId[worker.id]) {
			res = Object.create(null);
			res.workerId = worker.id ;
			res.siteId = workerIdToSiteId[res.workerId] ;
			res.serverConf = siteIdToServerConfig[res.siteId] ;
			res.serverGuid = master.serverGuid ;
			callback(true, res);
		}else{
			callback(false, 'worker not find');
		}
	});
	//ping 子进程ping
	master.on('worker::call::ping',function getSiteInfoCb(data, handle, callback, worker){
		callback(true, true);
		if (master.workers[worker.id]) {
			master.workers[worker.id].socketSum = data.socketSum;
			master.workers[worker.id].webSocketSum = data.webSocketSum;
			master.workers[worker.id].httpSum = data.httpSum;
		}
	});
	//守护进程要杀掉所以进程
	master.on('daemon::call::kill',function kill(data, handle, callback){
		var pids, q = b.queue();
			//初始化
			q.push(function init(next){
				pids = [];
				master.isKillExit = true ;
				next();
			});
			//循环拼接队列
			master.each(workerIdToSiteId, function(workerId) {
				q.push(true, function sendKillToWorker(next){
					master.callWorker(workerId, 'kill', function callback(state, data){
						var processId = state?data.pid:(workerIdToPId[workerId]);
						if (processId) {
							pids[pids.length] = {
								processId:processId,
								workerId:workerId,
								state:state||false
							};
						}
						next();
						data = workerId = processId = undefined;
					});
				});
			});
			//子进程杀掉完毕
			q.push(true, function end(){
				pids[pids.length] = {
					processId: process.pid,
					workerId: 0,
					state: true
				};
				callback(true,pids);
				setTimeout(function exitRun(){
					process.exit(0);
				},200);
				q.abort();
			});
			q.run();
	});
	///**************************** 子进程对管理进程调用结束 ****************************/



	/**
	 * [emitMasterError 触发一条管理线程的错误]
	 * @author: 桦 <yuchonghua@163.com>
	 * @DateTime 2016-11-14T18:00:05+0800
	 * @param    {[type]}                 message [description]
	 * @param    {[type]}                 stack   [description]
	 * @return   {[type]}                         [description]
	 */
	sys.emitMasterError = function emitMasterError(message, stack){
		var e = new master.MasterError(message, stack) ;
		message = stack = void 0 ;
		if (!master.emit('error',e)) {
			throw e;
		}
		e = void 0 ;
	};
	/**
	 * [initByDaemon 和守护进程通讯]
	 * @author: 桦 <yuchonghua@163.com>
	 * @DateTime 2016-11-14T18:00:28+0800
	 * @return   {[type]}                 [description]
	 */
	sys.initByDaemon = function(){
		master.id = master.createNewPid();
		//发信息给守护进程，启动被初始化
		master.callDaemon('init', {}, function initCb(state, message, handle){
			if (state===true) {
				master.serverGuid = message.serverGuid;
				//触发初始化完毕事件
				process.nextTick(function(){
					master.emit('loadend');
				});
			}else{
				console.error('master init fail!');
				console.error(message);
				process.exit(1);
			}
		});
	};
	/**
	 * [daemonPingInit ping守护进程-初始化]
	 * @author: 桦 <yuchonghua@163.com>
	 * @DateTime 2016-11-14T17:59:04+0800
	 * @return   {[type]}                 [description]
	 */
	sys.daemonPingInit = function daemonPingInit() {
		if (sys.isDaemonPingInit === true) {
			return ;
		}
		sys.isDaemonPingInit = true ;
		sys.daemonPingLastTime = master.now();
		sys.setIntervalHandle = setInterval(sys.daemonPing, sys.daemonPingTimeOut);
	};
	/**
	 * [daemonPing ping守护进程]
	 * @author: 桦 <yuchonghua@163.com>
	 * @DateTime 2016-11-14T17:58:44+0800
	 * @return   {[type]}                 [description]
	 */
	sys.daemonPing = function daemonPing() {
		if ((master.now() - (sys.daemonPingLastTime||0)) > (sys.daemonPingTimeOut*2) ) {
			console.error('daemon exit');
			process.exit(0);
			return ;
		}
		try{
			//和主进程ping
			master.callDaemon('ping', {}, function pingCb(state, message, handle){
				//最后的时间
				if (state) {
					sys.daemonPingLastTime = master.now();
				}else{
					console.error(message);
					process.exit(1);
				}
			});
		}catch(e){
			//设定过去
			sys.daemonPingLastTime = 0;
			//设定ping
			sys.daemonPing();
		}
	};


	/**
	 * [init 绑定子进程的事件]
	 */
	sys.workerEventBind = function(worker){
		'message exit close error'.split(' ').forEach(function(type) {
			worker.on(type, sys.onWorker[type].bind(worker));
		});
	};
	/**
	 * [init 守护进程事件绑定]
	 */
	sys.daemonEventBind = function(){
		process.on('message',sys.onDaemonMessage.bind(master));
		//守护进程对主进程的调用事件监听
		master.on('daemon::event::callMaster',function(res, handle){
			if (!master.emit(('daemon::call::'+res.name), res.data, handle, function callCallback(state, message, handle, options){
				if (!res) {return ;}
				master.sendToDaemon('callMasterRes', {
					id:res.id,
					state:state,
					message:message
				}, handle, options);
				state = message = handle = options = res = undefined ;
			})){
				if (!res) {return ;}
				master.sendToDaemon('callMasterRes', {
					id:res.id,
					state:false,
					message:'MASTER_NOT_FIND_CALL_FORM_DAEMON'
				});
				res = undefined ;
			}
			handle = undefined ;
		});
		master.on('worker::event::callMaster',function(res, handle, worker){
			if (!master.emit(('worker::call::'+res.name), res.data, handle, function callCallback(state, message, handle, options){
				if (!res) {return ;}
				master.sendToWorker(worker, 'callMasterRes', {
					id:res.id,
					state:state,
					message:message
				}, handle, options);
				state = message = handle = options = res = worker = undefined ;
			}, worker)){
				if (!res) {return ;}
				master.sendToWorker(worker, 'callMasterRes', {
					id:res.id,
					state:false,
					message:'MASTER_NOT_FIND_CALL_FORM_WORKER'
				});
				res = worker = undefined ;
			}
			handle = undefined ;
		});

		//绑定主进程对守护进程调用的结果回调事件
		master.on('daemon::event::callDaemonRes',function callDaemonRes(res, handle){
			if (sys.processCallback&&sys.processCallback[res.id]&&master.isFunction(sys.processCallback[res.id])) {
				sys.processCallback[res.id]((res.state||false), (res.message||'unknown_error'));
			}
			res = handle = undefined ;
		});
		//绑定主进程对子进程调用的结果回调事件
		master.on('worker::event::callWorkerRes',function callWorkerRes(res, handle, worker){
			if (sys.processCallback&&sys.processCallback[res.id]&&master.isFunction(sys.processCallback[res.id])) {
				sys.processCallback[res.id]((res.state||false), (res.message||'unknown_error'));
			}
			res = handle = worker = undefined ;
		});
	};
	/**
	 * [init 处理守护进程发来的信息]
	 */
	sys.onDaemonMessage = function(res, handle){
		if (!res) {
			return;
		}
		if (res.type&&res.id) {
			if (master.emit(('daemon::event::'+res.type), res.message, handle)) {
				process.send({
					isCallback:true,
					id:res.id,
					state:true,
					message:'OK'
				});
			}else{
				process.send({
					isCallback:true,
					id:res.id,
					state:false,
					message:'MASTER_NOT_FIND_EVENT_FORM_DAEMON'
				});
			}
		}else if (res.isCallback===true&&res.id) {
			if (sys.processCallback&&sys.processCallback[res.id]&&master.isFunction(sys.processCallback[res.id])) {
				sys.processCallback[res.id]((res.state||false), (res.message||'unknown_error'));
			}
		}

	};

	sys.onWorker = Object.create(null);
	/**
	 * [init 子进程错误事件]-[m指向被是实例化的主进程，this是指传入事件的子进程worker]
	 */
	sys.onWorker.message = function(res, handle){
		if (!res) {
			return;
		}
		if (res.type&&res.id) {
			if (master.emit(('worker::event::'+res.type), res.message, handle, this)) {
				this.send({
					isCallback:true,
					id:res.id,
					state:true,
					message:'OK'
				});
			}else{
				this.send({
					isCallback:true,
					id:res.id,
					state:false,
					message:'MASTER_NOT_FIND_EVENT_FORM_WORKER'
				});
			}
		}else if (res.isCallback===true&&res.id) {
			if (sys.processCallback&&sys.processCallback[res.id]&&master.isFunction(sys.processCallback[res.id])) {
				sys.processCallback[res.id]((res.state||false), (res.message||'unknown_error'));
			}
		}
	};
	/**
	 * [init 子进程错误事件]-[m指向被是实例化的主进程，this是指传入事件的子进程worker]
	 */
	sys.onWorker.exit = function(res, handle){
		console.log(res, handle);
	};
	/**
	 * [init 子进程错误事件]-[m指向被是实例化的主进程，this是指传入事件的子进程worker]
	 */
	sys.onWorker.close = function(res, handle){
		//console.log(res, handle/*, master*/);
	};
	/**
	 * [init 子进程错误事件]-[m指向被是实例化的主进程，this是指传入事件的子进程worker]
	 */
	sys.onWorker.error = function(res, handle){
		console.log(res, handle);
	};


	//判断是否退出
	master.isKillExit = false ;
	//cpu格式
	master.cpuLen = os.cpus().length;
	//是否已经运行过
	sys.is_run =false ;
	//ping超时
	sys.daemonPingTimeOut = 30*1000;
	//发信息个子进程的结果回调存储容器
	sys.processCallback = Object.create(null);
	//日志对象
	sys._log = Object.create(null);
	//文件指针存储
	sys._log.pathToFd = Object.create(null);
	//队列
	sys._log.bufferQueue = Object.create(null);
	//队列锁
	sys._log.bufferLock = Object.create(null);
	//删除文件指针
	sys._log.closeFd = function(path){
		if (this[path]) {
			try{
				fs.openSync(this[path]);
			}catch(e){}
			delete this[path];
		}
	};
	//获取文件指针
	sys._log.getFd = function(path){
		if (path) {
			if (!this[path]) {
				this[path] = fs.openSync(path, 'a', 0o666);
				try{
					fs.chmodSync(path, 0o666);
				}catch(e){}
			}
			return this[path] ;
		}else{
			return null ;
		}
	}.bind(sys._log.pathToFd);
	//写入
	sys._log.write = function logWrite(path, buffer, offset, length){
		if (length&&length>0) {
			this.bufferQueue[path] = this.bufferQueue[path] || [];
			this.bufferQueue[path].push([buffer, offset, length]);
		}
		buffer = offset = length = void 0 ;
		if (this.bufferLock[path]) {
			return ;
		}
		//加锁
		this.bufferLock[path] = true;
		let [q,fd] = [this.bufferQueue[path].shift(), null];
		if ((fd = sys._log.getFd(path))&&q&&q[0]&&q[2]) {
			fs.write(fd, q[0], q[1], q[2], (e)=>{
				this.bufferLock[path] = false ;
				if (this.bufferQueue[path].length>0) {
					sys._log.write(path);
				}else{
					delete this.bufferQueue[path];
				}
				path = void 0 ;
			});
		}
		q = fd = void 0 ;
	}.bind(sys._log);

	sys._log.onStdoutData = function(data){
		process.stdout.write(data);

		if (this.logPath) {
			sys._log.write(this.logPath.output, data, 0, data.length);
			sys._log.write(this.logPath.all, data, 0, data.length);
		}
	};
	sys._log.onStderrData = function(data){
		process.stderr.write(data);

		if (this.logPath) {
			sys._log.write(this.logPath.error, data, 0, data.length);
			sys._log.write(this.logPath.all, data, 0, data.length);
		}
	};
	/**
	 * [run 运行管理进程的服务]
	 * @author: 桦 <yuchonghua@163.com>
	 * @DateTime 2016-11-14T23:27:14+0800
	 * @return   {[type]}                 [description]
	 */
	master.serverRun = function masterServerRun(){
		//守护线程检测初始化
		sys.daemonPingInit();
		//服务监听初始化
		sys.serverListenInit();
	};
	//初始化服务模块
	masterServerInit(master);
	//守护进程事件绑定初始化
	sys.daemonEventBind();
	//通过守护进程初始化
	sys.initByDaemon();
};
