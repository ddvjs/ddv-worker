# ddv-worker #

[![npm package](https://img.shields.io/npm/v/ddv-worker.svg)](https://www.npmjs.org/package/ddv-worker)
[![NPM downloads](http://img.shields.io/npm/dm/ddv-worker.svg)](https://npmjs.org/package/ddv-worker)


>* ddv-worker 是 [ddv](https://github.com/ddvjs/ddv) 的一个核心模块，他实现了整个线程的管护和管理，已经虚拟主机的 socket 的线程之间的转发

## 一、初始化
```javascript
var worker = require('ddv-worker');
```
## 二、使用

### 1、子线程
>* 所有的站点都依赖这个模块开发，该模块需要开发者提供一个http-server

>* 比如封装了 testworker.js

```javaScript

/*global module, process */
'use strict';
//定义进程标题
process.title = 'ddvSizeTest';
//jsnet模块-子线程模块
const worker = require('ddv-worker');
//Express 应用生成器
const express = require('express');
//生成一个应用
const app = express();
//服务调度模块
worker.server = http.createServer(app);

//app的进一步开发

worker.config = Object.create(null);
//判断是否初始化
worker._initEnd = false ;
//子线程初始化结束 时候 获取调试状态
worker.on('init::end',function(){
    //是否为调试模式
	worker.DEBUG = worker.DEBUG || false ;
    //标记已经初始化结束
	worker._initEnd = true ;
});
//导出一个模块
module.exports = function start(c){
    worker.config = c || worker.config || Object.create(null);
    c = void 0;
	//判断是否已经初始化完毕
	if (worker._initEnd===true) {
		//直接启动
		worker._start();
	}else{
		//初始化结束的时候启动
		worker.once('init::end',()=>{
			worker._start();
		});
	}
};

//标记没有启动过
let isStart = false ;
//服务启动
worker._start = function _start() {
    if (isStart===true) {
		//防止重复启动
        console.warn('不能重复开始');
        return ;
    }
	//标记已经启动
    isStart = true ;

	worker.server.setConfig(worker.config);

    //修改是否默认监听站点
	worker.serverConf.defaultListen = (worker.config.defaultListen===void 0)?(worker.serverConf.defaultListen||false):worker.config.defaultListen ;
    //修改监听数组
    worker.serverConf.listen = worker.config.listen || worker.serverConf.listen || [];
    //修改监听cpu核数
	worker.serverConf.cpuLen = worker.config.cpuLen || worker.serverConf.cpuLen || 1;
    //发送所以修改给管理线程，更新 监听信息
	worker.callMaster('updateServerConf', worker.serverConf, (state, message)=>{
		if (state) {
			console.log(`[pid:${process.pid}][wid:${worker.id}]更新服务器监听配置参数成功!`);
		}else{
			console.log(`[pid:${process.pid}][wid:${worker.id}]更新服务器监听配置参数失败!`);
		}
		state = message = void 0 ;
	});
};

/***********************异常错误处理模块开始***********************/

//服务器错误捕获，抛出到server::error
worker.server.on('error', function (e) {
	//客户端socket重置 忽略这一错误
	if (e.message == 'read ECONNRESET'&&e.name === 'Error') {
		return false;
	}else{
		worker.emit('server::error',e);
	}
	e = undefined ;
});
//server错误捕获处理
worker.on('server::error',function(e){
	if(e.stack){
		e.stack = Error().stack;
	}
	e.stack +='\nthis error is server error';
	worker.emit('error',e);
});
//socket错误捕获处理
worker.on('socket::error',function(e){
	if(e.stack){
		e.stack = Error().stack;
	}
	e.stack +='\nthis error is socket error';
	worker.emit('error',e);
});

//错误
worker.on('error',function(e){
	console.error(`[pid:${process.pid}][wid:${worker.id}]服务器内部错误开始`);
	console.error(e);
	console.error(`[pid:${process.pid}][wid:${worker.id}]服务器内部错误结束`);
	console.error(Error().stack);
});

/***********************异常错误处理模块结束***********************/


/**
 * [processInfoCb 管理进程查询子进程状态]
 * @author: 桦 <yuchonghua@163.com>
 * @DateTime 2016-11-16T15:02:10+0800
 * @param    {[type]}                 data             [description]
 * @param    {[type]}                 handle           [description]
 * @param    {[type]}                 callback){	data [description]
 * @return   {[type]}                                  [description]
 */
worker.on('master::call::processInfo',function processInfoCb(data, handle, callback){
	data = handle = undefined ;
	return callback&&callback(true, {
		pid:process.pid,
		status:'Runing',
		debug:(worker.DEBUG?'Enabled':'Disabled'),
		lastUptime:(worker.starttime*1000),
		memoryUsage:process.memoryUsage(),
		socket:worker.socketSum,
		ws:worker.webSocketSum,
		http:worker.httpSum
	});
});


```

>* 以下是index.js

```javaScript

require('./testworker.js')({
    //非默认站点
    defaultListen:false,
    //监听数组
    listen:[
        {
            'type':'tcp',
            'host':'rpc.iceovideo.ping-qu.com',
            'port':80
        }
    ],
    //监听cpu核数
    cpuLen:1
});

```

>* 通过以下代码运行

```javaScript

node index.js

```


### 2、管理线程

>* master.js


```javaScript

//引入管理线程模块
const master = require('ddv-worker');

master.on('error',function masterError(e){
	log.tip('ERR ','MASTER_ERROR_WARN');
	log.error(e);
});
master.on('server::listening',function masterError(info){
	log.tip('INFO',['MASTER_SERVER_LISTENING', info&&info.type_port_ip]);
});
master.on('server::close',function masterError(info){
	log.tip('INFO',['MASTER_SERVER_LISTENING_CLOSE', info&&info.type_port_ip]);
});
master.on('server::error',function masterError(e){
	log.tip('ERR ','MASTER_SERVER_ERROR_WARN');
	log.error(e);
	process.exit(1);
});

//主进程启动完毕
master.on('loadend',function masterInit(){
    let site = {};
    site.logOutput = site.logOutput || path.join(site.path, 'log/output.log');
    site.logError = site.logError || path.join(site.path, 'log/error.log');
    site.logAll = site.logAll || path.join(site.path, 'log/all.log');
    //站点文件
    site.workerFile = site.workerFile || site.path;
    master.loadSite(site);
	//服务器启动
	master.serverRun();
	//重新载入站点
	master.reLoadSite();

});


```

### 3、守护线程

>* daemon.js


```javaScript

//引入守护线程模块
const DdvDaemon = require('ddv-worker/daemon');
let daemon = new DdvDaemon();
//监听加载完毕
daemon.on('loadend',()=>{
    //设置管理线程启动文件
	daemon.setMasterFile(path.resolve(__dirname,'./master.js'));
	//开始运行管理线程
	daemon.run();
});
```
