/** vim: et:ts=4:sw=4:sts=4
* see: https://github.com/chengjiabao/ddv for details
*/
/*jshint node: true */
/*jshint esversion: 6 */
/*global module, process */
'use strict';
//网络模块
const net = require('net');
const tls = require('tls');
const fs = require('fs');
//child_process模块
const child_process = require('child_process');
//cjb_base模块
const cjb_base = require('cjb-base');
//cjb_base模块
const os = require('os');
//工具类
const b = cjb_base.inherit(cjb_base) ;
module.exports = function masterServerInit(master){
	//默认站点id
	let defaultListenSiteId = null;
	//最后的worker_id
	var workerIdLast = 0;
	//系统内部配置
	const sys = master.__sys_private__ = master.__sys_private__ || b.inherit(null) ;
	//创建存储进程配置信息的对象
	const listenToSiteId = sys.listenToSiteId = sys.listenToSiteId || b.inherit(null) ;
	//监听列表
	const listenLists = sys.listenLists = sys.listenLists || b.inherit(null) ;
	//站点id 转 站点配置
	const siteIdToSiteConfig = sys.siteIdToSiteConfig = sys.siteIdToSiteConfig || b.inherit(null) ;
	//站点id 转 配置信息
	const siteIdToOptions = sys.siteIdToOptions = sys.siteIdToOptions || b.inherit(null) ;
	//站点id 转 WIDS
	const siteIdToWorkerInfo = sys.siteIdToWorkerInfo = sys.siteIdToWorkerInfo || b.inherit(null) ;
	//服务器workerid转serverid
	const workerIdToSiteId = sys.workerIdToSiteId = sys.workerIdToSiteId || b.inherit(null) ;
	//服务器workerid转pid
	const workerIdToPId = sys.workerIdToPId = sys.workerIdToPId || b.inherit(null) ;
	//所以的子进程对象
	const workers = master.workers = master.workers || b.inherit(null);
	//所以的子进程id结合数组
	const workerIds = master.workerIds = [] ;
	//服务器运行池
	const servers = master.servers || [];
	//启动监听服务
	sys.serverListenInit = function(){
		if (sys.isServerListenInit === true) {
			return ;
		}
		sys.isServerListenInit = true ;
		console.log('开启代理监听');
		sys.serverProxyListen();
		console.log('等待站点加入');
	};
	/**
	 * [addSite 添加服务]
	 * @author: 桦 <yuchonghua@163.com>
	 * @DateTime 2016-11-14T23:48:03+0800
	 * @param    {[type]}                 options    [description]
	 * @param    {[type]}                 siteConfig [description]
	 */
	master.addSite = function(options, siteConfig){
		console.log(44);
		sys.addSite(options, siteConfig);
	};
	/**
	 * [serverAllClose 关闭所有服务]
	 * @author: 桦 <yuchonghua@163.com>
	 * @DateTime 2016-11-14T23:16:51+0800
	 * @return   {[type]}                 [description]
	 */
	master.serverAllClose = function(){
		b.each((servers||[]), function(i, server) {
			try{
				if (b.is.function(server.close)) {
					server.close();
				}
			}catch(e){}
		});
	};
	/**
	 * [addSite 添加站点]
	 * @author: 桦 <yuchonghua@163.com>
	 * @DateTime 2016-11-15T00:23:54+0800
	 * @param    {[type]}                 options    [description]
	 * @param    {[type]}                 siteConfig [description]
	 */
	sys.addSite = function(options, siteConfig){
		if (!(options&&options.siteId)) {
			console.log('没有传入参数',options.siteId);
			return ;
		}
		if (siteIdToOptions[options.siteId]) {
			if (siteIdToOptions[options.siteId].fileMtime == options.fileMtime) {
				console.log('同样的数据，没有变化',options.siteId);
				return ;
			}else{
				sys.reloadSite(options.siteId);
				return ;
			}
		}
		sys.addSiteRun(options, siteConfig);
	};

	sys.addSiteRun = function(options, siteConfig){
		sys.addSiteListsAndReload(options, siteConfig);
		//重新补充启动线程
		sys.forkReload();
		//监听
		sys.serverListenReload();
	};

	sys.sotpSite = function(siteId){
		console.log('sotpSite siteId',siteId);
	};



	sys.addSiteListsAndReload = function(options, siteConfig){
		//判断是否需要启动虚拟主机模式
		//计算进程数
		let [listenToSiteIdT, listenListsT, siteIdToWorkerInfoT] = [b.inherit(null), b.inherit(null), b.inherit(null)] ;
		//获取默认id
		defaultListenSiteId = defaultListenSiteId || null;
		//加入配置
		siteIdToOptions[options.siteId] = options;
		siteIdToSiteConfig[options.siteId] = siteConfig;
		//遍历服务器列表
		b.each(siteIdToOptions,function(siteId, options){
			//设定第一个为默认
			if ((!defaultListenSiteId)||(!siteIdToOptions[defaultListenSiteId])) {
				defaultListenSiteId = siteId;
			}
			//修改默认站点
			if (options.defaultListen) {
				defaultListenSiteId = siteId;
			}
			b.each(options.listen,function(listen_id, listen){
				//默认type为tcp协议
				listen.type = listen.type||'tcp';

				//端口
				if (listen.type=='tcp') {
					listen.port = listen.port||'80';
				}else{
					listen.port = listen.port||'443';
				}

				var key, host;
				if (b.array.index(listen.type, ['tcp', 'ssl'])>-1) {
					key  = listen.type + ':' + listen.port;
					key += ':'+ (listen.ipaddress = listen.ipaddress||'');

					listen.type_port_ip = key ;


					host = (listen.host = listen.host||'');

					listenToSiteIdT[key] = listenToSiteIdT[key]||b.inherit(null);
					listenToSiteIdT[key][host] = siteId;
					listenListsT[key] = listen ;
				}
				key = host = listen_id = listen =void 0 ;
			});
			siteId = options = void 0 ;
		});
		b.each(siteIdToOptions,function(siteId, options){
			options.cpu_len = parseInt(options.cpu_len)||1||(master.cpuLen/siteIdToOptions.length);
			siteIdToWorkerInfoT[siteId] = b.inherit(null);
			siteIdToWorkerInfoT[siteId].cpu_len = options.cpu_len;
			siteIdToWorkerInfoT[siteId].wids = [];
		});
		//删除原来不存在的
		b.each(listenToSiteId,function(key){
			if (!listenToSiteIdT[key]) {
				delete listenToSiteId[key];
			}
		});
		//插入新的
		b.each(listenToSiteIdT,function(key){
			listenToSiteId[key] = listenToSiteIdT[key];
		});

		//删除原来不存在的
		b.each(listenLists,function(key){
			if (!listenListsT[key]) {
				console.log('停止监听服务代码');
				delete listenLists[key];
			}
		});
		//插入新的
		b.each(listenListsT,function(key){
			listenLists[key] = listenListsT[key];
		});
		//删除原来不存在的
		b.each(siteIdToWorkerInfo,function(key){
			if (!siteIdToWorkerInfoT[key]) {
				console.log('停止worker代码');
				delete siteIdToWorkerInfo[key];
			}
		});
		//插入新的
		b.each(siteIdToWorkerInfoT,function(key){
			siteIdToWorkerInfo[key] = siteIdToWorkerInfoT[key];
		});
		
	};

	/**
	 * [sys.runFork 启动子进程]
	 */
	sys.forkReload = function(){
		let args = [];
		//有颜色
		if (args.indexOf('--color')<0) {
			args.push('--color');
		}
		//回收内存
		if (args.indexOf('--expose-gc')<0) {
			args.push('--expose-gc');
		}

		workerIdLast = workerIdLast||0;
		//循环启动
		b.each(siteIdToWorkerInfo, function(siteId, wids_info) {
			for (; ((wids_info.cpu_len - wids_info.wids.length||0)>=1);) {
				let site = siteIdToSiteConfig[siteId] ;
				let options = siteIdToOptions[siteId] ;

				//虚拟主机模式[需要消耗资源来判断域名绑定]
				//生成 worker_id
				let worker_id = (++workerIdLast).toString();
				//启动子进程
				let worker = child_process.fork(options.workerFile, args, {
					silent : true,
					env:b.extend(true, {}, process.env, {
						CJB_JSNET_PROCESS_TYPE:'worker',
						CJB_JSNET_PROCESS_WORKER_ID:worker_id
					})
				});
				//加入子进程id
				worker.id = worker_id;
				worker.stdout.on('data', sys._log.onStdoutData.bind(worker));
				worker.stderr.on('data', sys._log.onStderrData.bind(worker));

				worker.log_path_output = site.config.log_output;
				worker.log_path_error = site.config.log_error;
				worker.log_path_all = site.config.log_all;
				//获取指针
				sys._log.getFd(worker.log_path_output);
				sys._log.getFd(worker.log_path_error);
				sys._log.getFd(worker.log_path_all);
				

				wids_info.wids = wids_info.wids||[] ;
				wids_info.wids.push(worker.id);
				workerIdToSiteId[worker.id] = siteId;
				workerIdToPId[worker.id] = worker.pid;
				//绑定事件
				sys.workerEventBind(worker);
				//插入数组中缓存起来
				master.workerIds.push(worker.id);
				master.workers[worker.id] = worker;

			}
		});
		args = void 0;
	};


	sys.serverListenReload = function(){
		master.servers = [];
		b.each(listenLists, function(type_port_ip, info) {
			var server;
				if (info.type=='ssl') {
					server = tls.createServer(sys.getSslOptions(info));
				}else{
					server = net.createServer();
				}
				server.listen_info = info ;
				server.listen_time = b.now() ;
				type_port_ip = info = void 0 ;
				server.listen_args = [] ;
				server.listen_args.push(server.listen_info.port) ;
				if (server.listen_info.ipaddress) {
					server.listen_args.push(server.listen_info.ipaddress) ;
				}
				master.servers.push(server);
				sys.serverBind(server);
				server.listen.apply(server, server.listen_args);
				server = void 0 ;
		});
	};

	/**
	 * [serverProxyListen 监听代理服务器]
	 * @author: 桦 <yuchonghua@163.com>
	 * @DateTime 2016-11-14T23:13:12+0800
	 * @return   {[type]}                 [description]
	 */
	sys.serverProxyListen = function(callback){
		let [q, server] = [b.queue(), net.createServer()];
			q.onEnd(function onEnd(state, res){
				if (q&&callback&&b.type(callback, 'function')) {
					if (state) {
						callback(null);
					}else{
						callback(res);
					}
				}
				q = callback = void 0;
			}).push((next)=>{
				//创建服务
				server.listen_info ={
					server_proxy:true,
					type_port_ip:'server_proxy'
				};
				//绑定服务
				sys.serverBind(server);
			}, true, (next)=>{
				//判断是否定义了管道
				if (!master._serverProxyListenPort) {
					if (process.platform === 'win32' || process.platform === 'win64') {
						master._serverProxyListenPort = '\\\\.\\pipe\\cjbjsnet.master.server.proxy.port.sock';
					}else{
						let os = require('os');
						master._serverProxyListenPort = os.tmpdir()+os.EOL+'cjbjsnet.master.server.proxy.port.sock';
					}
				}
				next();
			}, true, (next, success, fail)=>{
				// 如果存在管道通讯文件则删除
				try{
					let stat = fs.statSync(master._serverProxyListenPort);
					switch(true){
						case stat.isFile():
						case stat.isDirectory():
						case stat.isBlockDevice():
						case stat.isCharacterDevice():
						case stat.isSymbolicLink():
						case stat.isFIFO():
						case stat.isSocket():
							fs.unlink(master._serverProxyListenPort, function unlinkCb(err){
								return q&&(err?fail(err):next());
							});
						break;
						default:
							next();
						break;
					}
				}catch(e){
					next();
				}
			}, true, (next)=>{
				//监听管道
				server.listen(master._serverProxyListenPort);
				next();
			}, true, (next, success, fail)=>{
				//修改管道权限
				fs.access(master._serverProxyListenPort,  fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK, function(err) {
					return q&&(err?fail(err):next());
				});
			}, true, (next, success, fail)=>{
				//赋予管道权限
				fs.chmod(master._serverProxyListenPort, 0o666, function chmodCb(err){
					return q&&(err?fail(err):success());
				});
			});
	};
	/**
	 * [serverBind 绑定服务]
	 * @author: 桦 <yuchonghua@163.com>
	 * @DateTime 2016-11-14T23:10:01+0800
	 * @param    {[type]}                 server [description]
	 * @return   {[type]}                        [description]
	 */
	sys.serverBind = function(server){
		//监听
		server.on('listening',function listenCallback(){
			master.emit.call(master, 'server::listening', this.listen_info);
		});
		//错误
		server.on('error',function(e){
			let args = b.argsToArray(arguments);
				args.unshift('server::error');
				if(!master.emit.apply(master, args)){
					args[0] = 'error';
				}
				args = e = undefined ;
		});
		if (server.listen_info&&server.listen_info.type=='ssl') {
			/*
			server.on('tlsClientError',function(e){
				var args = b.argsToArray(arguments);
					args.unshift('server::error');
					master.emit.apply(master, args);
					args = e = undefined ;
			});
			*/
		}

		//关闭
		server.on('close',function closeCallback(){
			b.each(master.server, function(index, server) {
				//回收
				if (this&&
					this.listen_time&&
					this.listen_info&&
					this.listen_info.type_port_ip&&
					server&&
					server.listen_time&&
					server.listen_info&&
					server.listen_info.type_port_ip&&
					this.listen_time==server.listen_time&&
					this.listen_info.type_port_ip==server.listen_info.type_port_ip) {
						master.server.splice(index, 1);
				}
			}, true, this);
			master.emit.call(master, 'server::close', this.listen_info);
		});



		//连接部分
		if (server.listen_info&&server.listen_info.type=='ssl') {
			server.on('secureConnection',function connectionCb(socket){
				var listen_info = b.extend(true, {listen:socket.address()}, this.listen_info);
				socket.pause();
				socket.server_proxy = net.connect(master._serverProxyListenPort);
				socket.listen_info_json = new Buffer((JSON.stringify(listen_info)+'\r\n\r\n'),'utf-8');
				listen_info = undefined ;
				socket.server_proxy.on('connect',function connect(){
					var is_data_end = '';
					socket.server_proxy.write(socket.listen_info_json);
					socket.server_proxy._sys_onData=function data(data){
						is_data_end += data.toString();
						if (is_data_end=='listen_info_end') {
							socket.server_proxy.pause();
							socket.server_proxy.removeListener('data',socket.server_proxy._sys_onData);
							delete socket.server_proxy._sys_onData;
							socket.pipe(socket.server_proxy).pipe(socket);
							socket.server_proxy.resume();
							socket.resume();
						}
					};
					socket.server_proxy.on('data',socket.server_proxy._sys_onData);
					socket.server_proxy.on('error',function(){
						console.error('内部错误');
					});
					socket.on('error',function(){
						console.error('内部错误');
					});
				});
				//sys.newSocket(socket, this.listen_info.type_port_ip, this.listen_info);
				//socket = undefined;
			});
		}else if (server.listen_info&&server.listen_info.type=='tcp') {
			server.on('connection',function connectionCb(socket){
				var listen_info = b.extend(true, {listen:socket.address()}, this.listen_info);
				sys.newSocket(socket, this.listen_info.type_port_ip, listen_info);
				socket = undefined;
			});
		}else if (server.listen_info&&server.listen_info.server_proxy) {
			server.on('connection',function connectionCb(socket){
				sys.newSocket(socket, this.listen_info.type_port_ip, this.listen_info);
				socket = undefined;
			});

		}else{
		}
		server = void 0;
	};






	/**
	 * [getSslOptions 获取ssl的秘钥]
	 * @author: 桦 <yuchonghua@163.com>
	 * @DateTime 2016-11-14T22:06:05+0800
	 * @param    {[type]}                 options [description]
	 * @return   {[type]}                         [description]
	 */
	sys.getSslOptions = function(options){
		return {
			//key
			'key' :fs.readFileSync(options.key),
			//证书
			'cert':fs.readFileSync(options.cert),
			//秘钥
			'passphrase':options.passphrase
		};
	};
	sys.virtuaHostServerErrorEcho = function(socket, text, status){
		try{
			status = status || '501 Not Implemented';
			socket.write('HTTP/1.1 '+status+'\r\n');
			socket.write('Date: '+(new Date()).toGMTString()+'\r\n');
			socket.write('Server: Ddv/1.3.11 BSafe-SSL/1.38 (Unix) FrontPage/4.0.4.3\r\n');
			socket.write('Last-Modified: '+(new Date()).toGMTString()+'\r\n');
			socket.write('Connection: close\r\nContent-Type: text/html');
			socket.write('\r\n\r\n'+(text||status));
			socket.end();
		}catch(e){}
	};
	/**
	 * [sendSocketToWorker 转发子进程处理]
	 * @author: 桦 <yuchonghua@163.com>
	 * @DateTime 2016-11-14T23:08:56+0800
	 * @param    {[type]}                 headers         [description]
	 * @param    {[type]}                 type_port_ip    [description]
	 * @param    {[type]}                 listen_info     [description]
	 * @param    {[type]}                 socket          [description]
	 * @param    {[type]}                 bufferByBodyEnd [description]
	 * @return   {[type]}                                 [description]
	 */
	sys.sendSocketToWorker = function sendSocketToWorker(headers, type_port_ip, listen_info, socket, bufferByBodyEnd){
			let [hostLower, hostSource, workerId, worker, wids_info, wids, siteId] = [
					null,	null,		null,		null,	null,	null,	false
			];
			//精确匹配 type port ip host 模式
			if (type_port_ip&&listenToSiteId[type_port_ip]) {
				hostSource = headers.host ;
				hostLower = hostSource.toLowerCase() ;
				b.each(listenToSiteId[type_port_ip], function(hostI, siteIdI) {
					if(hostSource == hostI||hostLower == hostI.toLowerCase()){
						siteId = siteIdI===undefined?false:siteIdI;
					}
				});
				if (siteId===false) {
					//type port ip 模式匹配
					siteId = listenToSiteId[type_port_ip][''];
					if (siteId===undefined||siteId===null) {
						siteId = false;
					//判断ip是否匹配
					}else if(listen_info.listen.address!==listen_info.ipaddress&&listen_info.ipaddress!==''){
						siteId = false;
					}
				}
			}
			//默认站点
			if (siteId===false||(!siteIdToOptions[siteId])) {
				siteId = defaultListenSiteId ;
			}

			//尝试查找该站点
			if ((wids_info = (siteIdToWorkerInfo[siteId]))&&wids_info.wids&&wids_info.wids.length>0) {
				wids = wids_info.wids||[];

				//切除第一个-均衡 workerId
				workerId = wids.shift();
				//插入到末尾
				wids.push(workerId);
				if ((worker = (master&&master.workers[workerId]))&&(worker&&b.type(worker, 'object')&&b.type(worker.send, 'function'))) {
					master.sendToWorker(worker, 'socket::handle', {
						'type':listen_info.type,
						'info':b.extend(true, {}, listen_info,{
							remoteAddress:socket.remoteAddress,
							remoteFamily:socket.remoteFamily,
							remotePort:socket.remotePort
						}),
						'data_by_base64':bufferByBodyEnd.toString('base64')
					}, socket, [{ track: false, process: false }], (state, message)=>{
						if (!state) {
							sys.virtuaHostServerErrorEcho(socket, '转发长连接到子进程处理失败');
						}
					});
				}else{
					//进程重启吧
					console.log('进程不存在了');

					sys.virtuaHostServerErrorEcho(socket, '进程不存在了');
					return;
				}
			}else{
				//站点还是不存在啊
				sys.virtuaHostServerErrorEcho(socket, 'The site server does not exist');
				return;
			}
			headers = hostLower = hostSource = wids_info = wids  = siteId = workerId = worker = undefined ;
	};
	/**
	 * [newSocket 新的请求]
	 * @author: 桦 <yuchonghua@163.com>
	 * @DateTime 2016-11-14T22:10:07+0800
	 * @param    {[type]}                 socket       [description]
	 * @param    {[type]}                 type_port_ip [description]
	 * @param    {[type]}                 listen_info  [description]
	 * @return   {[type]}                              [description]
	 */
	sys.newSocket = function(socket, type_port_ip, listen_info){
		let bufferByBodyEnd = new Buffer(0);
		//错误
		socket.on('error',function(e){
			let args = b.argsToArray(arguments);
				args.unshift('socket::error');
				if(!master.emit.apply(master, args)){
					args[0] = 'error';
				}
				args = e = void 0 ;
		});
		socket.on('data',function(data){
			let [headers, server_proxy] = [null, (listen_info.server_proxy||false)];
			//累加缓冲区
			bufferByBodyEnd = sys.bufferAdd(bufferByBodyEnd, data);
			if (sys.bufferFindBody(bufferByBodyEnd) < 0) {
				//没有找到body继续等待数据
				return;
			}
			//如果是代理中转服务
			if (server_proxy) {
				//先测试能否解析json
				let listen_info_test = false;
				try{
					listen_info_test = JSON.parse(bufferByBodyEnd.toString());
				}catch(e){}
				//如果能解析，就提取  listen_info  和  type_port_ip
				if (listen_info_test&&listen_info_test.type_port_ip) {
					listen_info = listen_info_test ;
					type_port_ip = listen_info.type_port_ip;
					//清空管道缓冲区
					bufferByBodyEnd = new Buffer(0);
					//告诉代理中转服务获取成功
					socket.write('listen_info_end');
					return;
				}else{
					//告诉代理中转服务获取失败
					socket.write('listen_info_error');
					//结束连接
					socket.end();
					return;
				}
				listen_info_test = void 0;
			}
			//暂停连接
			socket.pause();
			//尝试 解析数据头
			if (!(headers = sys.parseRequest(bufferByBodyEnd))) {
				return;
			}
			sys.sendSocketToWorker(headers, type_port_ip, listen_info, socket, bufferByBodyEnd);
		});
	};
	/*
	 从请求头部取得请求详细信息
	 如果是 CONNECT 方法，那么会返回 { method,host,port,httpVersion}
	 如果是 GET/POST 方法，那么返回 { metod,host,port,path,httpVersion}
	*/
	sys.parseRequest = function parseRequest(buffer) {
		var s, method, method_matchres, arr, r;
			s = buffer.toString('utf8');
			r = false;
			method_matchres = s.split('\n')[0].match(/^([A-Z]+)\s/);
			if (method_matchres) {

				method = s.split('\n')[0].match(/^([A-Z]+)\s/)[1];
		
				if (method == 'CONNECT') {
					arr = s.match(/^([A-Z]+)\s([^\:\s]+)\:(\d+)\sHTTP\/(\d.\d)/);
					
					if (arr && arr[1] && arr[2] && arr[3] && arr[4])
						r = {
							method: arr[1],
							host: arr[2],
							port: arr[3],
							httpVersion: arr[4]
						};
				} else {
					arr = s.match(/^([A-Z]+)\s([^\s]+)\sHTTP\/(\d.\d)/);
					
					if (arr && arr[1] && arr[2] && arr[3]) {
						var host;
						try{
							host = s.match(/Host\:\s+([^\n\s\r]+)/);
							host = host&&host[1]||undefined;
						}catch(e){
							host = undefined ;
						}
						
						if (host) {
							var _p = host.split(':', 2);
							r = {
								method: arr[1],
								host: _p[0],
								port: _p[1] ? _p[1] : undefined,
								path: arr[2],
								httpVersion: arr[3]
							};
						}
					}
				}
			}
		s = method = method_matchres = arr = buffer = undefined ;
		return r;
	};

	/*
	 两个buffer对象加起来
	*/
	sys.bufferAdd = function bufferAdd(buf1, buf2) {
		var re = new Buffer(buf1.length + buf2.length);
		buf1.copy(re);
		buf2.copy(re, buf1.length);
		buf1 = buf2 = undefined ;
		return re;
	};

	/*
	 从缓存中找到头部结束标记("\r\n\r\n")的位置
	*/
	sys.bufferFindBody = function bufferFindBody(b) {
		for (var i = 0, len = b.length - 3; i < len; i++) {
			if (b[i] == 0x0d && b[i + 1] == 0x0a && b[i + 2] == 0x0d && b[i + 3] == 0x0a) {
				return i + 4;
			}
		}
		return -1;
	};
};