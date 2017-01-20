'use strict'
// domain模块
const domain = require('domain')
// Domain模块
const Domain = domain.Domain
module.exports = function (worker) {
  // 主模块
  // 系统内部配置
  const sys = worker.__sys_private__ = Object.create(null)
  worker.c = Object.create(null)
  worker.socketSum = 0
  worker.webSocketSum = 0
  worker.httpSum = 0
  worker.socketTimeout = 120000
  worker.gwcidTimeStamp = parseInt(worker.startTimeStamp)
  worker.headersServer = 'cjbjsnet ' + process.platform
  worker.status = 'Runing'
  worker.initEnd = false

  // 发信息个主进程的结果回调存储容器
  sys.processCallback = Object.create(null)
  sys.masterPingTimeOut = 30 * 1000

  worker.run = function workerRun () {
  }
  worker.on('master::event::workerSendToWorkerCallback', function workerSendToWorkerCallback (res) {
    if (sys.processCallback && sys.processCallback[res.id] && worker.isFunction(sys.processCallback[res.id])) {
      sys.processCallback[res.id]((res.state || false), (res.message || 'unknown_error'))
      delete sys.processCallback[res.id]
    }
  })
  worker.sendToWorker = function workerSendToWorker (workerId, type, message, handle, options, callback) {
    if (callback === void 0 && worker.isFunction(options)) {
      callback = options
      options = void 0
    }
    if (callback === void 0 && worker.isFunction(handle)) {
      callback = handle
      options = handle = void 0
    }
    if (callback === void 0 && worker.isFunction(message)) {
      callback = message
      options = message = void 0
    }
    var body
    body = Object.create(null)
    body.message = message
    body.toWorkerId = workerId
    body.id = worker.createNewPid()
    body.type = type
    sys.processCallback[body.id] = callback

    // 判断是否为相同进程的数据交互
    // if (!true) {

    // } else {
    worker.sendToMaster('workerSendToWorker', body, handle, options, function sendToMasterCb (state, message) {
      if (state !== true) {
        delete sys.processCallback[body.id]
        if (worker.isFunction(callback)) {
          callback(state, message)
        }
      }
      state = message = void 0
    })
    // }
  }
  worker.sendToMaster = function workerSendToMaster (type, message, handle, options, callback) {
    if (callback === void 0 && worker.isFunction(options)) {
      callback = options
      options = void 0
    }
    if (callback === void 0 && worker.isFunction(handle)) {
      callback = handle
      options = handle = void 0
    }
    if (callback === void 0 && worker.isFunction(message)) {
      callback = message
      options = message = void 0
    }
    var body, r
    body = Object.create(null)
    body.message = message
    body.id = worker.createNewPid()
    body.type = type
    sys.processCallback[body.id] = callback
    r = process.send(body, handle, options)
    body = type = message = handle = options = void 0
    if (r !== true) {
      delete sys.processCallback[body.id]
      if (worker.isFunction(callback)) {
        callback(false, 'WORKER_NOT_FIND_EVENT_FORM_MASTER')
      }
    }
    return r
  }
  worker.callMaster = function (name, data, handle, callback) {
    if (callback === undefined && worker.isFunction(handle)) {
      callback = handle
      handle = undefined
    }
    if (callback === undefined && worker.isFunction(data)) {
      callback = data
      data = undefined
    }
    var body
    body = Object.create(null)
    body.id = worker.createNewPid()
    body.name = name
    body.data = data
    sys.processCallback[body.id] = callback
    worker.sendToMaster('callMaster', body, handle, function (state, message) {
      if (state !== true && sys.processCallback[body.id] &&
        worker.isFunction(sys.processCallback[body.id])) {
        sys.processCallback[body.id](state, message)
        delete sys.processCallback[body.id]
      }
      body = undefined
    })
  }

  sys.init = function () {
    if (typeof process !== 'undefined' && typeof process.send === 'function') {
      sys.initByProcess()
    } else {
      sys.initByNotProcess()
    }
  }
  worker.updateServerConf = function (serverConf, callback) {
    if (worker.initEnd !== true) {
      worker.once('init::end', () => {
        worker.updateServerConf(serverConf, callback)
      })
      return
    }
    if (serverConf.defaultListen !== void 0) {
      serverConf.defaultListen = serverConf.defaultListen || worker.serverConf.defaultListen || []
    }
    serverConf.listen = serverConf.listen || worker.serverConf.listen || []
    serverConf.cpuLen = serverConf.cpuLen || worker.serverConf.cpuLen || 1
    Object.assign(worker.serverConf, serverConf)
    if (typeof process !== 'undefined' && typeof process.send === 'function') {
      worker.callMaster('updateServerConf', worker.serverConf, (state, message) => {
        if (state) {
          if (worker.isFunction(callback)) {
            callback(null)
          } else {
            console.log('service config update successful')
          }
        } else {
          if (worker.isFunction(callback)) {
            callback(new Error(message))
          } else {
            console.log('service config update fail')
          }
        }
        state = message = void 0
      })
    } else {
      let path = require('path')
      worker.siteRootPath = path.resolve('.', '.')
      console.log('worker.siteRootPath', worker.siteRootPath, worker.appRootPath)
      worker.server.listen({ port: 80 }, function () {
        console.log('监听了')
      })
      console.log('serverConf', serverConf)
    }
  }
  sys.emitInitEnd = function () {
    worker.initEnd = true
    // 触发初始化完毕事件
    process.nextTick(function () {
      worker.emit('init::end')
    })
  }

  sys.initByNotProcess = function () {
    worker.id = 0
    worker.workerId = worker.id
    worker.siteId = 0
    worker.serverConf = Object.create(null)
    worker.serverGuid = '2cb47a70-90d6-5df9-9416-84fa3b2da5d4'
    worker.debug = false
    sys.masterPingInit()
    // 触发初始化完毕事件
    sys.emitInitEnd()
  }
  sys.initByProcess = function () {
    // 绑定
    sys.masterEventBind()
    // 通过守护进程初始化
    sys.initByMaster()
    // 服务监听
    sys.serverListen()
  }
  sys.serverListen = function server () {
    worker.on('master::event::socket::handle', function socketHandleCb (res, socket) {
      sys.serverSocketEmit(res, socket)
    })
  }
  sys.socketEchoError = function socketEchoError (socket, e) {
    try {
      let status = e.status || '501 Not Implemented'
      socket.write('HTTP/1.1 ' + status + '\r\n')
      socket.write('Date: ' + (new Date()).toGMTString() + '\r\n')
      socket.write('Server: ' + worker.headersServer + '\r\n')
      socket.write('Last-Modified: ' + (new Date()).toGMTString() + '\r\n')
      socket.write('Connection: close\r\nContent-Type: text/html')
      socket.write('\r\n\r\n<pre>' + (e.message + '\r\n' + e.stack) + '</pre>')
      socket.end()
    } catch (e) {}
  }
  worker.serverRun = void 0
// 通过 socket 触发服务
  sys.serverSocketEmit = function serverSocketEmit (message, socket) {
    process.nextTick(function socketEmitNextTick () {
      if (!(worker.serverRun && worker.type(worker.serverRun, 'function'))) {
        if (worker.server instanceof Domain) {
          worker.serverRun = worker.server.run
        } else if (worker.server.domain instanceof Domain) {
          worker.serverRun = worker.server.domain.run
        } else {
          worker._worker_domain = domain.create()
          worker._worker_domain.add(worker.server)
          worker.serverRun = worker._worker_domain.run
        }
      }
      worker.serverRun(function socketEmitDomainRun () {
        sys.serverSocketEmitRun(message, socket)
        message = socket = void 0
      })
    })
  }
// 运行
  sys.serverSocketEmitRun = function serverSocketEmitRun (message, socket) {
    var data
    if (!worker.server) {
      sys.socketEchoError(socket, new Error('The plug-in service was not found'))
      return
    } else if (socket) {
      data = new Buffer(message.data_by_base64, 'base64')
      socket.info = message.info
      socket.readable = socket.writable = true
      socket.server = worker.server
      socket.isSocketNotEnd = true
      socket.on('socketSum::remove', function socketSumRemove () {
        if (this.isSocketNotEnd === true) {
          // 统计-1
          worker.socketSum--
          delete this.isSocketNotEnd
        }
      })
      // 在长连接错误的时候
      socket.on('error', function onErrorSocketSumRemove () {
        if (this.isSocketNotEnd) {
          this.emit('socketSum::remove')
        }
      })
      // 在长连接结束的时候
      socket.on('end', function onEndSocketSumRemove () {
        if (this.isSocketNotEnd) {
          this.emit('socketSum::remove')
        }
      })
      // 统计+1
      worker.socketSum++
      worker.server.emit('connection', socket)
      socket.emit('connect')
      socket.emit('data', data)
      socket.setTimeout(worker.socketTimeout)
      socket.resume()
    }
    message = socket = data = void 0
  }
  sys.masterPingInit = function masterPingInit () {
    if (sys.isMasterPingInit === true) {
      return
    }
    sys.isMasterPingInit = true
    sys.masterPingLastTime = worker.now()
    sys.setIntervalHandle = setInterval(sys.masterPing, sys.masterPingTimeOut)
  }
  sys.masterPing = function masterPing () {
    if ((worker.now() - (sys.masterPingLastTime || 0)) > (sys.masterPingTimeOut * 2)) {
      console.error('master exit')
      process.exit(0)
      return
    }
    try {
      // 和主进程ping
      worker.callMaster('ping', {
        'socketSum': worker.socketSum,
        'webSocketSum': worker.webSocketSum,
        'httpSum': worker.httpSum
      }, function pingCb (state, message) {
        // 最后的时间
        if (state) {
          sys.masterPingLastTime = worker.now()
        } else {
          console.error(message)
          process.exit(1)
        }
      })
    } catch (e) {
      // 设定过去
      sys.masterPingLastTime = 0
      // 设定ping
      sys.masterPing()
    }
  }
  sys.initByMaster = function sysInitByMaster () {
    worker.callMaster('init', {}, function getSiteInfoCb (state, message) {
      if (state && message) {
        worker.id = message.workerId
        worker.workerId = message.workerId
        worker.siteId = message.siteId
        worker.serverConf = message.serverConf
        worker.serverGuid = message.serverGuid
        worker.debug = message.serverConf.debug
        sys.masterPingInit()
        // 触发初始化完毕事件
        sys.emitInitEnd()
      } else {
        console.error(message)
        process.exit(1)
      }
    })
  }
  /** 局部使用开始 **/
  /**
   * [__init.masterEventBind 主进程事件初始化]-[内部使用]
   */
  sys.masterEventBind = function masterEventBind () {
    process.on('message', sys.onMasterMessage.bind(worker))
  }
  /**
   * [__init.onMasterMessage 主进程消息]-[内部使用]
   */
  sys.onMasterMessage = function onMasterMessage (res, handle) {
    if (!res) {
      return
    }
    if (res.type && res.id) {
      if (worker.emit(('master::event::' + res.type), res.message, handle)) {
        process.send({
          isCallback: true,
          id: res.id,
          state: true,
          message: 'OK'
        })
      } else {
        process.send({
          isCallback: true,
          id: res.id,
          state: false,
          message: 'WORKER_NOT_FIND_EVENT_FORM_MASTER'
        })
      }
    } else if (res.isCallback === true && res.id) {
      if (sys.processCallback && sys.processCallback[res.id] && worker.isFunction(sys.processCallback[res.id])) {
        sys.processCallback[res.id]((res.state || false), (res.message || 'unknown_error'))
      }
    }
  }
  /** 局部使用结束 **/
  /** 管理进程的事件开始 **/

  // 绑定守护进程对主进程调用的结果回调事件
  worker.on('master::event::callMasterRes', function callMasterRes (res) {
    if (sys.processCallback && sys.processCallback[res.id] && worker.isFunction(sys.processCallback[res.id])) {
      sys.processCallback[res.id]((res.state || false), (res.message || 'unknown_error'))
    }
  })
  // 守护进程对主进程的调用事件监听
  worker.on('master::event::callWorker', function (res, handle) {
    if (!worker.emit(('master::call::' + res.name), res.data, handle, function callCallback (state, message, handle, options) {
      if (!res) return
      worker.sendToMaster('callWorkerRes', {
        id: res.id,
        state: state,
        message: message
      }, handle, options)
      state = message = handle = options = res = void 0
    })) {
      if (!res) return
      worker.sendToMaster('callWorkerRes', {
        id: res.id,
        state: false,
        message: 'WORKER_NOT_FIND_FN_FORM_MASTER'
      })
      res = void 0
    }
    handle = void 0
  })
  // 守护进程对主进程的调用事件监听
  worker.on('master::call::kill', function getSiteLists (data, handle, callback) {
    callback(true, { pid: process.pid })
    setTimeout(function exitRun () {
      process.exit(0)
    }, 200)
  })
  /** 管理进程的事件结束 **/
  /**
   * [processInfoCb 管理进程查询子进程状态]
   * @author: 桦 <yuchonghua@163.com>
   * @DateTime 2016-11-16T15:02:10+0800
   * @param    {[type]}                 data             [description]
   * @param    {[type]}                 handle           [description]
   * @param    {[type]}                 callback){  data [description]
   * @return   {[type]}                                  [description]
   */
  worker.on('master::call::processInfo', function processInfoCb (data, handle, callback) {
    data = handle = void 0
    return callback && callback(true, {
      pid: process.pid,
      status: worker.status || 'unknown',
      debug: (worker.DEBUG ? 'Enabled' : 'Disabled'),
      lastUptime: (worker.starttime * 1000),
      memoryUsage: process.memoryUsage(),
      socket: worker.socketSum,
      ws: worker.webSocketSum,
      http: worker.httpSum
    })
  })
  // 启动
  sys.init()
}
