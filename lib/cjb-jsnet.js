/** vim: et:ts=4:sw=4:sts=4
* see: https://github.com/chengjiabao/ddv for details
*/
/*jshint node: true */
/*jshint esversion: 6 */
/*global module, process */
'use strict';
let [util, type, domain, Jsnet] = [
	require('util'),
	(process.env.CJB_JSNET_PROCESS_TYPE||'daemon'),
	require('domain'),
	module.exports
];
//转小写
type = (type || 'daemon').toString().toLowerCase();
//强制是以下类型
type = ['master', 'worker', 'daemon'].indexOf(type)>-1 ? type : 'daemon';
if (['master', 'worker'].indexOf(type)>-1) {
	let CjbJsnet = class CjbJsnet extends domain.Domain{
		//构造函数
		constructor(){
			//调用父类构造函数
			super();
			//时间
			this.starttime = (new Date()).getTime()/1000;
			//压入方法
			require('./'+type+'.js')(this);
		}
		isCjbJsnet(o){
			return o&&(o instanceof CjbJsnet);
		}
	};
	Jsnet = new CjbJsnet();
}else{
	let CjbJsnet = class CjbJsnet extends domain.Domain{
		//构造函数
		constructor(){
			//调用父类构造函数
			super();
			//时间
			this.starttime = (new Date()).getTime()/1000;
			//调用
			this.__construct();
		}
		isCjbJsnet(o){
			return o&&(o instanceof CjbJsnet);
		}

	};
	//继承
	let [proto, key] = [require('./daemon.js'), null];
	for (key in proto) {
		CjbJsnet.prototype[key] = proto[key];
	}
	Jsnet = CjbJsnet.CjbJsnet = CjbJsnet;
}

module.exports = Jsnet;