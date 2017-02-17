'use strict'
const debug = require('debug')('ddv-worker:master:api:kill')
const master = require('ddv-worker')

Object.assign(master, {
  kill () {
    // 杀掉服务
    return master.kill.siteAll().then(killLists => {
      // 插入杀掉自己
      killLists.push({type: 'master', pid: process.pid, state: true})
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
        debug('siteAll:siteIdS', siteIdS)
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
        debug('site,siteId,wids', siteId, wids)
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
          debug('worker:workerId', workerId)
          worker.kill()
          resolve({type: 'worker', workerId, pid: worker.pid, state: true})
        } catch (e) {
          reject(e)
        }
      })
    }
  }
})
