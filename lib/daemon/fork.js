'use strict'
/**
 * [daemon扩展模块]
 * @author: 桦 <yuchonghua@163.com>
 * @DateTime 2016-09-18T21:12:54+0800
 * @type {Object}
 */
// fork - child_process模块
const debug = require('debug')('ddv-worker:daemon:fork')
const fork = require('child_process').fork
const util = require('ddv-worker/util')
Object.assign(require('ddv-worker').prototype, {
  /**
   * [run 启动服务器程序]
   */
  run () {
    this.__runFork()
  },
  __ddvForkInit () {
    // 主进程退出了
    this.__runForkEventExit = (...args) => this.emit.apply(this, ['master::exit'].concat(args))
    // 主进程关闭了
    this.__runForkEventClose = (...args) => this.emit.apply(this, ['master::close'].concat(args))
    // 主进程出错了
    this.__runForkEventError = (...args) => this.emit.apply(this, ['master::error'].concat(args))
    // 系统消息
    this.__runForkEventMessage = (...args) => this.emit.apply(this, ['master::message'].concat(args))

    this.__runForkRemoveListener = () => {
      // 解绑主进程退出了
      this.master.removeListener('exit', this.__runForkEventExit)
      // 解绑主进程关闭了
      this.master.removeListener('close', this.__runForkEventClose)
      // 解绑主进程出错了
      this.master.removeListener('error', this.__runForkEventError)
      // 解绑主进程系统消息
      this.master.removeListener('message', this.__runForkEventMessage)
      // 标记没有id
      delete this.masterPid
    }
  },
  __runFork () {
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
    // 绑定主进程退出了
    this.master.on('exit', this.__runForkEventExit)
    // 绑定主进程关闭了
    this.master.on('close', this.__runForkEventClose)
    // 绑定主进程出错了
    this.master.on('error', this.__runForkEventError)
    // 绑定主进程系统消息
    this.master.on('message', this.__runForkEventMessage)
    // 绑定主进程退出了
    this.master.on('exit', this.__runForkRemoveListener)
    // 主进程关闭了
    this.master.on('close', this.__runForkRemoveListener)
    // 存储pid
    this.masterPid = this.master.pid
    // 标记为启动中
    this.masterStatus = 'Runing'
  }

})
