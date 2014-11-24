var winston = require('winston');

var __logger = {
	debug : null,
	info : null,
	warning : null,
	error : null,
	dbError : null,
	critical : null,
	db_rollback : null,
	init : function()
	{
		// log folder가 없으면 폴더 생성
		{
			var fs = require('fs');
			var _ret = fs.readdirSync('./');
			var _is = false;
			for(var i in _ret)
			{
				if(_ret[i] == 'log')
				{
					_is = true;
					break;
				}
			}
			
			if(!_is)
			{
				fs.mkdir('./log', 0777);
			}
			delete fs;
		}
	
		if(this.debug === null)
		{
			this.debug = new winston.Logger(
			{
				transports: [
				// new winston.transports.Console(
				// {
					// colorize : true,
					// level      : "debug"
				// }),
				new winston.transports.DailyRotateFile(
				{
					timestamp	: true,
					datePattern : ".yyyyMMddHH",
					level		: "debug",
					json		: true,
					filename	: "./log/debug.log",
				})]
			});
			
			this.debug.setLevels(winston.config.syslog.levels);
			this.debug.exitOnError = false;
		}
		
		if(this.info === null)
		{
			this.info = new winston.Logger(
			{
				transports: [
				new winston.transports.Console(
				{
					colorize : true,
					level      : "info"
				}),
				new winston.transports.DailyRotateFile(
				{
					timestamp	: true,
					datePattern : ".yyyyMMddHH",
					level		: "info",
					json		: true,
					filename	: "./log/info.log",
				})]
			});
			
			this.info.setLevels(winston.config.syslog.levels);
			this.info.exitOnError = false;
		}
		
		if(this.warning === null)
		{
			this.warning = new winston.Logger(
			{
				transports: [
				new winston.transports.Console(
				{
					colorize : true,
					level      : "warning"
				}),
				new winston.transports.DailyRotateFile(
				{
					timestamp	: true,
					datePattern : ".yyyyMMddHH",
					level		: "warning",
					json		: true,
					filename	: "./log/warning.log",
				})]
			});
			
			this.warning.setLevels(winston.config.syslog.levels);
			this.warning.exitOnError = false;
		}
		
		if(this.error === null)
		{
			this.error = new winston.Logger(
			{
				transports: [
				new winston.transports.Console(
				{
					colorize : true,
					level      : "error"
				}),
				new winston.transports.DailyRotateFile(
				{
					timestamp	: true,
					datePattern : ".yyyyMMddHH",
					level		: "error",
					json		: true,
					filename	: "./log/error.log",
				})]
			});
			
			this.error.setLevels(winston.config.syslog.levels);
			this.error.exitOnError = false;
		}
		
		if(this.dbError === null)
		{
			this.dbError = new winston.Logger(
			{
				transports: [
				new winston.transports.Console(
				{
					colorize : true,
					level      : "crit"
				}),
				new winston.transports.DailyRotateFile(
				{
					timestamp	: true,
					datePattern : ".yyyyMMdd",
					level		: "crit",
					json		: true,
					filename	: "./log/dbError.log",
				})]
			});
			
			this.dbError.setLevels(winston.config.syslog.levels);
			this.dbError.exitOnError = false;
		}
		
		if(this.critical === null)
		{
			this.critical = new winston.Logger(
			{
				transports: [
				new winston.transports.Console(
				{
					colorize : true,
					level      : "emerg"
				}),
				new winston.transports.DailyRotateFile(
				{
					timestamp	: true,
					datePattern : ".yyyyMMdd",
					level		: "emerg",
					json		: true,
					filename	: "./log/critical.log",
				})]
			});
			
			this.critical.setLevels(winston.config.syslog.levels);
			this.critical.exitOnError = false;
		}
		
		if(this.db_rollback === null)
		{
			this.db_rollback = new winston.Logger(
			{
				transports: [
				new winston.transports.DailyRotateFile(
				{
					timestamp	: true,
					datePattern : ".yyyyMMdd",
					level		: "error",
					json		: true,
					filename	: "./log/db_rollback.log",
				})]
			});
			
			this.db_rollback.setLevels(winston.config.syslog.levels);
			this.db_rollback.exitOnError = false;
		}
	},
	log : function(log_string, level)
	{
		if(level == null || level == undefined)
			level = "info";

		var message = log_string;
		
		if(level == 'error' || level === 'dbError' || level === 'critical' || level === 'db_rollback')
		{
			var e = new Error();
			message = 
			{
				log : log_string,
				stack : e.stack
			};
			delete e;
		}
		
		if(!this[level])
		{
			this.error.error(level + ' logger has not');
		}
		else if(level === 'dbError')
		{
			this[level]['crit'](message);
		}
		else if(level === 'critical')
		{
			this[level]['emerg'](message);
		}
		else if(level === 'db_rollback')
		{
			this[level]['error'](message);
		}
		else
		{
			this[level][level](message);
		}
	}
};

__logger.init();

module.exports = __logger;