'use strict'
/*
 从请求头部取得请求详细信息
 如果是 CONNECT 方法，那么会返回 { method,host,port,httpVersion}
 如果是 GET/POST 方法，那么返回 { metod,host,port,path,httpVersion}
*/
module.exports = function parseRequest (buffer) {
  var s, method, methodMatchres, arr, r

  s = buffer.toString('utf8')

  r = false

  methodMatchres = s.split('\n')[0].match(/^([A-Z]+)\s/)

  if (methodMatchres) {
    method = s.split('\n')[0].match(/^([A-Z]+)\s/)[1]

    if (method === 'CONNECT') {
      arr = s.match(/^([A-Z]+)\s([^:\s]+):(\d+)\sHTTP\/(\d.\d)/)

      if (arr && arr[1] && arr[2] && arr[3] && arr[4]) {
        r = {
          method: arr[1],
          host: arr[2],
          port: arr[3],
          httpVersion: arr[4]
        }
      }
    } else {
      arr = s.match(/^([A-Z]+)\s([^\s]+)\sHTTP\/(\d.\d)/)

      if (arr && arr[1] && arr[2] && arr[3]) {
        var host
        try {
          host = s.match(/Host:\s+([^\n\s\r]+)/i)
          host = host && host[1] || undefined
        } catch (e) {
          host = undefined
        }

        if (host) {
          var _p = host.split(':', 2)

          r = {
            method: arr[1],
            host: _p[0],
            port: _p[1] ? _p[1] : undefined,
            path: arr[2],
            httpVersion: arr[3]
          }
        }
      }
    }
  }
  s = method = methodMatchres = arr = buffer = undefined
  return r
}
