/*
 * p_mission.js
 * mission 과 관련된 프로토콜 처리
 */

exports.run=function(res,data)
{
	new Mission(res,data);
}

function Mission(res,data)
{
	this.run(res, data);
}

// 프로토콜 별 실행할 함수를 저장할 배열
Mission.func={};

//객체 생성 이전 초기화작업을 여기서 한다. 
//static init
//전역 적으로한번만 호출되며 .. 파일로드시 적어도 한번은 호출됨 ..
Mission.init =  function()
{
	// 프로토콜에 함수 대입
	// p로 시작하는 함수가 프로토콜 전용 함수
	Mission.func[_protocol.protocol.mission.P_MISSION_INFO] = Mission.prototype.pMissionInfo;
	Mission.func[_protocol.protocol.mission.P_MISSION_UPDATE] = Mission.prototype.pMissionUpdate;
	Mission.func[_protocol.protocol.mission.P_MISSION_REWARD] = Mission.prototype.pMissionReward;
	Mission.func[_protocol.protocol.mission.P_MISSION_REWARD_ALL] = Mission.prototype.pMissionRewardAll;
	
	_logger.log("Mission init Call", "info");
}

// 객체생성 시점에서 실행되는것들임 
Mission.prototype = {
	run:function(res, data)
	{
		var ret = {cmd : data.cmd, rnd : null, errno : 0, uuid : data.info[0]};
		
		(Mission.func[data.cmd] === undefined) ? res.end("protocol not found"):Mission.func[data.cmd].apply(this,[data.info,ret,res]);
	},
	
	pMissionInfo : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 2, info, ret, res)) return;
		
		_shard.singleQuery(bidx, uuid, "CALL get_mission_data(?);", [uuid], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				if(!Array.isArray(result[0]))
					result[0] = [result[0]];
				
				ret.Mission = result[0];
				res.end(JSON.stringify(ret));
			}
		});
	},
	
	pMissionUpdate : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 5, info, ret, res)) return;
		
		var mission_idx = info[2];
		var mission_id = info[3];
		var update_count = info[4];
		
		_shard.singleQuery(bidx, uuid, "CALL set_user_mission_update(?,?,?,?);", [uuid, mission_idx, mission_id, update_count], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				ret.Mission = result[0];
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
	
	pMissionReward : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 4, info, ret, res)) return;
		
		var mission_idx = info[2];
		var mission_id = info[3];
		
		var mission_data = _mission_data.getMissionData(mission_id);
		if(mission_data === null || mission_data === undefined)
		{
			_logger.log({data : info, err : "ERR_MISSION_WRONG_ID"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_MISSION_WRONG_ID'], ret, res);
			return;
		}
		
		var query = "";
		var args = [];
		
		// 장착 아이템
		if(mission_data.reward_type >= 1 && mission_data.reward_type <= 3)
		{
			query = "CALL set_item_add_info(?,?,?,?);";
			args.push(uuid, mission_data.reward_id, 0, 0);
		}
		// 주화
		else if(mission_data.reward_type >= 7 && mission_data.reward_type <= 9 || mission_data.reward_type === 12)
		{
			var item = _item_data.getItemData(mission_data.reward_id);
			if(item === null || item === undefined)
			{
				_logger.log({data : info, err : "ERR_ITEM_WRONG_ID"}, "error");
				_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_WRONG_ID'], ret, res);
				return;
			}
		
			var add_money_type = 0;
			switch(mission_data.reward_type)
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
		else if(mission_data.reward_type === 13)
		{
			var gacha_data = _store_data.getStoreGachaData(mission_data.reward_id);
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
		
		query += " CALL set_user_mission_reward_complete(?,?);";
		args.push(uuid, mission_idx);
		
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
				ret.mssion_idx = mission_idx;
				ret.mission_complete = 1;
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
	
	pMissionRewardAll : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 2, info, ret, res)) return;
		
		// 완료된 미션들 모두 가져옴
		_shard.singleQuery(bidx, uuid, "SELECT umi_idx_bi as mission_idx, umi_mission_id_i as mission_id FROM u_mission WHERE umi_ul_idx_i = ? AND umi_current_cnt_i >= umi_goal_cnt_i AND umi_reward_complete_ti = 0;", [uuid], function(err, result)
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
				var reward_complete_mission_list = [];
				var mission_data = null;
				var item_data = null;
				var add_gold = 0;
				var add_ruby = 0;
				var add_stamp = 0;
				var add_heart = 0;
                var add_ticket = 0;
				
				// 보상이 재화인 미션만 추림
				for(var i = 0; i < result.length; i++)
				{
					mission_data = _mission_data.getMissionData(result[i].mission_id);
					item_data = _item_data.getItemData(mission_data.reward_item_id);
					
					switch(item_data.type)
					{
						case 7 :	add_gold += item_data.value_no;		reward_complete_mission_list.push(result[i].mission_idx);	break;
						case 8 :	add_stamp += item_data.value_no;	reward_complete_mission_list.push(result[i].mission_idx);	break;
						case 9 :	add_ruby += item_data.value_no;		reward_complete_mission_list.push(result[i].mission_idx);	break;
						case 12 :	add_heart += item_data.value_no;	reward_complete_mission_list.push(result[i].mission_idx);	break;
                        case 15 :   add_ticket += item_data.value_no;   reward_complete_mission_list.push(result[i].mission_idx);   break;
					}
				}
				
				// 해당 미션들에 대해 보상 받았다고 업데이트 해주는 쿼리 생성
				query += " UPDATE u_mission SET umi_reward_complete_ti = 1 WHERE umi_idx_bi IN (" + reward_complete_mission_list.toString() + ");";
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
						ret.complete_mission_list = reward_complete_mission_list;
						res.end(JSON.stringify(ret));
					}
				}, true);
			}
		});
	}
}

// 최초 초기화
Mission.init();