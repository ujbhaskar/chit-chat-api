var log4js = require('log4js');
var findRemoveSync = require('find-remove');
var logger = '';


function configureLogger(){
	let date = new Date();
	let cdate = "_"+ ((date.getMonth()+1)<10?'0'+(date.getMonth()+1):(date.getMonth()+1))+"_"+(date.getDate()<10?'0'+date.getDate():date.getDate())+"_"+date.getFullYear();
	log4js.configure({
		appenders: { apilog: { type: 'file', filename: __dirname+'\\logs\\Api'+cdate+'.log' } },
		categories: { default: { appenders: ['apilog'], level: 'debug' } }
	});
	logger = log4js.getLogger('apilog');
}
configureLogger();
setTimeout(function(){
    configureLogger();
},1000*60*60*1);

function removeOldFiles(){
    logger.info('in removeOldFiles from path : ' , __dirname+'\\logs');
	var result = findRemoveSync(__dirname+'\\logs', {age: {seconds: 1*60*60*24*15},extensions: ['.log']});
	logger.info('removed files info is :', Object.keys(result).length);
	setTimeout(function(){
		removeOldFiles();
	},1000*60*60*6);
}
removeOldFiles();

module.exports = logger;