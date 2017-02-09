'use strict'
/**
 * [daemon扩展模块]
 * @author: 桦 <yuchonghua@163.com>
 * @DateTime 2016-09-18T21:12:54+0800
 * @type {Object}
 */
// fork - child_process模块
const debug = require('debug')('ddv-worker/daemon/fork')
const fork = require('child_process').fork
const util = require('ddv-worker/util')
Object.assign(require('ddv-worker').prototype, {
  /**
   * 实例化后的初始化
   */
  __construct () {
    debug('__construct')
  // 设置子进程总个数 默认一个子进程
    this.options = Object.create(null)
    this.options.args = []
    this.options.execArgv = process.execArgv
    this.options.env = process.env
    this.master = null
    this.masterFile = process.argv[1]
    this.sys = Object.create(null)
    this._processCallback = Object.create(null)
    if (this.options.args.indexOf('--color') < 0) {
      this.options.args.push('--color')
    }
    if (this.options.args.indexOf('--expose-gc') < 0) {
      this.options.args.push('--expose-gc')
    }
    this.__ddvIpcInit()
    this.__ddvSysInit()
    process.nextTick(() => {
      this.emit('loadend')
    })
    // 一定要返回实例化的对象
    return this
  },
  /**
   * [setMasterFile 设置主进程文件路径]
   * @param    {string}                 file [主进程文件路径]
   */
  setMasterFile (file) {
    this.masterFile = file
  }
})

const dp = require('ddv-worker').prototype
/**
 * [run 启动服务器程序]
 */
dp.run = function () {
  this.__runFork()
}
dp.__runFork = function () {
  debug('__runFork')
  // 环境变量
  this.masterEnv = Object.assign((this.masterEnv || {}), process.env, {
    // process type
    DDV_WORKER_PROCESS_TYPE: 'master',
    // server guid
    DDV_WORKER_SERVER_GUID: util.getServerGuid(process.env.DDV_WORKER_SERVER_GUID)
  })
  // run master
  this.master = fork(this.masterFile, this.options.args, {
    env: this.masterEnv
  })
  this.master.on('exit', dp.__onMasterExit.bind(this))
  this.master.on('close', dp.__onMasterClose.bind(this))
  this.master.on('error', dp.__onMasterError.bind(this))
  this.pid = this.master.pid
  // /还没有迁移
  this.master.on('message', function onMasterMessage (res, handle) {
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
      if (this._processCallback && this._processCallback[res.id] && util.isFunction(this._processCallback[res.id])) {
        this._processCallback[res.id]((res.state || false), (res.message || 'unknown_error'))
      }
    }
  }.bind(this))
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
  console.log('停止了')
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
      if (callback && util.isFunction(callback)) {
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
    if (callback && util.isFunction(callback)) {
      callback(pids)
    }
    setTimeout(function exitRun () {
      process.exit(0)
    }, 1000)
  })
}
module.exports = dp
