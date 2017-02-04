'use strict'
// 子进程模块
const worker = require('ddv-worker')
// 工具类
const util = require('ddv-worker/util')
// 启动时间戳
worker.gwcidTimeStamp = parseInt(worker.startTimeStamp)
// 可以通过重写getProcessInfo方法来改变返回数据
worker.getProcessInfo = function (callback) {
  return util.isFunction(callback) && callback({
    pid: process.pid,
    status: worker.status || 'unknown',
    debug: (worker.DEBUG ? 'Enabled' : 'Disabled'),
    lastUptime: (worker.starttime * 1000),
    memoryUsage: process.memoryUsage(),
    socket: worker.socketSum,
    ws: worker.webSocketSum,
    http: worker.httpSum
  })
}
// 更新服务配置参数
worker.updateServerConf = function (serverConf, callback) {
  // 调试模式更新
  worker.DEBUG = util.type(serverConf.debug, 'boolean') || serverConf.debug !== void 0 ? Boolean(serverConf.debug) : worker.DEBUG
  if (worker.isHasMaster) {
  // 发送修改到 master
    worker.callMaster('updateServerConf', serverConf, (state, message) => {
      if (state) {
        if (util.isFunction(callback)) {
          callback(null)
        } else {
          console.log('service config update successful')
        }
      } else {
        if (util.isFunction(callback)) {
          callback(new Error(message))
        } else {
          console.log('service config update fail')
        }
      }
      state = message = void 0
    })
  } else {
    callback(new Error('不支持更新服务器配置'))
  }
}

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
  worker.getProcessInfo((data) => {
    callback && callback(true, data)
  })
})
