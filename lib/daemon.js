'use strict'
/**
 * [daemon扩展模块]
 * @author: 桦 <yuchonghua@163.com>
 * @DateTime 2016-09-18T21:12:54+0800
 * @type {Object}
 */
// 主模块
const dp = {}
// fork - child_process模块
const fork = require('child_process').fork

/**
 * [__construct 实例化后的初始化]
 */
dp.__construct = function () {
  // 设置子进程总个数 默认一个子进程
  this.options = Object.create(null)
  this.options.args = []
  this.options.execArgv = process.execArgv
  this.options.env = process.env
  this.master = null
  this.masterFile = process.argv[1]
  this.sys = Object.create(null)
  this.sys.processCallback = Object.create(null)
  if (this.options.args.indexOf('--color') < 0) {
    this.options.args.push('--color')
  }
  if (this.options.args.indexOf('--expose-gc') < 0) {
    this.options.args.push('--expose-gc')
  }
  process.nextTick(function () {
    this.emit('loadend')
  }.bind(this))
}
/**
 * [setMasterFile 设置主进程文件路径]
 * @param    {string}                 file [主进程文件路径]
 */
dp.setMasterFile = function (file) {
  this.masterFile = file
}
/**
 * [run 启动服务器程序]
 */
dp.run = function () {
  this.__runFork()
}
dp.__runFork = function () {
  this.master = fork(this.masterFile, this.options.args, {
    env: this.extend(true, {
      DDV_WORKER_PROCESS_TYPE: 'master'
    }, process.env, {
      DDV_WORKER_PROCESS_TYPE: 'master'
    })
  })
  this.__eventInit()
  this.master.on('exit', dp.__onMasterExit.bind(this))
  this.master.on('close', dp.__onMasterClose.bind(this))
  this.master.on('error', dp.__onMasterError.bind(this))
  this.master.on('message', dp.__onMasterMessage.bind(this))
  this.pid = this.master.pid
}
dp.__eventInit = function () {
  // 绑定守护进程对主进程调用的结果回调事件
  this.on('master::event::callMasterRes', (res, handle) => {
    if (this.sys.processCallback && this.sys.processCallback[res.id] && this.isFunction(this.sys.processCallback[res.id])) {
      this.sys.processCallback[res.id]((res.state || false), (res.message || 'unknown_error'))
    }
  })
  // 主进程对守护进程的调用事件监听
  this.on('master::event::callDaemon', (res, handle) => {
    if (!this.emit(('master::call::' + res.name), res.data, handle, (state, message, handle, options) => {
      if (!res) return
      this.sendToMaster('callDaemonRes', {
        id: res.id,
        state: state,
        message: message
      }, handle, options)
      state = message = handle = options = res = undefined
    })) {
      if (!res) return
      this.sendToMaster('callDaemonRes', {
        id: res.id,
        state: false,
        message: 'DAEMON_NOT_FIND_CALL_FORM_MASTER'
      })
      res = undefined
    }
    handle = undefined
  })
  this.on('master::call::init', function masterInit (data, handle, callback) {
    return callback && callback(true, {
      serverGuid: this.serverGuid
    })
  })
  this.on('master::call::ping', function pingRun (data, handle, callback) {
    callback(true, true)
  })
}
dp.__onMasterMessage = function (res, handle) {
  if (!res) {
    return
  }
  if (res.type && res.id) {
    if (this.emit(('master::event::' + res.type), res.message, handle)) {
      this.master.send({
        isCallback: true,
        id: res.id,
        state: true,
        message: 'OK'
      })
    } else {
      this.master.send({
        isCallback: true,
        id: res.id,
        state: false,
        message: 'DAEMON_NOT_FIND_EVENT_FORM_MASTER'
      })
    }
  } else if (res.isCallback === true && res.id) {
    if (this.sys.processCallback && this.sys.processCallback[res.id] && this.isFunction(this.sys.processCallback[res.id])) {
      this.sys.processCallback[res.id]((res.state || false), (res.message || 'unknown_error'))
    }
  }
}
dp.callMaster = function (name, data, handle, callback) {
  if (callback === undefined && this.isFunction(handle)) {
    callback = handle
    handle = undefined
  }
  if (callback === undefined && this.isFunction(data)) {
    callback = data
    data = undefined
  }
  var body
  body = Object.create(null)
  body.id = this.createNewPid()
  body.name = name
  body.data = data
  this.sys.processCallback[body.id] = callback
  this.sendToMaster('callMaster', body, handle, (state, message) => {
    if (state !== true && this.sys.processCallback[body.id] &&
      this.isFunction(this.sys.processCallback[body.id])) {
      this.sys.processCallback[body.id](state, message)
      delete this.sys.processCallback[body.id]
    }
    body = undefined
  })
}
dp.sendToMaster = function masterSendToMaster (type, message, handle, options, callback) {
  if (callback === void 0 && this.isFunction(options)) {
    callback = options
    options = void 0
  }
  if (callback === void 0 && this.isFunction(handle)) {
    callback = handle
    options = handle = void 0
  }
  if (callback === void 0 && this.isFunction(message)) {
    callback = message
    options = message = void 0
  }
  var body, r
  body = Object.create(null)
  body.message = message
  body.id = this.createNewPid()
  body.type = type
  this.sys.processCallback[body.id] = callback
  r = this.master.send(body, handle, options)
  if (r!==true) {
    delete this.sys.processCallback[body.id]
    if (this.isFunction(callback)) {
      callback(false, 'DAEMON_SEND_TO_MASTER_FAIL')
    }
  }
  body = type = message = handle = options = callback = void 0
  return r
}
dp.__onMasterError = function (err) {
  console.log('主进程错了', err)
}
dp.__onMasterClose = function (code, signal) {
  console.log('主进程死了', code, signal)
}
dp.__onMasterExit = function (code, signal) {
  console.log('主进程Exit了', code, signal)
}
dp.stop = function stop (callback) {
  console.log('通天塔')
  this.master.kill()
}
dp.start = function start (callback) {

}
/**
 * [restart 重启]
 * @param    {Function}               callback [回调]
 */
dp.restart = function restart (callback) {
  this.stop((e, res) => {
    if (e) {
      if (callback && this.isFunction(callback)) {
        callback(e, res)
      }
    } else {
      this.start(callback)
    }
  })
}
/**
 * [kill 杀掉]
 * @param    {Function}               callback [回调]
 */
dp.kill = function kill (callback) {
  this.callMaster('kill', (state, pids) => {
    // 管理进程杀掉命令以及发送
    if (callback && this.isFunction(callback)) {
      callback(pids)
    }
    setTimeout(function exitRun () {
      process.exit(0)
    }, 1000)
  })
}
module.exports = dp
