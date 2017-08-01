'use strict'
const debug = require('debug')('ddv-worker:worker:api')
// 子进程模块
const worker = require('ddv-worker')
// 工具类
const util = require('ddv-worker/util')
// 配置信息
const config = require('./config.js')

/**
 * [masterError 主线程错误]
 * @author: 桦 <yuchonghua@163.com>
 * @DateTime 2016-11-14T14:39:39+0800
 * @param    {string}                 message [description]
 * @param    {string}                 stack   [description]
 * @return   {error}                          [description]
*/
worker.WorkerError = class WorkerError extends Error {
    // 构造函数
  constructor (message, stack) {
    debug('constructor')
      // 调用父类构造函数
    super(message)
    this.name = this.name || 'Error'
    this.type = this.type || 'WorkerError'
    this.stack += stack ? ('\n' + stack) : ''
    message = stack = void 0
  }
}
// 启动时间戳
worker.gwcidTimeStamp = parseInt(worker.startTimeStamp)
// 可以通过重写getProcessInfo方法来改变返回数据
worker.getProcessInfo = function () {
  return Promise.resolve({
    pid: process.pid,
    status: worker.status || 'unknown',
    lastUptime: (worker.startTimeStamp * 1000),
    memoryUsage: process.memoryUsage(),
    debug: (worker.DEBUG ? 'Enabled' : 'Disabled'),
    socket: worker.socketSum,
    ws: worker.webSocketSum,
    http: worker.httpSum
  })
}
// 获取服务配置参数
worker.getServerConf = function () {
  if (worker.isHasMaster) {
    // 发送获取请求到 master
    return worker.callMaster('getServerConf').then(({data}) => data)
  } else {
    // 更新失败
    return Promise.reject(new worker.WorkerError(config['not_supported_update']))
  }
}
// 更新服务配置参数
worker.updateServerConf = function (serverConf) {
  // 调试模式更新
  worker.DEBUG = util.type(serverConf.debug, 'boolean') || serverConf.debug !== void 0 ? Boolean(serverConf.debug) : worker.DEBUG
  if (worker.isHasMaster) {
    if (serverConf.notMasterListen) {
      delete serverConf.notMasterListen
    }
    // 发送修改到 master
    return worker.callMaster('updateServerConf', serverConf)
  } else {
    worker.notMasterListen = serverConf.notMasterListen
    // 更新失败
    return worker.serverListenPort()
  }
}
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
worker.onMasterCall('getProcessInfo', function getProcessInfoRun (data, handle) {
  return worker.getProcessInfo().then(data => ({data}))
})
