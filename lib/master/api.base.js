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
  // 通过 worker 或者 worker_id 取得 worker
  getWorker (worker) {
    // 判断类型，如果是数字或者字符串试图转换
    if (worker && (util.type(worker, 'number') || util.type(worker, 'string'))) {
      worker = (master && master.workers[worker]) || worker
    }
    if (!(worker && util.type(worker, 'object') && util.isFunction(worker.send))) {
      return Promise.reject(new master.MasterError('worker find not from master', null, 'WORKER_FIND_NOT_FROM_MASTER', 'getWorker'))
    }
    return Promise.resolve(worker)
  },
  // 通过 siteId 获取 站点的子进程 id
  getWidsBySiteId (siteId) {
    return master.getWidsInfoBySiteId(siteId).then(widsInfo => {
      if (widsInfo.wids && Array.isArray(widsInfo.wids)) {
        return Promise.resolve(widsInfo.wids)
      } else {
        return Promise.reject(new master.MasterError('wids find not from master', null, 'WORKER_FIND_NOT_FROM_MASTER', 'getWids'))
      }
    })
  },
  // 通过 siteId 获取 站点的子进程的信息
  getWidsInfoBySiteId (siteId) {
    var widsInfo = siteId && sys.siteIdToWorkerInfo[siteId] || null
    if (widsInfo) {
      return Promise.resolve(widsInfo)
    } else {
      return Promise.reject(new master.MasterError('workers info find not from master', null, 'WORKER_FIND_NOT_FROM_MASTER', 'getWidsInfo'))
    }
  },
  // 获取所以的 站点id[siteId]
  getSiteIdS () {
    return Promise.resolve(Object.keys(sys.siteIdToWorkerInfo))
  },
  // 获取进程信息
  getProcessInfo () {
    return Promise.resolve({
      // pid
      pid: process.pid,
      // 状态
      status: master.status || 'Runing',
      // 最后更新时间
      lastUptime: (master.startTimeStamp * 1000),
      // 内存使用
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
