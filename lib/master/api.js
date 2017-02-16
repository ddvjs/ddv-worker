const debug = require('debug')('ddv-worker/master/fork')
const master = require('ddv-worker')
// 工具
const util = require('ddv-worker/util')
// 系统内部配置
const sys = master.__sys_private__ = master.__sys_private__ || Object.create(null)
// 服务器workerid转serverid
const workerIdToSiteId = sys.workerIdToSiteId = sys.workerIdToSiteId || Object.create(null)
// 站点id 转 配置信息
const siteIdToServerConfig = sys.siteIdToServerConfig = sys.siteIdToServerConfig || Object.create(null)
// 服务器workerid转pid
const workerIdToPId = sys.workerIdToPId = Object.create(null)
/**
 * [masterError 主线程错误]
 * @author: 桦 <yuchonghua@163.com>
 * @DateTime 2016-11-14T14:39:39+0800
 * @param    {string}                 message [description]
 * @param    {string}                 stack   [description]
 * @return   {error}                          [description]
*/
master.MasterError = class MasterError extends Error {
    // 构造函数
  constructor (message, stack) {
    debug('constructor')
      // 调用父类构造函数
    super(message)
    this.name = this.name || 'Error'
    this.type = this.type || 'MasterError'
    this.stack += stack ? ('\n' + stack) : ''
    message = stack = void 0
  }
}
// 获取进程信息
master.on('worker::call::updateServerConf', function masterInit (serverConfNew, handle, callback, worker) {
  debug('worker::call::updateServerConf', serverConfNew)
  var workerId = worker.id || worker.worker_id || 0
  var siteId = worker.siteId || worker.site_id || workerIdToSiteId[workerId] || 0
  // 如果找不到服务配置
  if (!siteId) {
    callback(false, new Error('site id not find'))
    return
  }
  var serverConf = siteIdToServerConfig[siteId]
  // 如果找不到服务配置
  if (!serverConf) {
    callback(false, new Error('server config not find'))
    return
  }
  if (serverConfNew.defaultListen !== void 0) {
    serverConf.defaultListen = serverConfNew.defaultListen || serverConf.defaultListen || []
  }
  serverConf.listen = serverConfNew.listen || serverConf.listen || []
  serverConf.cpuLen = serverConfNew.cpuLen || serverConf.cpuLen || 1
  master.loadSite(serverConf)
  callback(true, serverConf)
})

  // 守护进程要杀掉所以进程
master.on('daemon::call::kill', function kill (data, handle, callback) {
  master.isKillExit = true
  var pids = []
  var killPromises = []
    // 循环拼接队列
  util.each(workerIdToSiteId, function (workerId) {
    killPromises.push(new Promise((resolve) => {
      master.callWorker(workerId, 'kill', (state, data) => {
        let processId = state ? data.pid : workerIdToPId[workerId]
        if (processId) {
          pids.push({
            processId: processId,
            workerId: workerId,
            state: state || false
          })
        }
        state = data = workerId = processId = void 0
        resolve()
      })
    }))
  })
  Promise.all(killPromises).then(() => {
    pids.push({
      processId: process.pid,
      workerId: 0,
      state: true
    })
    callback(true, pids)
    setTimeout(() => {
      process.exit(0)
    }, 100)
    if (util.isFunction(callback)) {
      callback(true, pids)
    }
    callback = void 0
  }).catch((e) => {
    if (util.isFunction(callback)) {
      callback(false, e)
    }
    callback = void 0
  })
})
master.on('worker::call::getServerConf', (data, handle, callback, worker) => {
  debug('worker::call::getServerConf', data)
  var res
  if (worker && worker.id && workerIdToSiteId[worker.id]) {
    res = Object.create(null)
    res.serverConf = siteIdToServerConfig[res.siteId]
    callback(true, res)
  } else {
    callback(false, 'worker not find')
  }
})
// 子进程查询服务器配置信息
master.onWorkerCall('getServerConf', function getServerConfCb (data, handle, worker) {
  debug('worker::call::getServerConf', data)
  return worker && worker.id && workerIdToSiteId[worker.id] ? Promise.resolve({serverConf: siteIdToServerConfig[res.siteId]}) : Promise.reject(new Error('worker not find'))
})

// ping 子进程ping
master.onWorkerCall('ping', function pingCb (data, handle, worker) {
  if (master.workers[worker.id]) {
    master.workers[worker.id].socketSum = data.socketSum
    master.workers[worker.id].webSocketSum = data.webSocketSum
    master.workers[worker.id].httpSum = data.httpSum
  }
  return Promise.resolve(true)
})

// 进程信息
master.onDaemonCall('processInfo', function processInfoCb (data, handle) {
  return Promise.resolve({
    data: {
      pid: process.pid,
      status: master.status || 'OK',
      lastUptime: (master.startTimeStamp * 1000),
      memoryUsage: process.memoryUsage()
    }
  })
})
