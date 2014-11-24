/*
 * p_character.js
 * character 관련된 프로토콜 처리
 */

exports.run=function(res,data)
{
	new Character(res,data);
}

function Character(res,data)
{
	this.run(res, data);
}

Character.func={};

Character.init =  function()
{
	// 프로토콜에 함수 대입
	// p로 시작하는 함수가 프로토콜 전용 함수
	Character.func[_protocol.protocol["character"]["P_CHARACTER_LIST"]] = Character.prototype.pCharacterList;
	Character.func[_protocol.protocol["character"]["P_CHARACTER_SELECT"]] = Character.prototype.pCharacterSelect;
	Character.func[_protocol.protocol["character"]["P_CHARACTER_CREATE"]] = Character.prototype.pCharacterCreate;
	//Character.func[_protocol.protocol["character"]["P_CHARACTER_CLEAR_STAGE_LIST"]] = Character.prototype.pCharacterClearStageList;
	Character.func[_protocol.protocol["character"]["P_CHARACTER_REBIRTH"]] = Character.prototype.pCharacterRebirth;
	
	_logger.log("Character init Call", "info");
}

// 객체생성 시점에서 실행되는것들임 
Character.prototype = {
	run:function(res, data)
	{
		var ret = {cmd : data.cmd, rnd : null, errno : 0, uuid : data.info[0]};
		
		(Character.func[data.cmd] == undefined) ? res.end("protocol not found"):Character.func[data.cmd].apply(this,[data.info,ret,res]);
	},
	
	pCharacterList : function(info,ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		_shard.singleQuery(bidx, uuid, "CALL get_character_list(?); CALL get_character_item_equip(?,?);",[uuid, uuid, 0], function(err, result)
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
					
				ret['character_list'] = result[0];
				
				var item_equip_list = result[1];
				for(var i in item_equip_list)
				{
					var item = _item_data.getItemData(item_equip_list[i].item_id);
					if(item == null || item == undefined)
					{
						continue;
					}
					
					item_equip_list[i].skill01 = item.skillid01;
					item_equip_list[i].skill02 = item.skillid02;
					item_equip_list[i].skill03 = item.skillid03;
					item_equip_list[i].skill04 = item.skillid04;
				}
				
				ret['item_equip'] = item_equip_list;
				
				res.end(JSON.stringify(ret));
			}
		});
	},
	
	pCharacterSelect : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		var char_idx = info[2];
		
		_shard.singleQuery(bidx, uuid, "CALL set_character_select_info(?,?);",[uuid, char_idx], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				ret['character'] = result[0];
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
	
	pCharacterCreate : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		var char_type = info[2];
		var char_level = 1;
		
		var character = _character_data.getCharacterData(char_type);
		var def = _default_data.getDefaultData(char_type);
		
		var unit_book_add_stat_type = 0;
		var unit_book_add_stat = 0;
		
		var unit_data = _unit_data.getUnitData(def.unit01);
		if(unit_data.is_book === 1)
		{
			unit_book_add_stat_type = unit_data.add_book_stat_type;
			unit_book_add_stat = unit_data.add_book_stat;
		}
		
		_shard.singleQuery(bidx, uuid, "CALL set_character_info(?,?,?,?,?,?,?,?,?,?);",[uuid, char_type, character.buy_cost_type, character.buy_cost, def.weapon, def.armor, def.helmet, def.unit01, unit_book_add_stat_type, unit_book_add_stat], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				if(!Array.isArray(result[4]))
					result[4] = [result[4]];
			
				ret['info'] = result[0];
				ret['Item'] = result[1];
				ret['Unit'] = result[2];
				
				var item_equip_list = result[3];
				for(var i in item_equip_list)
				{
					var item = _item_data.getItemData(item_equip_list[i].item_id);
					if(item == null || item == undefined)
					{
						continue;
					}
					
					item_equip_list[i].skill01 = item.skillid01;
					item_equip_list[i].skill02 = item.skillid02;
					item_equip_list[i].skill03 = item.skillid03;
					item_equip_list[i].skill04 = item.skillid04;
				}
				
				ret['item_equip'] = item_equip_list;
				ret['unit_equip'] = result[4];
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
	
	pCharacterClearStageList : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		var char_idx = info[2];
		
		_shard.singleQuery(bidx, uuid, "CALL get_character_clear_stage_list_info(?);",[char_idx], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				ret['info'] = result[0];
				res.end(JSON.stringify(ret));
			}
		});
	},
	
	pCharacterRebirth : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		var char_id = info[2];
		var char_idx = info[3];
		
		var char_info = _character_data.getCharacterData(char_id);
		if(char_info === null || char_info === undefined)
		{
			_logger.log({data : info, err : "ERR_CHARACTER_WRONG_ID"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_CHARACTER_WRONG_ID'], ret, res);
			return;
		}
		
		if(char_info.rebirth_target_id === 0)
		{
			_logger.log({data : info, err : "ERR_CHARACTER_ALREADY_REBIRTH"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_CHARACTER_ALREADY_REBIRTH'], ret, res);
			return;
		}
		
		_shard.singleQuery(bidx, uuid, "CALL set_character_rebirth_info(?,?,?,?,0,0);", [uuid, char_idx, char_id, char_info.rebirth_target_id], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				ret['info'] = result[0];
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
}

// 최초 초기화
Character.init();