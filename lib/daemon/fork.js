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
    // 主进程退出了
    this.master.on('exit', (...args) => this.emit.apply(this, ['master::exit'].concat(args)))
    // 主进程关闭了
    this.master.on('close', (...args) => this.emit.apply(this, ['master::close'].concat(args)))
    // 主进程出错了
    this.master.on('error', (...args) => this.emit.apply(this, ['master::error'].concat(args)))
    // 系统消息
    this.master.on('message', (...args) => this.emit.apply(this, ['master::message'].concat(args)))
    // 存储pid
    this.masterPid = this.master.pid
  }

})
