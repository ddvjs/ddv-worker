'use strict'
const debug = require('debug')('ddv-worker:master:api:get')
const master = require('ddv-worker')
// 工具
const util = require('ddv-worker/util')
// 系统内部配置
const sys = master.__sys_private__ = master.__sys_private__ || Object.create(null)
// 服务器workerid转serverid
const workerIdToSiteId = sys.workerIdToSiteId = sys.workerIdToSiteId || Object.create(null)
// 站点id 转 配置信息
const siteIdToServerConfig = sys.siteIdToServerConfig = sys.siteIdToServerConfig || Object.create(null)

Object.assign(master, {
  getWorkerById (worker) {
    // 判断类型，如果是数字或者字符串试图转换
    if (worker && (util.type(worker, 'number') || util.type(worker, 'string'))) {
      worker = (master && master.workers[worker]) || worker
    }
    if (!(worker && util.type(worker, 'object') && util.isFunction(worker.send))) {
      return Promise.reject(new master.MasterError('worker find not from master', null, 'WORKER_FIND_NOT_FROM_MASTER', 'getWorker'))
    }
    return Promise.resolve(worker)
  },
  getWidsBySiteId (siteId) {
    return master.getWidsInfoBySiteId().then(widsInfo => {
      if (widsInfo.wids && Array.isArray(widsInfo.wids)) {
        return Promise.resolve(widsInfo.wids)
      } else {
        return Promise.reject(new master.MasterError('wids find not from master', null, 'WORKER_FIND_NOT_FROM_MASTER', 'getWids'))
      }
    })
  },
  getWidsInfoBySiteId (siteId) {
    var widsInfo = siteId && sys.siteIdToWorkerInfo[siteId] || null
    if (widsInfo) {
      return Promise.resolve(widsInfo)
    } else {
      return Promise.reject(new master.MasterError('workers info find not from master', null, 'WORKER_FIND_NOT_FROM_MASTER', 'getWidsInfo'))
    }
  },
  getSiteIdS () {
    return Promise.resolve(Object.keys(sys.siteIdToWorkerInfo))
  },
  getProcessInfo () {
    return Promise.resolve({
      pid: process.pid,
      status: master.status || 'OK',
      lastUptime: (master.startTimeStamp * 1000),
      memoryUsage: process.memoryUsage()
    })
  },
  // 获取服务监听信息
  getServerConfByWorker (worker) {
    var workerId = worker.id || worker.worker_id || 0
    var siteId = worker.siteId || worker.site_id || workerIdToSiteId[workerId] || 0
    // 如果找不到站点
    if (!siteId) {
      return Promise.reject(new master.MasterError('site not find', null, 'SITE_ID_NOT_FIND'))
    }
    var serverConf = siteIdToServerConfig[siteId]
    // 如果找不到服务配置
    if (!serverConf) {
      return Promise.reject(new master.MasterError('server config not find', null, 'SERVER_CONFIG_NOT_FIND'))
    }
    return Promise.resolve(serverConf)
  },
  // 更新服务监听信息
  updateServerConfByWorker (serverConfNew, worker) {
    debug('updateServerConfByWorker', serverConfNew)
    var workerId = worker.id || worker.worker_id || 0
    var siteId = worker.siteId || worker.site_id || workerIdToSiteId[workerId] || 0
    debug('workerId,siteId', workerId, siteId)
    // 如果找不到站点
    if (!siteId) {
      return Promise.reject(new master.MasterError('site not find', null, 'SITE_ID_NOT_FIND'))
    }
    var serverConf = siteIdToServerConfig[siteId]
    // 如果找不到服务配置
    if (!serverConf) {
      return Promise.reject(new master.MasterError('server config not find', null, 'SERVER_CONFIG_NOT_FIND'))
    }
    if (serverConfNew.defaultListen !== void 0) {
      serverConf.defaultListen = serverConfNew.defaultListen || serverConf.defaultListen || []
    }
    serverConf.listen = serverConfNew.listen || serverConf.listen || []
    serverConf.cpuLen = serverConfNew.cpuLen || serverConf.cpuLen || 1
    master.loadSite(serverConf)
    return Promise.resolve(serverConf)
  }

})