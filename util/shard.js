var mysql= require('mysql');
var shard ={};
module.exports = shard;
//true false 디폴트 인자 값처리 잘하기
//getConnection 호출 카운트와  Rlease 호출카운트는 항상 같아야한다.
//var poolCluster = mysql.createPoolCluster({defaultSelector:'ORDER'});
// loginMaster , servero0, server1, sever2


var _pools=[];
//static init 
function __init()
{
	_logger.log("sharding __init_call ");

	_pools.loginMaster = mysql.createPool(global._shardMaster);
	for( var i = 0 ; i < global._dbinfo.length; i++)
	{
		_pools.push(mysql.createPool(global._dbinfo[i]));
	}
}
__init();
var __conTrans = 0;

function _startTransAction(con, func)
{
	var args = Array.prototype.slice.call(arguments, 2);
	func = func|| function (){  };
	
	con.query("START TRANSACTION;",[], function (err,result) 
	{
			//console.log("start trans");
			func.apply(null,args);
	});
	
	return con.idx;
}

function _commit(con,  bRelease ,func)
{
	bRelease = (bRelease === false)?  false : true;
	func = func|| function (){};
	var args = Array.prototype.slice.call(arguments, 3);
	con.query("COMMIT;",[], function (err,result) 
	{
			//console.log("commit2");
			if(bRelease)
			{
				con.release();
			}
			func.apply(null, args);
	});
}

function _rollBack(con,bRelease, func)
{
	bRelease = bRelease === false ? false : true;
	var args = Array.prototype.slice.call(arguments, 3);
	func = func|| function (){};
	con.query("ROLLBACK;",[], function (err,result) 
	{
			//console.log("Roll back");
			if(bRelease)
			{
				con.release();
			}
			func.apply(null, args);
	});
}

var __transID = 0;
function Transaction ()
{
	this.transList =[];
	this.transId = __transID++;
}

Transaction.prototype.add=function (con)
{
	var args = Array.prototype.slice.call(arguments,1);
	//args.unshift(con);
	this.transList.push(con);
	args.unshift(con);
	
	_startTransAction.apply(null,args);
}

Transaction.prototype.rollBack=function (endFunc)
{
	// while(con = this.transList.shift())
	// {
		// console.log("rollback");
		// var args = Array.prototype.slice.call(arguments);
		// args.unshift(con);
		// _rollBack.apply(null,args);
	// }
	
	if(!endFunc)	endFunc = function() {};
	
	var total_con_cnt = this.transList.length;
	
	while(con = this.transList.shift())
	{
		_rollBack(con, true, function()
		{
			total_con_cnt--;
			if(total_con_cnt === 0)
			{
				endFunc();
			}
		});
	}
}

Transaction.prototype.commit=function (endFunc)
{
	// while(con = this.transList.shift())
	// {
		//console.log("commit");
		// var args = Array.prototype.slice.call(arguments);
		// args.unshift(con);
		// _commit.apply(null,args);
	// }
	
	if(!endFunc)	endFunc = function() {};

	var total_con_cnt = this.transList.length;
	
	while(con = this.transList.shift())
	{
		_commit(con, true, function()
		{
			total_con_cnt--;
			if(total_con_cnt === 0)
			{
				endFunc();
			}
		});
	}
}

shard.checkFunc = function ()
{
	console.log("-----");
	console.log("pool.login : ", _pools.loginMaster._allConnections.length,"pool.free-0:", _pools.loginMaster._freeConnections.length);
	console.log("pool.all-0 : ", _pools[0]._allConnections.length,"pool.free-0:", _pools[0]._freeConnections.length);
	console.log("pool.all-1 : ", _pools[1]._allConnections.length,"pool.free-1:", _pools[1]._freeConnections.length);
}

function __parseResult(result)
{
	if(!result)
		return null;
		
	if(result.length === 0)
		return null;
	
	var newResult = [];

	for(var i = 0; i < result.length; i++)
	{
		if(result[i]['fieldCount'] == null && result[i]['affectedRows'] == null)
		{
			if(Array.isArray(result[i]) && result[i].length == 1)
			{
				newResult.push(result[i][0]);
			}
			else
			{
				newResult.push(result[i]);
			}
		}
	}
	
	return newResult;
}

shard.iterator = function (tasks) 
{
	var makeCallback = function (index) 
	{
   		var fn = function () 	
		{
		   if (tasks.length) {
			   tasks[index].apply(null, arguments);
		   }
		   return fn.next();
   		};
		fn.next = function () 
		{
		   return (index < tasks.length - 1) ? makeCallback(index + 1): null;
		};
		return fn;
	};

	return makeCallback(0);
}

shard.waterfallByDBIdx = function (bidx, tasks, callback, bTrans, bRelease) 
{
	callback = callback || function () {};
	bTrans= bTrans===true? true: false;
	bRelease= bRelease===false? false: true;
	if (tasks.constructor !== Array) 
	{
  		var err = new Error('First argument to waterfall must be an array of functions');
  		return callback(err);
	}
	
	if(!_pools[bidx])
	{
		var err = new Error('bidx error : ' + bidx);
  		return callback(err);
	}

	_pools[bidx].getConnection( function (err,  con)
	{
		if(err)
		{
			console.log(err);
		}
		if (!tasks.length) 
		{
			return callback();
		}
		if(bTrans)
		{
			tasks.unshift(function (_con, clback)
			{
				_startTransAction(con, clback, null);
				
			});
		}
		var wrapIterator = function (iterator) 
		{
			return function (err) {
				if (err) {
					callback.apply(null, arguments);
					if(bTrans)
					{
						_rollBack(con ,bRelease);
					}
					else
					{
						if(bRelease) con.release();
					}
					callback = function () {};
				}
				else 
				{
					var args = Array.prototype.slice.call(arguments, 1);
					var next = iterator.next();
					args.push(con);
					if (next) {
						args.push(wrapIterator(next));
					}
					else {
						args.push(callback);
					}

					process.nextTick(function () {
					   iterator.apply(null, args);
						if(!next )
						{
							
							if(bTrans)
							{
								_commit(con,bRelease);
							}
							else
							{
								if(bRelease) con.release();
							}
						}
					});
				}
			};
		};
		wrapIterator(shard.iterator(tasks))();
	});
}

shard.waterfall= function (uuidx, tasks, callback, bTrans, bRelease)
{
	callback = callback || function () {};
	bTrans= bTrans===true ? true : false;
	bRelease= bRelease === false? false: true;
	if (tasks.constructor !== Array) 
	{
  		var err = new Error('First argument to waterfall must be an array of functions');
  		return callback(err);
	}
	_pools.loginMaster.getConnection( function (_err, con)
	{
		if(_err)
		{
			console.log(_err);
			func(_err, null);
		}
		else
		{
			con.query("SELECT * FROM u_login_master WHERE ulm_idx_i =?;",[uuidx],function (err, result)
			{
				if(err || result == null || result.length == 0)
				{
					//TODO error 
					callback(err, null);
				}
				else
				{
					var idx = parseInt(result[0]["ulm_rs_idx_si"]);
					con.release();
					shard.waterfallByDBIdx(idx, tasks, callback, bTrans, bRelease);
				}
			});
		}
	});
}

shard.oQuery = function (_objs, _endFunc, _bTrans)
{
	var _results=[];
	var _transAction = new Transaction();
	_bTrans = _bTrans === true ? true : true;
	_endFunc = _endFunc || function (){}; 
	
	var _connections = {};
	
	nCallBack = function(err, nObjs, index, results, endFunc, bTrans, transAction)
	{
		if(err)
		{
			if(bTrans)
				transAction.rollBack(function()
				{
					endFunc(err, results);
				});
			return;
		}
		++index;

		if(index < nObjs.length)
		{
			var tObj = nObjs[index];

			if(typeof tObj.beforeQuery === "function")
			{
				tObj.call = function(err, commit)
				{
					if(err !== null && err !== undefined)
					{
						if (bTrans)
							transAction.rollBack(function()
							{
								endFunc(err, results);
							});
						return;
					}

					if(commit === true)
					{
						transAction.commit(function()
						{
							endFunc(err,results);
						});
						return;
					}
					else if(commit === 'pass')
					{
						nCallBack(err ,nObjs, index, results, endFunc, bTrans, transAction);
					}
					else
					{
						tCall(nObjs, index, results, endFunc, bTrans, transAction);
					}
				};

				tObj.beforeQuery(results, tObj);
			}
			else
			{
				tCall(nObjs, index, results, endFunc, bTrans, transAction);
			}
		}
		else
		{
			transAction.commit(function()
			{
				endFunc(err,results);
			});
		}
	}
	tCall = function(nObjs, index, results, endFunc, bTrans,transAction)
	{
		if(index < nObjs.length)
		{	
			var tObj = nObjs[index];
			var dbIdx = tObj.dbIdx;
			if(dbIdx === null || dbIdx === undefined || dbIdx === -1)
			{
				_pools.loginMaster.getConnection( function(_err, con)
				{
					if(_err)
					{
						_logger.log(_err, "dbError");
						nCallBack(_err, nObjs,index, results, endFunc, bTrans, transAction);
					}
					else
					{
						con.query("SELECT * FROM u_login_master WHERE ulm_idx_i =?;", [tObj.uuidx], function(err, master_result)
						{
							if(err)
							{
								_logger.log(err, "dbError");
								nCallBack(err, nObjs,index, results, endFunc, bTrans, transAction);
								return;
							}
							
							con.release();
							
							if(master_result.length > 0)
							{
								dbIdx =  parseInt(master_result[0]["ulm_rs_idx_si"]);
							}
							else
							{
								nCallBack(new Error("empty res"), nObjs,index, results, endFunc, bTrans, transAction);
								return;
							}

							if(_connections[dbIdx] == null || _connections[dbIdx] == undefined)
							{
								_pools[dbIdx].getConnection(function(err,_con)
								{
									if(err) 
									{
										_logger.log(err, "dbError");
										nCallBack(err ,nObjs, index, results, endFunc, bTrans,  transAction);
										return;
									}
									
									_con.query(tObj.query, tObj.values, function(err, result)
									{
										if(result && result.constructor === Array)
										{
											if(result[0] && result[0][0] && result[0][0]['errno'] && result[0][0]['errno'] != 0)
												err = result[0][0]['errno'];
										}
										
										if(!bTrans)	_con.release();
										else
										{
											_connections[dbIdx] = _con;
											transAction.add(_con);
										}
										
										if(err) 
										{
											_logger.log({error : err, query : tObj.query, args : tObj.values}, "dbError");
											nCallBack(err ,nObjs, index, results,endFunc, bTrans, transAction);
											return;
										}
										results.push(result);
										nCallBack(err ,nObjs, index, results, endFunc, bTrans, transAction);
									});								
								});
							}
							else
							{
								_connections[dbIdx].query(tObj.query, tObj.values, function(err, result)
								{
									if(result && result.constructor === Array)
									{
										if(result[0] && result[0][0] && result[0][0]['errno'] && result[0][0]['errno'] != 0)
											err = result[0][0]['errno'];
									}
									
									if(!bTrans)	_connections[dbIdx].release();
									if(err) 
									{
										_logger.log({error : err, query : tObj.query, args : tObj.values}, "dbError");
										nCallBack(err ,nObjs, index, results,endFunc, bTrans, transAction);
										return;
									}
									results.push(result);
									nCallBack(err ,nObjs, index, results, endFunc, bTrans, transAction);
								});
							}
						});
					}
				});
			}
			else
			{
				if(_connections[dbIdx] == null || _connections[dbIdx] == undefined)
				{
					_pools[dbIdx].getConnection(function(err,_con)
					{
						if(err) 
						{
							nCallBack(err ,nObjs, index, results, endFunc, bTrans,  transAction);
							return;
						}
						if(bTrans) transAction.add(_con);
						_connections[dbIdx] = _con;
						_con.query(tObj.query, tObj.values, function(err, result)
						{
							if(result && result.constructor === Array)
							{
								if(result[0] && result[0][0] && result[0][0]['errno'] && result[0][0]['errno'] != 0)
									err = result[0][0]['errno'];
							}

							if(!bTrans) _con.release();
							if(err) 
							{
								_logger.log({error : err, query : tObj.query, args : tObj.values}, "dbError");
								nCallBack(err ,nObjs, index, results,endFunc, bTrans, transAction);
								return;
							}
							results.push(result);
							nCallBack(err ,nObjs, index, results, endFunc, bTrans, transAction);
						});								
					});
				}
				else
				{
					_connections[dbIdx].query(tObj.query, tObj.values,function(err, result)
					{
						if(result && result.constructor === Array)
						{
							if(result[0] && result[0][0] && result[0][0]['errno'] && result[0][0]['errno'] != 0)
								err = result[0][0]['errno'];
						}
						
						if(!bTrans) _connections[dbIdx].release();
						if(err) 
						{
							_logger.log({error : err, query : tObj.query, args : tObj.values}, "dbError");
							nCallBack(err ,nObjs, index, results,endFunc, bTrans, transAction);
							return;
						}
						results.push(result);
						nCallBack(err ,nObjs, index, results, endFunc, bTrans, transAction);
					});
				}
			}
		}
		else
		{
			// console.log("end Func",index);
		}
	}
	tCall(_objs,0, _results,_endFunc, _bTrans, _transAction);
}

shard.get_dbIdx = function(uuid, cb)
{
	_pools.loginMaster.getConnection( function (err, con)
	{
		if(err)
		{
			_logger.log(err, "dbError");
			cb(-1001);
		}
		else
		{
			con.query("SELECT * FROM u_login_master WHERE ulm_idx_i =?;", [uuid], function(err, master_result)
			{
				con.release();
				if(err) 
				{
					_logger.log(err, "dbError");
					cb(-1001);
					return;
				}
				
				if(master_result.length > 0)
				{
					cb(null, parseInt(master_result[0]["ulm_rs_idx_si"]));
				}
				else
				{
					cb(_error.errcode['ERR_WRONG_DATA']);
				}
			});
		}
	});
}

shard.singleQuery = function(dbIdx, uuid, query, args, cb, bTrans, essential_cnt)
{
	var connection = null;
	var transaction = new Transaction();
	
	// DB에서 가져올 데이터가 꼭 있어야 할 경우 갯수 설정, 만일 갯수 로 설정 후 데이터가 갯수와 맞지 않다면 에러 리턴
	essential_cnt = essential_cnt >= 0 ? essential_cnt : 0;
	bTrans = bTrans === true ? true : false;
	
	_async.waterfall([
		// 에러 확인 및 샤딩된 DB인데 dbIdx를 모르면 loginMaster를 통해서 구함
		function(next)
		{
			if(dbIdx === -1)
			{// with loginMaster
				shard.get_dbIdx(uuid, function(err, result)
				{
					next(err, result);
				});
			}
			else if(dbIdx === -2)
			{
				shard.get_dbIdx(uuid, function(err, result)
				{
					if(err || result === null)	cb(null, null);
					else			next(err, result);
				});
			}
			else if(!_pools[dbIdx])
			{// 여기 오면 코드 잘못
				_logger.log("SERVER ERROR!!!", "error");
				next(_error.errcode['ERR_SERVER']);
			}
			else
			{// 넘어온 dbIdx 사용
				next(null, dbIdx);
			}
		},
		// 실제 사용할 DB 커넥션 구함
		function(idx, endFunc)
		{
			_pools[idx].getConnection(function(err, con)
			{
				if(err)
				{
					_logger.log(err, "dbError");
				}
				else
				{
					if(bTrans)
					{
						transaction.add(con);
					}
				}
				endFunc(err, con);
			});
		}],
	function(err, connection)
	{
		if(err || !connection)
		{
			_logger.log("SERVER ERROR!!! - " + err, "error");
			cb(_error.errcode['ERR_SERVER']);
		}
		else
		{
			connection.query(query, args, function(err, result)
			{
				if(err)
				{
					// err = {};
					// err = _error.errcode['ERR_DB'];
					_logger.log({error : err, query : query, args : args}, "dbError");
					if(bTrans)
					{
						transaction.rollBack(function()
						{
							cb(err, null);
						});
					}
					else
					{
						connection.release();
						cb(err, null);
					}
				}
				else if(essential_cnt && result.length !== essential_cnt)
				{
					err = {};
					err = _error.errcode['ERR_WRONG_DATA'];
					_logger.log({error : err, query : query, args : args}, "critical");
					
					if(bTrans)
					{
						transaction.rollBack(function()
						{
							cb(err, null);
						});
					}
					else
					{
						connection.release();
						cb(err, null);
					}
				}
				else
				{
					result = __parseResult(result);

					if(result !== null)
					{
						for(var i = 0; i < result.length; i++)
						{
							if(result[i]['errno'])
							{
								err = {};
								err = result[i]['errno'];
								break;
							}
						}
					}
					
					if(bTrans)
					{
						if(err)
							transaction.rollBack(function()
							{
								cb(err, result);
							});
						
						else
							transaction.commit(function()
							{
								cb(err, result);
							});
					}
					else
					{
						connection.release();
						cb(err, result);
					}
				}
			});
		}
	});
}

// 샤딩된 모든 DB에 쿼리 날림
shard.aQuery = function (strQuery, args, endFunc, bTrans)
{
	var sCnt = _pools.length;
	var loop_cnt = 0;
	var results = [];
	var bContinue =true;
	var bTrans = bTrans === true ? true: false;
	var _bTrans = 0;
	var bRelease = !bTrans;
	var _transAction = new Transaction();
	var _conlist = [];
	
	_async.whilst(
		function()
		{
			return loop_cnt < global._dbinfo.length;
		},
		
		function(funcEnd)
		{
			_pools[loop_cnt++].getConnection(function(err, con)
			{
				if(err)	_logger.log(err, "dbError");
				else
				{
					if(bTrans)
					{
						_transAction.add(con, cllback, null );
					}
					
					con.query(strQuery, args, function(err, result)
					{
						if(err)
						{
							_logger.log({error : err, query : strQuery, args : args}, "dbError");
						}
						else
						{
							result = __parseResult(result);

							if(result && typeof(result) === Array)
							{
								for(var i = 0; i < result.length; i++)
								{
									if(result[i]['errno'])
									{
										err = {};
										err['errno'] = result[i]['errno'];
										break;
									}
								}
							}
							
							if(!err)
							{
								results.push(result);
							}
						}
						
						if(!bTrans)
						{
							con.release();
						}
						
						funcEnd();
					});
				}
			});
		},
		
		function(err)
		{
			var return_array = [];

			results.forEach(function(v)
			{
				if(Array.isArray(v) && v.length > 0)
					return_array = return_array.concat(v);
			});
			
			if(bTrans)
			{
				_transAction.commit(function()
				{
					endFunc(err, return_array);
				});
			}
			else
			{
				endFunc(err, return_array);
			}
		}
	);
};

shard.getUidxByKakao = function (uidx, func)
{
	_pools.loginMaster.getConnection( function (_err, con)
	{
		if(_err)
		{
			//TODO error 
			func(_err, null);
		}
		else
		{
			con.query("SELECT * FROM u_login_master WHERE ulm_kakao_bi =?;",[uidx],function (err, result)
			{
				con.release();
				if(err || result == null)
				{
					//TODO error 
					err = {};
					err['errno'] = -1001;
					func(err, null);
				}
				else
				{
					func(null, __parseResult(result));
					//func(null, result);
				}
			});
		}
	});
};

shard.setMasterUserJoin = function (kakaoIdx, serverIdx, func)
{
	_pools.loginMaster.getConnection( function (_err, con)
	{
		if(_err)
		{
			//TODO error 
			func(_err, null);
		}
		else
		{
			con.query("CALL set_user_join_master_info(?,?);",[kakaoIdx, serverIdx],function (err, result)
			{
				con.release();
				if(err || result == null)
				{
					//TODO error 
					err = {};
					err['errno'] = -1001;
					func(err, null);
				}
				else if(result[0][0]['errno'])
				{
					err = {};
					err['errno'] = result[0][0]['errno'];
					func(err, null);
				}
				else
				{
					func(null, __parseResult(result));
					//func(null, result);
				}
			});
		}
	});
};

// shard.query_with_master = function (uuidx, strQuery, args, func)
// {
	// _pools.loginMaster.getConnection( function (_err, _con)
	// {
		// if(_err)
		// {
			// func(_err, null);
		// }
		// else
		// {
			// _con.query("SELECT * FROM u_login_master WHERE ulm_idx_i =?;",[uuidx],function (err, result)
			// {
				// if(err || result == null || result.length == 0)
				// {
					// func(err, null);
				// }
				// else
				// {
					// if(result === null || result.length ===0)
					// {
						// err = {};
						// err['errno'] = -1001;
						// _con.release();
						// return;
					// }
					// var idx = parseInt(result[0]["ulm_rs_idx_si"]);
					// _pools[idx].getConnection( function (err,  con)
					// {
						// con.query(strQuery, args, function (err, result)
						// {
							// if(err || result == null)
							// {
								// err = {};
								// err['errno'] = -1001;
							// }
							// else
							// {
								// result = __parseResult(result);
								// if(result)
								// {
									// for(var i = 0; i < result.length; i++)
									// {
										// if(result[i]['errno'])
										// {
											// err = {};
											// err['errno'] = result[i]['errno'];
											// break;
										// }
									// }
								// }
							// }
						
							// func(err,__parseResult(result));
							// con.release();
						// });
					// });
				// }
				// _con.release();
			// });
		// }
	// });
// };

// shard.query_master = function(strQuery, args, func)
// {
	// _pools.loginMaster.getConnection( function (err,  con)
	// {
		// if(err)
		// {
			// func(err);
		// }
		// else
		// {
			// con.query(strQuery, args, function (err, result)
			// {
				// func(err,__parseResult(result));
				// con.release();
			// });
		// }
	// });
// }

// shard.query_master_trans = function(strQuery, args, func)
// {
	// _pools.loginMaster.getConnection( function (err,  con)
	// {
		// _startTransAction(con,function()
		// {
			// con.query(strQuery, args, function (err, result)
			// {
				// if(err || result == null)
				// {
					// err = {};
					// err['errno'] = -1001;
				// }
				// else
				// {
					// result = __parseResult(result);
					// if(result)
					// {
						// for(var i = 0; i < result.length; i++)
						// {
							// if(result[i]['errno'])
							// {
								// err = {};
								// err['errno'] = result[i]['errno'];
								// break;
							// }
						// }
					// }
				// }
				
				// if(err)
				// {
					// _rollBack(con,true ,func, err, null);	
				// }
				// else
				// {
					// _commit(con, true, func, null, __parseResult(result));
				// }
				
			// });

		// });
	// });
// }

// shard.query_ddb = function(strQuery, args, func)
// {
	// _pools.dataMaster.getConnection( function (err,  con)
	// {
		// if(err)
		// {
			// func(err);
		// }
		// else
		// {
			// con.query(strQuery, args, function (err, result)
			// {
				// func(err,__parseResult(result));
				//func(err, result);
				// con.release();
			// });
		// }
	// });
// }

// shard.query_ddb_trans = function(strQuery, args, func)
// {
	// _pools.dataMaster.getConnection( function (err,  con)
	// {
		// _startTransAction(con,function()
		// {
			// con.query(strQuery, args, function (err, result)
			// {
				// if(err || result == null)
				// {
					// err = {};
					// err['errno'] = -1001;
				// }
				// else
				// {
					// result = __parseResult(result);
					// if(result)
					// {
						// for(var i = 0; i < result.length; i++)
						// {
							// if(result[i]['errno'])
							// {
								// err = {};
								// err['errno'] = result[i]['errno'];
								// break;
							// }
						// }
					// }
				// }
				
				// if(err)
				// {
					// _rollBack(con,true ,func, err, null);	
				// }
				// else
				// {
					// _commit(con, true, func, null, __parseResult(result));
				// }
				
			// });

		// });
	// });
// }

shard.query_with_con = function(con, strQuery, args, func)
{
	con.query(strQuery, args, function (err, result)
	{	
		if(err || result == null)
		{
			//TODO error 
			err = {};
			err['errno'] = -1001;
			func(err, null);
		}
		else if(result[0] !== undefined && result[0][0]['errno'])
		{
			err = {};
			err['errno'] = result[0][0]['errno'];
			func(err, null);
		}
		else
		{
			func(null, __parseResult(result));
			//func(null, result);
		}
	});
}

// shard.tQuery_with_master = function (uuidx, strQuery, args, func)
// {
	// _pools.loginMaster.getConnection( function (_err, con)
	// {
		// if(_err)
		// {
			// func(_err, null);
		// }
		// else
		// {
			// con.query("SELECT * FROM u_login_master WHERE ulm_idx_i =?;",[uuidx],function (err, result)
			// {
				// if(err || result == null || result.length == 0)
				// {
					// func(err, null);
				// }
				// else
				// {
					// var idx = parseInt(result[0]["ulm_rs_idx_si"]);
					// _pools[idx].getConnection( function (err,  con)
					// {
						// _startTransAction(con,function()
						// {
							// con.query(strQuery, args, function (err, result)
							// {	
								// if(err || result == null)
								// {
									// err = {};
									// err['errno'] = -1001;
								// }
								// else
								// {
									// result = __parseResult(result);
									// if(result)
									// {
										// for(var i = 0; i < result.length; i++)
										// {
											// if(result[i]['errno'])
											// {
												// err = {};
												// err['errno'] = result[i]['errno'];
												// break;
											// }
										// }
									// }
								// }

								// if(Array.isArray(err) || (err != null && err.errno != null) )
								// {
									// _rollBack(con,true ,func, err, null);	
								// }
								// else
								// {
									// _commit(con, true, func, null, __parseResult(result));
								// }
								
							// });
						// });
					// });
				// }
				// con.release();
			// });
		// }
	// });
// };

// shard.query_with_trans = function (bidx, strQuery, args, func)
// {
	// if(!_pools[bidx])
	// {
		// var err = new Error('bidx error : ' + bidx);
  		// return func(err);
	// }

	// _pools[bidx].getConnection( function (err,  con)
	// {
		// _startTransAction(con,function()
		// {
			// con.query(strQuery, args, function (err, result)
			// {
				// if(err || result == null)
				// {
					// err = {};
					// err['errno'] = -1001;
				// }
				// else
				// {
					// result = __parseResult(result);
					// if(result)
					// {
						// for(var i = 0; i < result.length; i++)
						// {
							// if(result[i]['errno'])
							// {
								// err = {};
								// err['errno'] = result[i]['errno'];
								// break;
							// }
						// }
					// }
				// }
				
				// if(err)
				// {
					// _rollBack(con,true ,func, err, null);	
				// }
				// else
				// {
					// _commit(con, true, func, null, __parseResult(result));
				// }
				
			// });

		// });
	// });
// };

// shard.query_without_trans = function (bidx, strQuery, args, func)
// {
	// if(!_pools[bidx])
	// {
		// var err = new Error('bidx error : ' + bidx);
  		// return func(err);
	// }

	// _pools[bidx].getConnection( function (err,  con)
	// {
		// if(err)
		// {
			// func(err);
		// }
		// else
		// {
			// con.query(strQuery, args, function (err, result)
			// {
				// func(err,__parseResult(result));
				// con.release();
			// });
		// }
	// });
// };

shard.getBBS = function (page, count, func)
{
	_pools.dataMaster.getConnection( function (_err, con)
	{
		if(_err)
		{
			func(_err, null);
		}
		else
		{
			con.query("SELECT sb_idx_bi,sb_ul_idx_i,sb_body_vc,UNIX_TIMESTAMP(sb_rdt_ts) AS sb_rdt_ts, sb_nickname_vc, sb_lv_ti, sb_rank_vc AS user_rank FROM s_board ORDER BY sb_idx_bi DESC LIMIT ?, ?;",[page, count],function (err, result)
			{
				con.release();
				// console.log(result);
				if(err || result == null)
				{
					err = {};
					err['errno'] = -1001;
					func(err, null);
				}
				// else if(result && result[0]['errno'])
				// {
					// err = {};
					// err['errno'] = result[0]['errno'];
					// func(err, null);
				// }
				else
				{
					func(null, __parseResult(result));
				}
			});
		}
	});
};

shard.setBBS = function (uuid, title, message, nick, level, rank, func)
{
	_pools.dataMaster.getConnection( function (_err, con)
	{
		if(_err)
		{
			func(_err, null);
		}
		else
		{
			con.query("CALL set_board_add_info(?,?,?,?,?,?)",[uuid, title, message, nick, level, rank],function (err, result)
			{
				con.release();
				if(err || result == null)
				{
					err = {};
					err['errno'] = -1001;
					func(err, null);
				}
				else if(result && result[0] && result[0]['errno'])
				{
					err = {};
					err['errno'] = result[0]['errno'];
					func(err, null);
				}
				else
				{
					func(null, __parseResult(result));
				}
			});
		}
	});
};

shard.editBBS = function (uuid, index, title, message, func)
{
	_pools.dataMaster.getConnection( function (_err, con)
	{
		if(_err)
		{
			func(_err, null);
		}
		else
		{
			con.query("CALL set_board_edit_info(?,?,?,?)",[uuid, index, title, message],function (err, result)
			{
				con.release();
				if(err || result == null)
				{
					err = {};
					err['errno'] = -1001;
					func(err, null);
				}
				else if(result && result[0] && result[0]['errno'])
				{
					err = {};
					err['errno'] = result[0]['errno'];
					func(err, null);
				}
				else
				{
					func(null, __parseResult(result));
				}
			});
		}
	});
};

shard.delBBS = function (uuid, index, func)
{
	_pools.dataMaster.getConnection( function (_err, con)
	{
		if(_err)
		{
			func(_err, null);
		}
		else
		{
			con.query("CALL set_board_del_info(?,?)",[uuid, index],function (err, result)
			{
				con.release();
				if(err || result == null)
				{
					err = {};
					err['errno'] = -1001;
					func(err, null);
				}
				else if(result && result[0] && result[0]['errno'])
				{
					err = {};
					err['errno'] = result[0]['errno'];
					func(err, null);
				}
				else
				{
					func(null, __parseResult(result));
				}
			});
		}
	});
};

shard.gettime = function(callback)
{
	_pools.loginMaster.getConnection( function (_err, con)
	{
		if(_err)
		{
			callback(_err, null);
		}
		else
		{
			con.query("SELECT UNIX_TIMESTAMP(NOW()) AS db_time",[],function (err, result)
			{
				con.release();
				if(err || result == null)
				{
					err = {};
					err['errno'] = -1001;
					callback(err, null);
				}
				else if(result && result[0] && result[0]['errno'])
				{
					err = {};
					err['errno'] = result[0]['errno'];
					callback(err, null);
				}
				else
				{
					callback(null, __parseResult(result));
				}
			});
		}
	});
};

shard.get_last_user = function(callback)
{
	_pools.loginMaster.getConnection( function (_err, con)
	{
		if(_err)
		{
			callback(_err, null);
		}
		else
		{
			con.query("SELECT ulm_idx_i FROM u_login_master ORDER BY ulm_idx_i DESC LIMIT 1",[],function (err, result)
			{
				con.release();
				if(err || result == null)
				{
					err = {};
					err['errno'] = -1001;
					callback(err, null);
				}
				else if(result && result[0] && result[0]['errno'])
				{
					err = {};
					err['errno'] = result[0]['errno'];
					callback(err, null);
				}
				else
				{
					callback(null, __parseResult(result));
				}
			});
		}
	});
};
/*
(function ()
{
    root = this;
    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }
    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [shard.each].concat(args));
        };
    };

    //// cross-browser compatiblity functions ////

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    shard.each = function (arr, iterator, callback, dbidx, bTrans) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        arr.forEach( function (x) {	
            iterator(x, only_once(function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                }
            }));
        });
    };
    var _asyncMap = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = arr.map(function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (err, v) {
                results[x.index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    };

    var _parallel= function(eachfn, tasks, callback,uuidx, bTrans) {
        callback = callback || function () {};
		bTrans= bTrans||false;
		
		_pools.loginMaster.getConnection( function (_err, con)
		{
			if(_err)
			{
				func(_err, null);
			}
			else
			{
				con.query("SELECT * FROM u_login_master WHERE ulm_idx_i =?;",[uuidx],function (err, result)
				{	
					con.release();
					if(err || result == null || result.length == 0)
					{
						//TODO error 
						callback(err, null);
					}
					else
					{
						var idx = parseInt(result[0]["ulm_rs_idx_si"]);
						shard.parallelByDBIdx(idx, tasks, callback, bTrans);
						
					}
				});
			}
		});
    };
    var _parallelByDBIdx = function(eachfn, tasks, callback,dbidx, bTrans) {
        callback = callback || function () {};
		bTrans = bTrans=== true? true:false;
		_pools[dbidx].getConnection(function (err , con)	
		{
				if(bTrans)
				{
					
					_startTransAction(con, function ()
					{
						if(err)
						{
							callback(err);
						}
					});
				}
				if (tasks.constructor === Array) 
				{
					eachfn.map(tasks, function (fn, callback) {
						if (fn) {
							fn(con,function (err) {
								var args = Array.prototype.slice.call(arguments, 1);
								if (args.length <= 1) {
									args = args[0];
								}
								callback( err, args);
							});
						}
					}, function () {
			
						var args = Array.prototype.slice.call(arguments);
						if(bTrans)
						{
							(args[0])?   _rollBack(con, true): _commit(con, true);
						}
						else
						{
							con.release();
						}
						callback.apply(null,args);
					});
				}
				else {
					var results = {};
					eachfn.each(Object.keys(tasks), function (k, callback) {
						tasks[k](con,function (err) {
							var args = Array.prototype.slice.call(arguments, 1);
							if (args.length <= 1) {
								args = args[0];
							}
							results[k] = args;
							callback(err);
						});
					}, 
					function (err) 
					{
						if(bTrans)
						{
							(err)?  _rollBack(con,true): _commit(con,true);
						}
						else
						{
							con.release();
						}
						
						shard.checkFunc();
						callback(err, results);
					});
				}
		});
    };
    shard.map = doParallel(_asyncMap);
    shard.parallel= function (uuidx,tasks, callback,bTrans) {
        _parallel({ map: shard.map, each: shard.each }, tasks, callback, uuidx,bTrans);
    };
    shard.parallelByDBIdx  = function (dbidx,tasks, callback,bTrans) {
        _parallelByDBIdx({ map: shard.map, each: shard.each }, tasks, callback, dbidx,bTrans);
    };
})();*/

//exports.$$= _serverNames ;
//exmaple single
//shard.$(131313, "setName(?,?,?)",[12,23,], function (err, results)
//{
//});
//
//exmaple  mutiCall
//shard.query("getName(?,?,?)",[12,23,], function (err,results)
//{
//});