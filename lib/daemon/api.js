'use strict'
const debug = require('debug')('ddv-worker:daemon:api')
const util = require('ddv-worker/util')
const killself = require('./killself.js')
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
    return this.callMaster('kill')
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
    return this.callMaster('kill').catch(e => {
      this.logError(e)
      return []
    }).then(({data}) => {
      return Array.isArray(data) ? data : []
    }).then(lists => {
      return killself(
        process.pid,
        (process.env.KILL_DAEMON_TIMEOUT || (10 * 1000))
      ).then(() => lists)
    })
  }
})

