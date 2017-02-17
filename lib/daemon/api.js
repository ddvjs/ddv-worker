'use strict'
const debug = require('debug')('ddv-worker:daemon:api')
const util = require('ddv-worker/util')
Object.assign(require('ddv-worker').prototype, {

  /**
   * 实例化后的初始化
   */
  __ddvApiInit () {
    debug('__ddvApiInit')
  },
  /**
   * [setMasterFile 设置主进程文件路径]
   * @param    {string}                 file [主进程文件路径]
   */
  setMasterFile (file) {
    this.masterFile = file
  },

  stop (callback) {
    console.log('停止了')
    this.master.kill()
  },
  start (callback) {

  },
  /**
   * [restart 重启]
   * @param    {Function}               callback [回调]
   */
  restart (callback) {
    this.stop((e, res) => {
      if (e) {
        if (callback && util.isFunction(callback)) {
          callback(e, res)
        }
      } else {
        this.start(callback)
      }
    })
  },
  /**
   * [kill 杀掉]
   * @param    {Function}               callback [回调]
   */
  kill (callback) {
    return this.callMaster('kill').then(({data}) => {
      return Array.isArray(data) ? data : []
    }).then(pids => {

    })
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
})

