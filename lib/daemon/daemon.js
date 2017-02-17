'use strict'
const debug = require('debug')('ddv-worker:daemon:daemon')
Object.assign(require('ddv-worker').prototype, {

  /**
   * 实例化后的初始化
   */
  __ddvDaemonInit () {
    debug('__ddvDaemonInit')
    this.__ddvDaemonEventInit()
  },
  __ddvDaemonEventInit () {
    this.on('master::exit', function (code, signal) {
      console.log('主进程Exit了', code, signal)
    })
    this.on('master::close', function (code, signal) {
      console.log('主进程死了', code, signal)
    })
    this.on('master::error', function (err) {
      console.log('主进程错了', err)
    })
  }
})

