'use strict'
// 工具
const util = require('ddv-worker/util')
// 子进程
const childProcess = require('child_process')
// 导出模块
module.exports = function (pid, killOutTime) {
  var onChildError, onChildMessage, onChildExit, child, timer
  var onEnd = function () {
    if (child) {
      clearTimeout(timer)
      // 试图解除错误事件绑定
      try { child.removeListener('error', onChildError) } catch (e) {}
      try { child.removeListener('disconnect', onChildExit) } catch (e) {}
      try { child.removeListener('exit', onChildExit) } catch (e) {}
      try { child.removeListener('close', onChildExit) } catch (e) {}
      try { child.removeListener('message', onChildMessage) } catch (e) {}
    }
    onChildError = onChildMessage = onChildExit = child = void 0
  }
  return new Promise((resolve, reject) => {
    var childPid
    var node = process.argv[0] || process.execPath || 'node'
    // 命令行运行文件
    var filePath = require.resolve('ddv-worker/lib/daemon/killOutTime.js') || './killOutTime.js'
    // 配置项
    var options = {
      // 子进程将会被作为新进程组的leader
      detached: true,
      // 环境变量
      env: Object.assign({
          // 使用颜色
        'DDV_WORKER_KILL_PID': pid,
        'DDV_WORKER_KILL_OUT_TIME': killOutTime
      }, process.env),
      // 输入输出
      stdio: ['ipc', 'inherit', 'inherit']
    }
    try {
      // 工作目录
      options.cwd = process.cwd()
    } catch (e) {}

    // 启动守护线程
    child = childProcess.spawn(node, [filePath], options)

    // 错误事件
    onChildError = function onChildError (e) {
      reject(e)
    }
    // 消息事件
    onChildExit = function onChildExit (code, signal) {
      reject(new Error(signal || ('exit code:' + code)))
    }
    // 消息事件
    onChildMessage = function onChildMessage (res) {
      if (res !== 'ddvKllDaemonInitEnd') {
        return
      }
      try {
        // 试图断开ipc连接
        child.disconnect()
      } catch (e) {}

      resolve()
    }
    // 错误绑定
    child.once('error', onChildError)
    // 断开连接绑定
    child.once('disconnect', function () {
      timer = setTimeout(() => {
        return onChildExit && util.isFunction(onChildExit) && onChildExit()
      }, 300)
    })
    // 退出绑定
    child.once('exit', onChildExit)
    // 关闭绑定
    child.once('close', onChildExit)
    // 绑定信息
    child.on('message', onChildMessage)
    // 进程pid
    childPid = child.pid
    // 父进程的事件循环引用计数中去除这个子进程
    child.unref()
    // 退出事件
    process.on('exit', () => {
      // 试图退出
      try { childPid && process.kill(childPid) } catch (e) {}
    })
  }).then(function (res) {
    onEnd()
    return res
  }).catch(function (e) {
    onEnd()
    throw e
  })
}
