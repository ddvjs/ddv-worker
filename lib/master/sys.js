'use strict'
// 网络模块
const fs = require('fs')
// cjb_base模块
const os = require('os')
const util = require('ddv-worker/util')
const master = require('ddv-worker')
const processCallback = require('./processCallback')
// 扩展模块初始化

master.logError = function (e) {
  console.log('ddv-worker:master', e)
}
  /**
   * [master 管理模块]
   * 仅仅实例化一次
   * 因为一个守护进程只能产生一个管理进程，所以本模块只能被实例化一次
   */

  // 系统内部配置
const sys = master.__sys_private__ = master.__sys_private__ || Object.create(null)

  // /**************************** 子进程对管理进程调用结束 ****************************/

  /**
   * [emitMasterError 触发一条管理线程的错误]
   * @author: 桦 <yuchonghua@163.com>
   * @DateTime 2016-11-14T18:00:05+0800
   * @param    {[type]}                 message [description]
   * @param    {[type]}                 stack   [description]
   * @return   {[type]}                         [description]
   */
sys.emitMasterError = function emitMasterError (message, stack) {
  var e = new master.MasterError(message, stack)
  message = stack = void 0
  if (!master.emit('error', e)) {
    throw e
  }
  e = void 0
}
  /**
   * [initByDaemon 和守护进程通讯]
   * @author: 桦 <yuchonghua@163.com>
   * @DateTime 2016-11-14T18:00:28+0800
   * @return   {[type]}                 [description]
   */
sys.initByDaemon = function () {
  master.id = util.createNewPid()
  // 发信息给守护进程，启动被初始化
  // 触发初始化完毕事件
  process.nextTick(() => {
    master.emit('loadend')
  })
}
  /**
   * [daemonPingInit ping守护进程-初始化]
   * @author: 桦 <yuchonghua@163.com>
   * @DateTime 2016-11-14T17:59:04+0800
   * @return   {[type]}                 [description]
   */
sys.daemonPingInit = function daemonPingInit () {
  if (sys.isDaemonPingInit === true) return
  sys.isDaemonPingInit = true
  sys.daemonPingLastTime = master.now()
  sys.setIntervalHandle = setInterval(sys.daemonPing, sys.daemonPingTimeOut)
}
  /**
   * [daemonPing ping守护进程]
   * @author: 桦 <yuchonghua@163.com>
   * @DateTime 2016-11-14T17:58:44+0800
   * @return   {[type]}                 [description]
   */
sys.daemonPing = function daemonPing () {
  if ((master.now() - (sys.daemonPingLastTime || 0)) > (sys.daemonPingTimeOut * 2)) {
    console.error('daemon exit')
    process.exit(0)
    return
  }
  try {
    // 和主进程ping
    master.callDaemon('ping').then(() => {
        // 最后的时间
      sys.daemonPingLastTime = master.now()
    }, e => {
      console.error(e)
      process.exit(1)
    })
  } catch (e) {
    // 设定过去
    sys.daemonPingLastTime = 0
    // 设定ping
    sys.daemonPing()
  }
}

  /**
   * [init 绑定子进程的事件]
   */
sys.workerEventBind = function (worker) {
  'message exit close error'.split(' ').forEach(function (type) {
    worker.on(type, sys.onWorker[type].bind(worker))
  })
}

sys.onWorker = Object.create(null)
  /**
   * [init 子进程错误事件]-[m指向被是实例化的主进程，this是指传入事件的子进程worker]
   */
sys.onWorker.message = function (res, handle) {
  if (!res) return
  if (res.type && res.id) {
    if (master.emit(('worker::event::' + res.type), res.message, handle, this)) {
      if (res.type === 'workerSendToWorker') {
        return
      }
      this.send({
        isCallback: true,
        id: res.id,
        message: 'OK'
      })
    } else {
      let e = new master.MasterError('master not find event form worker')
      this.send({
        isCallback: true,
        id: res.id,
        message: e.message,
        errorStack: e.stack,
        errorType: e.type || 'WORKER_EVENT',
        errorName: e.name || 'MASTER_NOT_FIND_EVENT_FORM_WORKER'
      })
    }
  } else if (res.isCallback === true && res.id && processCallback && processCallback[res.id]) {
    if (res.errorStack) {
      if (util.isFunction(processCallback[res.id][1])) {
        let e = new master.MasterError(res.message || 'unknown error')
        e.stack = res.errorStack || e.stack
        e.type = res.errorType || 'unknownError'
        e.name = res.errorName || 'UNKNOWN_ERROR'
        e.id = res.id
        e.handle = handle
        processCallback[res.id][1].call(processCallback[res.id][2], e)
      }
    } else {
      if (util.isFunction(processCallback[res.id][0])) {
        processCallback[res.id][0].call(processCallback[res.id][2], {
          id: res.id,
          message: res.message,
          handle
        })
      }
    }
  }
}
  /**
   * [init 子进程错误事件]-[m指向被是实例化的主进程，this是指传入事件的子进程worker]
   */
sys.onWorker.exit = function (res, handle) {
  console.log(res, handle)
}
  /**
   * [init 子进程错误事件]-[m指向被是实例化的主进程，this是指传入事件的子进程worker]
   */
sys.onWorker.close = function (res, handle) {
    // console.log(res, handle/*, master*/);
}
  /**
   * [init 子进程错误事件]-[m指向被是实例化的主进程，this是指传入事件的子进程worker]
   */
sys.onWorker.error = function (res, handle) {
  console.log(res, handle)
}

  // 判断是否退出
master.isKillExit = false
  // cpu格式
master.cpuLen = os.cpus().length
  // 是否已经运行过
sys.is_run = false
  // ping超时
sys.daemonPingTimeOut = 30 * 1000
  // 日志对象
sys._log = Object.create(null)
  // 文件指针存储
sys._log.pathToFd = Object.create(null)
  // 队列
sys._log.bufferQueue = Object.create(null)
  // 队列锁
sys._log.bufferLock = Object.create(null)
  // 删除文件指针
sys._log.closeFd = function (path) {
  if (this[path]) {
    try {
      fs.openSync(this[path])
    } catch (e) {}
    delete this[path]
  }
}
  // 获取文件指针
sys._log.getFd = function (path) {
  if (path) {
    if (!this[path]) {
      this[path] = fs.openSync(path, 'a', 0o666)
      try {
        fs.chmodSync(path, 0o666)
      } catch (e) {}
    }
    return this[path]
  } else {
    return null
  }
}.bind(sys._log.pathToFd)
  // 写入
sys._log.write = function logWrite (path, buffer, offset, length) {
  if (length && length > 0) {
    this.bufferQueue[path] = this.bufferQueue[path] || []
    this.bufferQueue[path].push([buffer, offset, length])
  }
  buffer = offset = length = void 0
  if (this.bufferLock[path]) return
    // 加锁
  this.bufferLock[path] = true
  var q = this.bufferQueue[path].shift()
  var fd = null
  if ((fd = sys._log.getFd(path)) && q && q[0] && q[2]) {
    fs.write(fd, q[0], q[1], q[2], (e) => {
      this.bufferLock[path] = false
      if (this.bufferQueue[path].length > 0) {
        sys._log.write(path)
      } else {
        delete this.bufferQueue[path]
      }
      path = void 0
    })
  }
  q = fd = void 0
}.bind(sys._log)

sys._log.onStdoutData = function (data) {
  process.stdout.write(data)

  if (this.logPath) {
    sys._log.write(this.logPath.output, data, 0, data.length)
    sys._log.write(this.logPath.all, data, 0, data.length)
  }
}
sys._log.onStderrData = function (data) {
  process.stderr.write(data)

  if (this.logPath) {
    sys._log.write(this.logPath.error, data, 0, data.length)
    sys._log.write(this.logPath.all, data, 0, data.length)
  }
}
  /**
   * [run 运行管理进程的服务]
   * @author: 桦 <yuchonghua@163.com>
   * @DateTime 2016-11-14T23:27:14+0800
   * @return   {[type]}                 [description]
   */
master.serverRun = function masterServerRun () {
    // 守护线程检测初始化
  sys.daemonPingInit()
    // 服务监听初始化
  sys.serverListenInit()
}
  // 初始化服务模块
require('./server.js')
  // 通过守护进程初始化
sys.initByDaemon()
