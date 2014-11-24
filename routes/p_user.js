/*
 * p_user.js
 * user 와 관련된 프로토콜 처리
 */

// 유저 실행
exports.run=function(res,data)
{
	new User(res,data);
}

function User(res,data)
{
	this.run(res, data);
}

// 프로토콜 별 실행할 함수를 저장할 배열
User.func={};

//객체 생성 이전 초기화작업을 여기서 한다. 
//static init
//전역 적으로한번만 호출되며 .. 파일로드시 적어도 한번은 호출됨 ..
User.init =  function()
{
	// 프로토콜에 함수 대입
	// p로 시작하는 함수가 프로토콜 전용 함수
	User.func[_protocol.protocol.user.P_USER_LOGIN] = User.prototype.pDoLogin;
	User.func[_protocol.protocol.user.P_USER_ASSET_INFO] = User.prototype.pAssetInfo;
	User.func[_protocol.protocol.user.P_USER_SET_NICKNAME] = User.prototype.pSetNickname;
	
	User.func[_protocol.protocol.user.P_USER_MAIL_INFO] = User.prototype.pMailInfo;
	User.func[_protocol.protocol.user.P_USER_MAIL_RECV] = User.prototype.pMailRecv;
	User.func[_protocol.protocol.user.P_USER_MAIL_RECV_ALL] = User.prototype.pMailRecvAll;	
	
	User.func[1004] = User.prototype.pPushTest;
	User.func[1005] = User.prototype.pIABTest;
	
	_logger.log("User init Call", "info");
}

// 객체생성 시점에서 실행되는것들임 
User.prototype = {
	run:function(res, data)
	{
		var ret = {cmd : data.cmd, rnd : null, errno : 0};
		
		if(data.cmd != _protocol.protocol.user.P_USER_LOGIN)
		{
			ret.uuid = data.info[0];
		}
		
		(User.func[data.cmd] === undefined) ? res.end("protocol not found"):User.func[data.cmd].apply(this,[data.info,ret,res]);
	},
	
	pDoLogin : function(info, ret, res)
	{
		var id = info[0];
		
		if(!id || id.length === 0)
		{
			_logger.log({data : info, err : "ERR_LOGIN_NOT_JOIN"}, "error");
			_error.errorEvent.emit('error', _error.errcode["ERR_LOGIN_NOT_JOIN"], ret, res);
			return;
		}
		
		ret.time = parseInt(new Date().getTime()/1000);
		
		_shard.singleQuery('loginMaster', 0, "CALL set_user_master_login(?);", [id], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
				return;
			}

			ret.uuid = result[0].uuid;
			ret.bidx = result[0].bidx;
			ret.new_day_conn = result[0].new_day_conn;	// 일 최초 접속 여부
			ret.new_week_conn = result[0].new_week_conn;	// 주 최초 접속 여부
			ret.daily_count = result[0].daily_cnt;	// 출첵 카운트
			ret.join = result[0].join;	// 회원 가입 여부
			
			var query = "";
			var args = [];
			
			// 회원 가입이라면 샤딩된 게임DB에도 추가하는 프로시저
			if(ret.join === 1)
			{
				query += " CALL set_user_join_info(?);";
				args.push(ret.uuid);
			}
			else
			{
				query += " CALL set_user_login(?);";
				args.push(ret.uuid);
			}
			
			// 일 최초 접속일 경우 ret.new_day_conn = 1, ret.new_week_conn = 0
			// 주 최초 접속일 경우 ret.new_day_conn = 1, ret.new_week_conn = 1
			// 둘 중 하나라도 있으면 해당 타입의 미션을 지우고 새로운 미션 지급
			if(ret.new_day_conn + ret.new_week_conn > 0)
			{
				// 미션 및 시간지난 우편을 지우는 프로시저
				query += " CALL clear_user_time_data(?,?);";
				args.push(ret.uuid, ret.new_day_conn + ret.new_week_conn)
				
				// 지급할 일일미션을 랜덤으로 생성
				var daily_mission_data = _mission_data.getMissionTypeData(1);
				var rand_array = _util_func.randomIntArray(0, daily_mission_data.length - 1, 3);
				
				// 최소한 일일 미션은 지급함으로 일일미션 지급하는 프로시저
				query += " CALL set_user_daily_mission(?,?,?,?,?,?,?);";
				args.push(ret.uuid,	daily_mission_data[rand_array[0]].id, daily_mission_data[rand_array[0]].goal_value,
											daily_mission_data[rand_array[1]].id, daily_mission_data[rand_array[1]].goal_value,
											daily_mission_data[rand_array[2]].id, daily_mission_data[rand_array[2]].goal_value);

				// 주간 미션도 지급해야 한다면 주간 미션 지급하는 프로시저도 등록
				if(ret.new_week_conn === 1)
				{
					// 지급할 주간미션을 랜덤으로 생성
					var weekly_mission_data = _mission_data.getMissionTypeData(2);
					rand_array = _util_func.randomIntArray(0, daily_mission_data.length - 1, 5);
					
					// 최소한 일일 미션은 지급함으로 일일미션 지급하는 프로시저
					query += " CALL set_user_weekly_mission(?,?,?,?,?,?,?,?,?,?,?);";
					args.push(ret.uuid,	weekly_mission_data[rand_array[0]].id, weekly_mission_data[rand_array[0]].goal_value,
												weekly_mission_data[rand_array[1]].id, weekly_mission_data[rand_array[1]].goal_value,
												weekly_mission_data[rand_array[2]].id, weekly_mission_data[rand_array[2]].goal_value,
												weekly_mission_data[rand_array[3]].id, weekly_mission_data[rand_array[3]].goal_value,
												weekly_mission_data[rand_array[4]].id, weekly_mission_data[rand_array[4]].goal_value);
				}
				
				// 만일 최초 가입이라면 일반 미션들 모두 추가해주어야 함
				if(ret.join === 1)
				{
					query += " INSERT INTO u_mission(umi_ul_idx_i, umi_mission_type_ti, umi_mission_id_i, umi_goal_cnt_i) VALUES";
					var normal_mission_data = _mission_data.getMissionTypeData(3);
					for(var i = 0; i < normal_mission_data.length; i++)
					{
						query += "(?,?,?,?),";
						args.push(ret.uuid, 3, normal_mission_data[i].id, normal_mission_data[i].goal_value);
					}
					
					query = query.substring(0, query.length-1) + ";";
				}
			}
			
			_shard.singleQuery(ret.bidx, ret.uuid, query, args, function(err, result)
			{
				if(err)
				{
					_logger.log({data : info, err : err}, "error");
					_error.errorEvent.emit('error', err, ret, res);
					return;
				}
			
				res.end(JSON.stringify(ret));
			}, true);
		}, true);
	},
	
	pAssetInfo : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 2, info, ret, res)) return;
		
		var query = "CALL set_user_asset_info(?);";
		query += " CALL get_user_item_info(?);";
		query += " CALL get_user_unit_info(?);";
		query += " CALL get_unit_equip(?);";
		query += " CALL get_unit_item_equip(?,0);";
		query += " CALL get_user_game_result(?,1);";
		query += " CALL get_user_ingame_gacha_item_info(?);";
		query += " CALL get_clear_stage_list_info(?);";
		query += " CALL get_user_mission_data(?);";
		query += " CALL get_user_mail_data(?);";
		query += " CALL get_user_unitbook_data(?);";
		
		_shard.singleQuery(bidx, uuid, query, [uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				if(!Array.isArray(result[1]))
					result[1] = [result[1]];
				if(!Array.isArray(result[2]))
					result[2] = [result[2]];
				if(!Array.isArray(result[3]))
					result[3] = [result[3]];
				if(!Array.isArray(result[4]))
				    result[4] = [result[4]];
				if (!Array.isArray(result[5]))
				    result[5] = [result[5]];
				if(result[7] !== null && !Array.isArray(result[7]))
					result[7] = [result[7]];
				if(!Array.isArray(result[8]))
					result[8] = [result[8]];
				if(!Array.isArray(result[9]))
				    result[9] = [result[9]];
				if (!Array.isArray(result[10]))
				    result[10] = [result[10]];
					
				result[0].nickname = new Buffer(result[0].nickname).toString('base64');
					
				ret.Asset = result[0];
				ret.Item = result[1];
				ret.Unit = result[2];
				ret.unit_equip = result[3];
				ret.Unit_ItemEquip = result[4];
				ret.Game_Result = result[5];
				ret.ingame_item = result[6];
				ret.clear_stage_list = result[7];
				ret.Mission = result[8];
				ret.Mail = result[9];
				ret.UnitBook = result[10];
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
	
	pSetNickname : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		var nickname = info[2];
		//var nickname = new Buffer(info[2], 'base64').toString('utf8');
		
		_shard.singleQuery(bidx, uuid, "CALL set_user_nickname(?,?);", [uuid, new Buffer(nickname, 'base64').toString('utf8')], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				ret['nickname'] = nickname;
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
	
	pMailInfo : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		_shard.singleQuery(bidx, uuid, "CALL get_user_mail_data(?);", [uuid], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				ret.info = result[0];
				res.end(JSON.stringify(ret));
			}
		});
	},
	
	pMailRecv : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 3, info, ret, res)) return;
		
		var mail_idx = info[2];
		
		
		_shard.singleQuery(bidx, uuid, "SELECT uma_attach_item_type_ti, uma_attach_itemid_i FROM u_mail WHERE uma_idx_bi = ? AND uma_delete_ts = 0;", [mail_idx], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				if(!result)
				{
					_logger.log({data : info, err : "ERR_DATA"}, "error");
					_error.errorEvent.emit('error', _error.errcode["ERR_DATA"], ret, res);
				}
				else
				{
					var attach_type = result[0].uma_attach_item_type_ti;
					var attach_id = result[0].uma_attach_itemid_i;
					
					var query = "";
					var args = [];
					
					// 장착 아이템
					if(attach_type >= 1 && attach_type <= 3)
					{
						query = "CALL set_item_add_info(?,?,?,?);";
						args.push(uuid, attach_id, 0, 0);
					}
					// 주화
					else if(attach_type >= 7 && attach_type <= 9 || attach_type === 12)
					{
						var item = _item_data.getItemData(attach_id);
						if(item === null || item === undefined)
						{
							_logger.log({data : info, err : "ERR_ITEM_WRONG_ID"}, "error");
							_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_WRONG_ID'], ret, res);
							return;
						}
					
						var add_money_type = 0;
						switch(attach_type)
						{
							case 7 :
								add_money_type = 1;
							break;
							case 8 : 
								add_money_type = 3;
							break;
							case 9 :
								add_money_type = 2;
							break;
						}
						
						query = "CALL set_money_add_info(?,?,?,?,?);";
						args.push(uuid, add_money_type, item.value_no, 0, 0);
					}
					// 가챠
					else if(attach_type === 13)
					{
						var gacha_data = _store_data.getStoreGachaData(attach_id);
						if(gacha_data === null || gacha_data === undefined)
						{
							_logger.log({data : info, err : "ERR_ITEM_WRONG_ID"}, "error");
							_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_WRONG_ID'], ret, res);
							return;
						}
						
						var new_object = null;
						var probability = _util_func.randomInt(1, 1000000);
						var total_probability = 0;
						for(var i in gacha_data)
						{
							total_probability += gacha_data[i].probability;
							if(total_probability >= probability)
							{
								new_object = _util_func.objectCopy(gacha_data[i]);
								break;
							}
						}
						
						if(new_object === null|| new_object === undefined)
						{
							_logger.log({data : info, err : "ERR_DATA"}, "error");
							_error.errorEvent.emit('error', _error.errcode['ERR_DATA'], ret, res);
							return;
						}
						
						// 아이템
						if(new_object.object_type === 1)
						{
							var item = _item_data.getItemData(new_object.object_id);
							if(item === null || item === undefined || !(item.type >= 1 && item.type <= 3))
							{
								_logger.log({data : info, err : "ERR_ITEM_WRONG_ID"}, "error");
								_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_WRONG_ID'], ret, res);
								return;
							}
							
							query = "CALL set_item_add_info(?,?,?,?);";
							args.push(uuid, new_object.object_id, 0, 0);
						}
						// 유닛
						else if(new_object.object_type === 2)
						{
							var unit_data = _unit_data.getUnitData(new_object.object_id);
							if(unit_data === undefined || unit_data === null)
							{
								_logger.log({data : info, err : "ERR_ITEM_WRONG_ID"}, "error");
								_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_WRONG_ID'], ret, res);
								return;
							}
							
							var unit_book_add_stat_type = 0;
							var unit_book_add_stat = 0;
							
							if(unit_data.is_book === 1)
							{
								unit_book_add_stat_type = unit_data.add_book_stat_type;
								unit_book_add_stat = unit_data.add_book_stat;
							}
							
							query = "CALL set_unit_add_info(?,?,?,?,?,?);";
							args.push(uuid, new_object.object_id, 0, 0, unit_book_add_stat_type, unit_book_add_stat);
						}
						else
						{
							_logger.log({data : info, err : "ERR_ITEM_WRONG_ID"}, "error");
							_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_WRONG_ID'], ret, res);
							return;
						}
					}
					// 유닛
					else if(attach_type === 14)
					{
						var unit_data = _unit_data.getUnitData(attach_id);
						if(unit_data === undefined || unit_data === null)
						{
							_logger.log({data : info, err : "ERR_ITEM_WRONG_ID"}, "error");
							_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_WRONG_ID'], ret, res);
							return;
						}
						
						var unit_book_add_stat_type = 0;
						var unit_book_add_stat = 0;
						
						if(unit_data.is_book === 1)
						{
							unit_book_add_stat_type = unit_data.add_book_stat_type;
							unit_book_add_stat = unit_data.add_book_stat;
						}
						
						query = "CALL set_unit_add_info(?,?,?,?,?,?);";
						args.push(uuid, attach_id, 0, 0, unit_book_add_stat_type, unit_book_add_stat);
					}
					else
					{
						_logger.log({data : info, err : "ERR_ITEM_WRONG_ID"}, "error");
						_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_WRONG_ID'], ret, res);
						return;
					}
					
					query += " UPDATE u_mail SET uma_delete_ts = NOW() WHERE uma_idx_bi = ?;";
					args.push(mail_idx);
					
					_shard.singleQuery(bidx, uuid, query, args, function(err, result)
					{
						if(err)
						{
							_logger.log({data : info, err : err}, "error");
							_error.errorEvent.emit('error', err, ret, res);
						}
						else
						{
							ret.info = result[0];
							ret.mail_idx = mail_idx;
							res.end(JSON.stringify(ret));
						}
					}, true);
				}
			}
		});
	},
	
	pMailRecvAll : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 2, info, ret, res)) return;
		
		// 받을 수 있는 우편을 모두 가져옴
		_shard.singleQuery(bidx, uuid, "SELECT uma_idx_bi, uma_attach_item_type_ti, uma_attach_itemid_i FROM u_mail WHERE uma_ul_idx_i = ? AND uma_delete_ts = 0;", [uuid], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				if(!result)
				{
					ret.info = null;
					res.end(JSON.stringify(ret));
					return;
				}
				
				var query = "";
				var args = [];
				
				var complete_mail_list = [];
				var add_gold = 0;
				var add_ruby = 0;
				var add_stamp = 0;
				var add_heart = 0;
                var add_ticket = 0;
				
				// 보상이 재화인 메일만 추림
				for(var i = 0; i < result.length; i++)
				{
					switch(result[i].uma_attach_item_type_ti)
					{
						case 7 :	add_gold += _item_data.getItemData(result[i].uma_attach_itemid_i).value_no;		complete_mail_list.push(result[i].uma_idx_bi);	break;
						case 8 :	add_stamp += _item_data.getItemData(result[i].uma_attach_itemid_i).value_no;	complete_mail_list.push(result[i].uma_idx_bi);	break;
						case 9 :	add_ruby += _item_data.getItemData(result[i].uma_attach_itemid_i).value_no;		complete_mail_list.push(result[i].uma_idx_bi);	break;
						case 12 :	add_heart += _item_data.getItemData(result[i].uma_attach_itemid_i).value_no;	complete_mail_list.push(result[i].uma_idx_bi);	break;
                        case 15 :   add_ticket += _item_data.getItemData(result[i].uma_attach_itemid_i).value_no;   complete_mail_list.push(result[i].uma_idx_bi);  break;
					}
				}
				
				// 해당 미션들에 대해 보상 받았다고 업데이트 해주는 쿼리 생성
				query += " UPDATE u_mail SET uma_delete_ts = NOW() WHERE uma_idx_bi IN (" + complete_mail_list.toString() + ");";
				// 재화 업데이트 해주는 프로시저
				query += " CALL set_all_money_add_info(?,?,?,?,?,?);";
				args.push(uuid, add_gold, add_ruby, add_stamp, add_heart, add_ticket);
				
				_shard.singleQuery(bidx, uuid, query, args, function(err, result)
				{
					if(err)
					{
						_logger.log({data : info, err : err}, "error");
						_error.errorEvent.emit('error', err, ret, res);
					}
					else
					{
						ret.info = result[0];
						ret.complete_mail_list = complete_mail_list;
						res.end(JSON.stringify(ret));
					}
				}, true);
			}
		});
	},
	
	pPushTest : function(info, ret, res)
	{
		var cj = require('./../util/cj');
		cj.init(3, "955563189091");
		cj.push.send_push(0, {message : "test"}, 0, [1], function(err)
		{
			console.log(err);
		});
		
		res.end("123");
	},
	
	pIABTest : function(info, ret, res)
	{
		var android = require('./../util/android');
		android.iab.init("MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnELnhCiCFUYEKa3QoxcS8uzfb4reBqUEHSJL+fzA/nz7pkjAnaHhoGQBR3XMRFOKAyWc41aGfDSpAwWUcUmjmFhBGK/5Hkrm4RP4swZnDKkv7uxuGC2NXsYdOtTsT28QzNQYqViZ2O6sjxii+uyjBcIjmlJHVqtueYLde3YoMPXSxYxphLHVmyd8r6umW8tZwrctDqYnVuaQNRIrjQLcm5VhQAOnUUSiYNe4HKuhXPIBDfoawN9ydcS98Mt4MRn2/fI6tHi6Y/esu4yQkO3z9fz5l0WUikVGNy/3BdblH6r97sDURM0hf750bb1lsqwbvcuK9Op5OtQftTiJMFlReQIDAQAB");
		var receipt = android.iab.verifyReceipt("{\"nonce\":46526285601748657,\"orders\":[{\"notificationId\":\"android.test.purchased\",\"orderId\":\"transactionId.android.test.purchased\",\"packageName\":\"com.billingtest\",\"productId\":\"android.test.purchased\",\"purchaseTime\":1352254159300,\"purchaseState\":0}]}",
		"GSZj8ntBLs0Bdty5fYE+wDD89xMSPVTtsiWHq8jGCm/r4FJu0elyNFKAaDm5+ABvloGp/J3rWsJ+fwBeLW9uUMgCFPLy3MhkwPiCfgFzFzEjep7iylW+l088BSTxCxvhrovkXW2FzjMGglr8nPphoMhVopnloNWUTzG5j+CFQACa+mY1suT1IGkYLNp9ITkFRnwtCVO+AOq/20Owess3uRsvhRFUMBp8FSb+d0wVXz3SIRcF2vav6Ub527i6FxncbaxOTZruduyhyzzAlYB0HwT1/YohnAPrmdIWIhvIuHa4Jbr/2SwezV2C1K9K4Difux+noNvYmjWVtCIsHMzfsw==");
		
		console.log(receipt);
		
		res.end("123");
	},
}

// 최초 초기화
User.init();