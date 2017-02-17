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
  constructor (message, stack, name, type) {
    debug('constructor')
      // 调用父类构造函数
    super(message)
    this.name = name || this.name || 'Error'
    this.type = type || this.type || 'MasterError'
    this.stack += stack ? ('\n' + stack) : ''
    message = stack = void 0
  }
}

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
    if (serverConfNew.defaultListen !== void 0) {
      serverConf.defaultListen = serverConfNew.defaultListen || serverConf.defaultListen || []
    }
    serverConf.listen = serverConfNew.listen || serverConf.listen || []
    serverConf.cpuLen = serverConfNew.cpuLen || serverConf.cpuLen || 1
    master.loadSite(serverConf)
    return Promise.resolve(serverConf)
  }
}, {
  kill () {
    // 杀掉服务
    return master.kill.siteAll().then(killLists => {
      // 插入杀掉自己
      killLists.push({type: 'master', pid: process.pid})
      // 定时器杀掉自己
      setTimeout(() => {
        // 杀掉自己
        process.exit(0)
      }, 200)
      return killLists
    })
  }
}, {
  kill: {
    // 杀掉所以站点
    siteAll () {
      master.getSiteIdS().then(siteIdS => {
        var killPromiseAll = []
        Array.isArray(siteIdS) && siteIdS.forEach(siteId => {
          killPromiseAll.push(master.kill.site(siteId))
        })
        return Promise.all(killPromiseAll).then(tkillLists => {
          var newLists = []
          Array.isArray(tkillLists) && tkillLists.forEach(killLists => {
            newLists = newLists.concat(killLists)
          })
          return newLists
        })
      })
    },
    // 杀掉指定站点
    site (siteId) {
      return master.getWidsBySiteId(siteId).then(wids => {
        var killPromiseAll = []
        Array.isArray(wids) && wids.forEach(wid => {
          killPromiseAll.push(master.kill.worker(wid))
        })
        return Promise.all(killPromiseAll).then(killLists => {
          Array.isArray(killLists) && killLists.forEach(worker => {
            worker.siteId = siteId
          })
        })
      })
    },
    // 杀掉指定子进程
    worker (worker) {
      worker = master.getWorker(worker)
      return new Promise((resolve, reject) => {
        try {
          var workerId = worker.id || worker.worker_id || 0
          worker.kill()
          resolve({type: 'worker', workerId, pid: worker.pid})
        } catch (e) {
          reject(e)
        }
      })
    }
  }
})

// 子进程查询服务器配置信息
master.onWorkerCall('getServerConf', function getServerConfCb (data, handle, worker) {
  debug('onWorkerCall::getServerConf', data)
  master.getServerConfByWorker(worker).then(data => ({data}))
})

// 更新服务监听信息
master.onWorkerCall('updateServerConf', function onUpdateServerConf (serverConfNew, handle, worker) {
  debug('onWorkerCall::updateServerConf', serverConfNew)
  master.updateServerConfByWorker(serverConfNew, worker).then(data => ({data}))
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
master.onDaemonCall('getProcessInfo', function getProcessInfoRun (data, handle) {
  return master.getProcessInfo().then(data => ({data}))
})
// 守护进程要杀掉所以进程
master.onDaemonCall('kill', function KillRun (data, handle) {
  debug('onDaemonCall::kill', data)
  return master.kill()
})
