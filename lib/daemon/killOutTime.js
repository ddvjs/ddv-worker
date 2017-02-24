'use strict'
process.title = 'ddvKllDaemonOutTime'
if (process && typeof process.send === typeof function () {}) {
  process.send('ddvKllDaemonInitEnd')
}
// 进程pid
var pid = process.env.DDV_WORKER_KILL_PID
pid && (process.title = 'ddvKllOutTimePid' + pid)
// 超时杀掉
var killOutTime = process.env.DDV_WORKER_KILL_OUT_TIME || (30 * 1000)

var timer = setTimeout(() => {
  // 清理定时器
  clearTimeout(timer)
  try {
    process.kill(pid)
  } catch (e) {
    console.error('Kill the daemon wrong')
    console.error(e)
  }
}, killOutTime)
// 断开连接
try { process.disconnect() } catch (e) {}
// 在退出的时候
process.on('exit', () => {
  // 清理定时器
  clearTimeout(timer)
})
