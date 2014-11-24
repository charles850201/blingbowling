/*
 * p_friend.js
 * friend 관련된 프로토콜 처리
 */

exports.run=function(res,data)
{
	new Friend(res,data);
}

function Friend(res,data)
{
	this.run(res, data);
}

Friend.func={};

Friend.init =  function()
{
	// 프로토콜에 함수 대입
	// p로 시작하는 함수가 프로토콜 전용 함수
	Friend.func[_protocol.protocol["friend"]["P_FRIEND_RECOMMAND_LIST"]] = Friend.prototype.pRecommandList;
	Friend.func[_protocol.protocol["friend"]["P_FRIEND_REQUEST"]] = Friend.prototype.pRequest;
	Friend.func[_protocol.protocol["friend"]["P_FRIEND_DELETE"]] = Friend.prototype.pDelete;
	Friend.func[_protocol.protocol["friend"]["P_FRIEND_ACCEPT"]] = Friend.prototype.pAccept;
	Friend.func[_protocol.protocol["friend"]["P_FRIEND_DENY"]] = Friend.prototype.pDeny;
	Friend.func[_protocol.protocol["friend"]["P_FRIEND_LIST"]] = Friend.prototype.pList;
	Friend.func[_protocol.protocol["friend"]["P_FRIEND_SEND_HEART"]] = Friend.prototype.pSendHeart;
	Friend.func[_protocol.protocol["friend"]["P_FRIEND_SEARCH"]] = Friend.prototype.pSearch;

	_logger.log("Friend init Call", "info");
}

// 객체생성 시점에서 실행되는것들임 
Friend.prototype = {
	run:function(res, data)
	{
		var ret = {cmd : data.cmd, rnd : null, errno : 0, uuid : data.info[0]};
		
		(Friend.func[data.cmd] === undefined) ? res.end("protocol not found"):Friend.func[data.cmd].apply(this,[data.info,ret,res]);
	},
	
	pRecommandList : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 2, info, ret, res)) return;
	},
	
	pRequest : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 3, info, ret, res)) return;
		
		var friend_uuid = info[2];

		_shard.singleQuery(-1, friend_uuid, "CALL set_friend_request(?,?);", [friend_uuid, uuid], function(err, result)
		{
		    if(err)
		    {
		        _logger.log({data : info, err : err}, "error");
		        _error.errorEvent.emit('error', err, ret, res);
		    }
		    else
		    {
		        res.end(JSON.stringify(ret));
		    }
		});
		
		//_async.waterfall([
		//	function(callback)
		//	{
		//		// 상대방 db에 내가 추가했다는 정보 insert
		//		_shard.singleQuery(-1, friend_uuid, "CALL set_friend_request(?,?);", [friend_uuid, uuid], function(err, result)
		//		{
		//			callback(err);
		//		});
		//	},
			//function(callback)
			//{
			//	// 내 db에 친구 추가
			//	_shard.singleQuery(bidx, uuid, "CALL set_friend_add(?,?);", [uuid, friend_uuid], function(err, result)
			//	{
			//		callback(err);
			//	});
			//}],
		//function(err, result)
		//{
		//	if(err)
		//	{
		//		_logger.log({data : info, err : err}, "error");
		//		_error.errorEvent.emit('error', err, ret, res);
		//	}
		//	else
		//	{
		//		res.end(JSON.stringify(ret));
		//	}
		//});
	},
	
	pDelete : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 3, info, ret, res)) return;
		
		var friend_uuid = info[2];
		
		_shard.singleQuery(bidx, uuid, "CALL set_friend_deny(?,?);", [uuid, friend_uuid], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				res.end(JSON.stringify(ret));
			}
		});
	},
	
	pAccept : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 3, info, ret, res)) return;
		
		var friend_uuid = info[2];

		_shard.singleQuery(bidx, uuid, "CALL set_friend_add(?,?);CALL set_friend_add(?,?);", [uuid, friend_uuid, friend_uuid, uuid], function (err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				res.end(JSON.stringify(ret));
			}
		});
	},
	
	pDeny : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 3, info, ret, res)) return;
		
		var friend_uuid = info[2];
		
		_shard.singleQuery(bidx, uuid, "CALL set_friend_deny(?,?);", [uuid, friend_uuid], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				res.end(JSON.stringify(ret));
			}
		});
	},
	
	pList : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 3, info, ret, res)) return;
		
		var status = info[2];	// 0: 요청한 친구, 1: 내 친구
		
		_shard.singleQuery(bidx, uuid, "CALL get_friend_list(?,?);",[uuid, status], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else if(!result[0] || result[0].length === 0)
			{
				ret.status = status;
				ret.friend_list = null;
				
				res.end(JSON.stringify(ret));
				return;
			}
			
			var friend_list = _util_func.getValues(result[0], 'friend_uuid');
			var send_time = _util_func.getKeyValues(result[0], 'friend_uuid', 'send_heart_time');

			ret.friend_list = [];
			
			var bidx_count = 0;
			_async.whilst(
				function()	{ return bidx_count < _dbinfo.length; },
				function(callback)
				{
					var bidx = bidx_count;
					bidx_count++;
					
					_shard.singleQuery(bidx, 0, "SELECT * FROM vw_u_friend WHERE uuid IN (" + friend_list.toString() + ");",[], function(err, result)
					{
						if(err)
						{
							_logger.log({data : info, err : err}, "error");
							callback(_error.errcode["ERR_DB"]);
						}

                        else if(!result || result[0].length === 0)
		                {
		                	ret.status = status;
		                	ret.friend_list = null;
		                	
		                	res.end(JSON.stringify(ret));
		                	return;
		                }

						else
						{
							result.forEach(function(v)
							{
								v.nickname = new Buffer(v.nickname).toString('base64');
								v.bidx = bidx;
								v.remain_heart_time = send_time[v.uuid];
								ret.friend_list.push(v);
							});
							callback();
						}
					});
				},
				function(err)
				{
					if(err)
						_error.errorEvent.emit('error', err, ret, res);
					else
						res.end(JSON.stringify(ret));
				}
			);
		});
	},
	
	pSendHeart : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 5, info, ret, res)) return;
		
		var friend_uuid = info[2];
		var char_type = info[3];
		var nick = info[4];//new Buffer(info[4], 'base64').toString('utf-8');
		
		_shard.singleQuery(bidx, uuid, "CALL set_friend_send_heart_time(?,?);", [uuid, friend_uuid], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				ret.send_heart_time = result[0].send_heart_time;
				res.end(JSON.stringify(ret));
				_shard.singleQuery(bidx, uuid, "CALL set_friend_send_heart(?,?,?,?);", [friend_uuid, uuid, char_type, nick], function(err, result)
				{
					if(err)	_logger.log({data : info, err : err}, "error");
				});
			}
		});
	},
	
	pSearch : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 3, info, ret, res)) return;
		
		var search_nick = info[2];//new Buffer(info[2], 'base64').toString('utf-8');
		
		ret.friend_list = [];
		
		var bidx_count = 0;
		_async.whilst(
			function()	{ return bidx_count < _dbinfo.length; },
			function(callback)
			{
				var bidx = bidx_count;
				bidx_count++;

				_shard.singleQuery(bidx, 0, "SELECT * FROM vw_u_friend WHERE nickname = '" + new Buffer(search_nick, 'base64').toString('utf-8') + "';",[], function(err, result)
				{
					if(err)
					{
						_logger.log({data : info, err : err}, "error");
						callback(_error.errcode["ERR_DB"]);
					}
					else
					{
						console.log(result);
						if(Array.isArray(result))
						{
							result.forEach(function(v)
							{
								v.nickname = new Buffer(v.nickname).toString('base64');
								v.bidx = bidx;
								ret.friend_list.push(v);
							});
						}
						callback();
					}
				});
			},
			function(err)
			{
				if(err)
					_error.errorEvent.emit('error', err, ret, res);
				else
					res.end(JSON.stringify(ret));
			}
		);
	},
}

Friend.init();
