/*
 * p_game.js
 * game 관련된 프로토콜 처리
 */

exports.run=function(res,data)
{
	new Game(res,data);
}

function Game(res,data)
{
	this.run(res, data);
}

Game.func={};

Game.init =  function()
{
	// 프로토콜에 함수 대입
	// p로 시작하는 함수가 프로토콜 전용 함수
    Game.func[_protocol.protocol["game"]["P_GAME_LOBBY_SERVER_INFO"]] = Game.prototype.pGameLobbyServerInfo;
    Game.func[_protocol.protocol["game"]["P_GAME_CHAT_SERVER_INFO"]] = Game.prototype.pGameChatServerInfo;

	Game.func[_protocol.protocol["game"]["P_GAME_SINGLE_STAGE_CLEAR"]] = Game.prototype.pGameSingleStageClear;
	Game.func[_protocol.protocol["game"]["P_GAME_SINGLE_STAGE_REWARD"]] = Game.prototype.pGameSingleStageReward;
	Game.func[_protocol.protocol["game"]["P_GAME_SINGLE_STAGE_REWARD_CASH"]] = Game.prototype.pGameSingleStageRewardCash;
	Game.func[_protocol.protocol["game"]["P_GAME_SINGLE_STAGE_REWARD_COMPLETE"]] = Game.prototype.pGameSingleStageRewardComplete;
	
	Game.func[_protocol.protocol["game"]["P_GAME_RAID_STAGE_CLEAR"]] = Game.prototype.pGameRaidStageClear;
	Game.func[_protocol.protocol["game"]["P_GAME_RAID_STAGE_REWARD"]] = Game.prototype.pGameRaidStageReward;
	Game.func[_protocol.protocol["game"]["P_GAME_RAID_STAGE_REWARD_CASH"]] = Game.prototype.pGameRaidStageRewardCash;
	Game.func[_protocol.protocol["game"]["P_GAME_RAID_STAGE_REWARD_COMPLETE"]] = Game.prototype.pGameRaidStageRewardComplete;

    Game.func[_protocol.protocol["game"]["P_GAME_INFINITE_STAGE_CLEAR"]] = Game.prototype.pGameInfiniteStageClear;
	
	Game.func[_protocol.protocol["game"]["P_GAME_START"]] = Game.prototype.pGameStart;
	Game.func[_protocol.protocol["game"]["P_GAME_BUY_GACHA"]] = Game.prototype.pGameBuyGacha;
	
	_logger.log("Game init Call", "info");
}

// 객체생성 시점에서 실행되는것들임 
Game.prototype = {
	stage_grade_clear_point : [1.5,1.3,1.2,1.1,1],
	run:function(res, data)
	{
		var ret = {cmd : data.cmd, rnd : null, errno : 0, uuid : data.info[0]};
		
		(Game.func[data.cmd] === undefined) ? res.end("protocol not found"):Game.func[data.cmd].apply(this,[data.info,ret,res]);
	},
	
	pGameLobbyServerInfo : function(info,ret, res)
	{
		_shard.singleQuery(0, 0, "CALL get_lobby_server_info();", [], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				ret['result'] = result[0];
				res.end(JSON.stringify(ret));
			}
		});
	},

	pGameChatServerInfo: function (info, ret, res) {
	    _shard.singleQuery(0, 0, "CALL get_chat_server_info();", [], function (err, result) {
	        if (err) {
	            _logger.log({ data: info, err: err }, "error");
	            _error.errorEvent.emit('error', err, ret, res);
	        }
	        else {
	            ret['result'] = result[0];
	            res.end(JSON.stringify(ret));
	        }
	    });
	},
	
	pGameSingleStageClear : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		var char_idx = info[2];
		var char_id = info[3];
		var char_level = info[4];
		var char_total_exp = info[5];
		var stage_no = info[6];
		var stage_mode = info[7];
		var clear = info[8];
		var clear_time = info[9];
		var combo = info[10];
		var monster_kill = info[11];
		var unit_growth = info[12];
		var add_exp_per = info[13];
		var add_gold_per = info[14];
		
		var add_score = 0;
		var add_gold = 0;
		var add_exp = 0;
		var add_ruby = 0;
		var calc_exp = 0;

		var stage = _stage_data.getStagedata(stage_no);
		var character = _character_data.getCharacterData(char_id);

		if(stage === null)
		{
			_logger.log({data : info, err : "ERR_GAME_WRONG_STAGE_ID"}, "error");
			_error.errorEvent.emit('error', _error.errcode["ERR_GAME_WRONG_STAGE_ID"], ret, res);
			return;
		}
		
		if(character === null || character === undefined)
		{
			_logger.log({data : info, err : "ERR_CHARACTER_WRONG_ID"}, "error");
			_error.errorEvent.emit('error', _error.errcode["ERR_CHARACTER_WRONG_ID"], ret, res);
			return;
		}

		_logger.log("monster kill info : " + JSON.stringify(monster_kill), "info");
		for(var i in monster_kill)
		{
			add_score += _unit_data.getUnitData(monster_kill[i]['id']).reward_point * monster_kill[i]['kill'];
			add_gold += _unit_data.getUnitData(monster_kill[i]['id']).reward_gold * monster_kill[i]['kill'];
			add_ruby += _unit_data.getUnitData(monster_kill[i]['id']).reward_ruby * monster_kill[i]['kill'];

			// 일반 모드
			if(stage_mode === 1)
			{
				// ((몬스터 레벨 * 5) + 경험치) * 처치 수
				calc_exp = ((monster_kill[i]['level'] * 5) + _unit_data.getUnitData(monster_kill[i]['id']).reward_exp) * monster_kill[i]['kill'];
			}
			else // 하드 모드
			{
				// ((몬스터 레벨 * 5) + 경험치) * 처치 수
				calc_exp = ((monster_kill[i]['level'] * 5) + 235) * monster_kill[i]['kill'];
			}
			
			// 몬스터 레벨이 내 레벨보다 높을 경우
			if(monster_kill[i]['level'] > char_level)
				calc_exp += calc_exp * (1 + Math.floor(0.05 * (monster_kill[i]['level'] > char_level)));
			
			// 보스 타입 일 경우 경험치 두배
			if(_unit_data.getUnitData(monster_kill[i]['id']).type === 1)
				calc_exp += calc_exp;
			
			add_exp += calc_exp;
		}
		
		add_exp = parseInt(add_exp + (add_exp*(add_exp_per/1000000)));
		add_gold = parseInt(add_gold + (add_gold*(add_gold_per/1000000)));

		var clear_grade = 4;
		if(clear)
		{
			for(var i in stage.stage_grade)
			{
				if(stage.stage_grade[i] > clear_time)
				{
					clear_grade = i;
					break;
				}
			}
		}
		
		/* 스테이지 클리어 점수 계산법
		* 1. 몬스터 점수 합 * (1 + (콤보 * 0.01))
		* 2. (스테이지 클리어 기준 시간 - 클리어 한 시간) * 100
		* 3. 스테이지 클리어 점수 * 스테이지 클리어 등급 별 가산 배율
		* 1 + 2 + 3 total
		*/
		add_score = add_score * (1 + (combo * 0.01));
		add_score += stage.stage_std_time - clear_time > 0 ? (stage.stage_std_time - clear_time) * 100 : 0;
		add_score += stage.stage_clear_point * this.stage_grade_clear_point[clear_grade];
		add_score = parseInt(add_score);

		// 레벨업 확인
		var character_exp_data = _character_data.getCharacterExpData(character.rebirth_count);
		var levelup_cnt = 0;
		

		if(char_level%50 !== 0)
		{
			for(var i in character_exp_data)
			{
				if((character_exp_data[i].total_exp <= (char_total_exp + add_exp)) && (parseInt(i) >= char_level))
				{
					levelup_cnt++;
				}
			}
		}
		
		// 만랩 경험치 보다 많으면 만랩 경험치로 조정
		if(char_total_exp + add_exp >= character_exp_data[49].total_exp)
		{
			add_exp = character_exp_data[49].total_exp - char_total_exp;
		}

		// 보상 데이터 생성
		var reward_data = null;
		if(clear_grade === 0)	// SS clear
			reward_data = _util_func.objectCopy(_item_data.getItemRewardData(stage.stage_reward_special));
		else
			reward_data = _util_func.objectCopy(_item_data.getItemRewardData(stage.stage_reward));
		
		if(reward_data === null || reward_data === undefined)
		{
			_logger.log({data : info, err : "ERR_DATA"}, "error");
			_error.errorEvent.emit('error', _error.errcode["ERR_DATA"], ret, res);
			return;
		}
		
		// 랜덤으로 보상 아이템 6개 생성
		var reward_list = {};
		reward_list[1] = reward_data[1][_util_func.randomInt(1,2)];
		reward_list[2] = reward_data[2][_util_func.randomInt(1,2)];
		reward_list[3] = reward_data[3][_util_func.randomInt(1,2)];
		reward_list[4] = reward_data[4][_util_func.randomInt(1,2)];
		reward_list[5] = reward_data[5][_util_func.randomInt(1,2)];
		reward_list[6] = reward_data[6][_util_func.randomInt(1,2)];
		
		// 미리 3개 중 1개를 일반보상으로 셋팅
		var total_probability = 0;
		var cash_probaility = 0;
		var normal_reward_probability = _util_func.randomInt(1, 1000000);
		var normal_reward_info = null;
		
		for(var i in reward_list)
		{
			if(reward_list[i].reward_type === 3 || reward_list[i].reward_type === 4)
			{
				reward_list[i].reward_id = _util_func.randomInt(reward_list[i].min, reward_list[i].max);
			}
			
			_logger.log("reward info : " + JSON.stringify(reward_list[i]), "info");
			
			delete reward_list[i].min;		delete reward_list[i].max;
			
			total_probability += reward_data[i].probability;
			if(normal_reward_info === null && total_probability >= normal_reward_probability)
			{
				_logger.log(" total_probability = " + total_probability + ", normal_reward_probability : " + normal_reward_probability, "info");
				normal_reward_info = reward_list[i];
			}
			else
			{
				cash_probaility += reward_data[i].probability;
			}
		}
		
		
		// 일반보상으로 셋팅한 1개를 제외한 나머지 둘 중 한개를 캐쉬보상으로 셋팅
		var cash_reward_info = null;
		var cash_reward_probability = _util_func.randomInt(1, cash_probaility);
		for(var i in reward_list)
		{
			if(reward_list[i].reward_id === normal_reward_info.reward_id)
				continue;

			total_probability += reward_data[i].probability;
			if(total_probability >= cash_reward_probability)
			{
				cash_reward_info = reward_list[i];
			}
		}

		var query = "CALL set_stage_clear(?,?,?,?,?,?,?,?,?,?,?,?); CALL set_user_game_result(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);"
		var args = [uuid, char_idx, 1, stage_no, clear, levelup_cnt, char_level, char_total_exp, add_score, add_gold, add_exp, add_ruby,
			 uuid, 1, stage_no, clear, add_score, add_gold, add_exp, add_ruby, reward_list[1].reward_type, reward_list[1].reward_id, reward_list[2].reward_type, reward_list[2].reward_id, reward_list[3].reward_type, reward_list[3].reward_id,
			 reward_list[4].reward_type, reward_list[4].reward_id, reward_list[5].reward_type, reward_list[5].reward_id, reward_list[6].reward_type, reward_list[6].reward_id,
			 normal_reward_info.reward_type, normal_reward_info.reward_id, cash_reward_info.reward_type, cash_reward_info.reward_id];

		for (var i in unit_growth) {
		    var unit_idx = unit_growth[i]['unit_idx'];
		    var level = unit_growth[i]['level'];
		    var exp = unit_growth[i]['exp'];

		    query += "CALL set_unit_growth_info(?,?,?,?);";
		    args.push(uuid, unit_idx, level, exp);
		}

		//_shard.singleQuery(bidx, uuid, query, args, function (err, result) {
		//    if (err) {
		//        _logger.log({ data: info, err: err }, "error");
		//        _error.errorEvent.emit('error', err, ret, res);
		//    }
		//    else {
                    
		//    }
		//}, true);
		
		_shard.singleQuery(bidx, uuid, query, args, function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				ret['info'] = result[0];
                ret['unit_growth'] = unit_growth;

				if(clear)
				{
					ret['reward01'] = reward_list[1];
					ret['reward02'] = reward_list[2];
					ret['reward03'] = reward_list[3];
					ret['reward04'] = reward_list[4];
					ret['reward05'] = reward_list[5];
					ret['reward06'] = reward_list[6];
				}
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
	
	pGameSingleStageReward : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		var slot = info[2];
		
		// if(slot < 1 || slot > 3)
		// {
			// _logger.log({data : info, err : "ERR_GAME_WRONG_SLOT_ID"}, "error");
			// _error.errorEvent.emit('error', _error.errcode["ERR_GAME_WRONG_SLOT_ID"], ret, res);
			// return;
		// }
		
		_shard.singleQuery(bidx, uuid, "CALL set_reward_game_result(?,?);", [uuid, slot], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				ret['info'] = result[0];
				
				// 유닛 보상 확인
				if(ret.info.type === 2)
				{
					var unit_book_add_stat_type = 0;
					var unit_book_add_stat = 0;
					
					var unit_data = _unit_data.getUnitData(ret.info.id);
			
					if(unit_data.is_book === 1)
					{
						unit_book_add_stat_type = unit_data.add_book_stat_type;
						unit_book_add_stat = unit_data.add_book_stat;
					}
					
					_shard.singleQuery(bidx, uuid, "CALL set_add_unit_book_info(?,?,?,?);", [uuid, ret.info.id, unit_book_add_stat_type, unit_book_add_stat], function(err, result)
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
				}
				else
				{
					res.end(JSON.stringify(ret));
				}
			}
		}, true);
	},
	
	pGameSingleStageRewardCash : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		_shard.singleQuery(bidx, uuid, "CALL set_reward_game_result_cash(?,?,?);", [uuid, 2, 1], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				ret['info'] = result[0];
				// 유닛 보상 확인
				if(ret.info.type === 2)
				{
					var unit_book_add_stat_type = 0;
					var unit_book_add_stat = 0;
					
					var unit_data = _unit_data.getUnitData(ret.info.id);
			
					if(unit_data.is_book === 1)
					{
						unit_book_add_stat_type = unit_data.add_book_stat_type;
						unit_book_add_stat = unit_data.add_book_stat;
					}
					
					_shard.singleQuery(bidx, uuid, "CALL set_add_unit_book_info(?,?,?,?);", [uuid, ret.info.id, unit_book_add_stat_type, unit_book_add_stat], function(err, result)
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
				}
				else
				{
					res.end(JSON.stringify(ret));
				}
			}
		}, true);
	},
	
	pGameSingleStageRewardComplete : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		_shard.singleQuery(bidx, uuid, "CALL set_reward_complete(?);", [uuid], function(err, result)
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
		}, true);
	},
	
	
	
	
	
	
	
	
	
	
	pGameRaidStageClear : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		var char_idx = info[2];
		var char_id = info[3];
		var char_level = info[4];
		var char_total_exp = info[5];
		var stage_no = info[6];
		var stage_mode = info[7];
		var clear = info[8];
		var clear_time = info[9];
		var combo = info[10];
		var monster_kill = info[11];
		var add_exp_per = info[12];
		var add_gold_per = info[13];
		
		var add_score = 0;
		var add_gold = 0;
		var add_exp = 0;
		var add_ruby = 0;
		var calc_exp = 0;
		
		var stage = _stage_data.getStagedata(stage_no);
		var character = _character_data.getCharacterData(char_id);
		
		if(stage === null || stage === undefined)
		{
			_logger.log({data : info, err : "ERR_GAME_WRONG_STAGE_ID"}, "error");
			_error.errorEvent.emit('error', _error.errcode["ERR_GAME_WRONG_STAGE_ID"], ret, res);
			return;
		}
		
		if(character === null || character === undefined)
		{
			_logger.log({data : info, err : "ERR_CHARACTER_WRONG_ID"}, "error");
			_error.errorEvent.emit('error', _error.errcode["ERR_CHARACTER_WRONG_ID"], ret, res);
			return;
		}
		
		_logger.log("monster kill info : " + JSON.stringify(monster_kill), "info");
		for(var i in monster_kill)
		{
			add_score += _unit_data.getUnitData(monster_kill[i]['id']).reward_point * monster_kill[i]['kill'];
			add_gold += _unit_data.getUnitData(monster_kill[i]['id']).reward_gold * monster_kill[i]['kill'];
			add_ruby += _unit_data.getUnitData(monster_kill[i]['id']).reward_ruby * monster_kill[i]['kill'];

			// 일반 모드
			if(stage_mode === 1)
			{
				// ((몬스터 레벨 * 5) + 경험치) * 처치 수
				calc_exp = ((monster_kill[i]['level'] * 5) + _unit_data.getUnitData(monster_kill[i]['id']).reward_exp) * monster_kill[i]['kill'];
			}
			else // 하드 모드
			{
				// ((몬스터 레벨 * 5) + 경험치) * 처치 수
				calc_exp = ((monster_kill[i]['level'] * 5) + 235) * monster_kill[i]['kill'];
			}
			
			// 몬스터 레벨이 내 레벨보다 높을 경우
			if(monster_kill[i]['level'] > char_level)
				calc_exp += calc_exp * (1 + Math.floor(0.05 * (monster_kill[i]['level'] > char_level)));
			
			// 보스 타입 일 경우 경험치 두배
			if(_unit_data.getUnitData(monster_kill[i]['id']).type === 1)
				calc_exp += calc_exp;
			
			add_exp += calc_exp;
		}
		
		add_exp = parseInt(add_exp + (add_exp*(add_exp_per/1000000)));
		add_gold = parseInt(add_gold + (add_gold*(add_gold_per/1000000)));

		// 보상 데이터 생성
		var reward_data = reward_data = _util_func.objectCopy(_item_data.getItemRewardData(stage.stage_reward));
		if(reward_data === null || reward_data === undefined)
		{
			_logger.log({data : info, err : "ERR_DATA"}, "error");
			_error.errorEvent.emit('error', _error.errcode["ERR_DATA"], ret, res);
			return;
		}
		
		var clear_grade = 4;
		if(clear)
		{
			for(var i in stage.stage_grade)
			{
				if(stage.stage_grade[i] > clear_time)
				{
					clear_grade = i;
					break;
				}
			}
		}
		
		/* 스테이지 클리어 점수 계산법
		* 1. 몬스터 점수 합 * (1 + (콤보 * 0.01))
		* 2. (스테이지 클리어 기준 시간 - 클리어 한 시간) * 100
		* 3. 스테이지 클리어 점수 * 스테이지 클리어 등급 별 가산 배율
		* 1 + 2 + 3 total
		*/
		add_score = add_score * (1 + (combo * 0.01));
		add_score += stage.stage_std_time - clear_time > 0 ? (stage.stage_std_time - clear_time) * 100 : 0;
		add_score += stage.stage_clear_point * this.stage_grade_clear_point[clear_grade];
		add_score = parseInt(add_score);

		// 레벨업 확인
		var character_exp_data = _character_data.getCharacterExpData(character.rebirth_count);
		var levelup_cnt = 0;

		if(char_level%50 !== 0)
		{
			for(var i in character_exp_data)
			{
				if((character_exp_data[i].total_exp <= (char_total_exp + add_exp)) && (parseInt(i) >= char_level))
				{
					levelup_cnt++;
				}
			}
		}
		
		// 만랩 경험치 보다 많으면 만랩 경험치로 조정
		if(char_total_exp + add_exp >= character_exp_data[49].total_exp)
		{
			add_exp = character_exp_data[49].total_exp - char_total_exp;
		}
		
		// 보상 데이터 생성
		var reward_data = null;
		if(clear_grade === 0)	// SS clear
			reward_data = _util_func.objectCopy(_item_data.getItemRewardData(stage.stage_reward_special));
		else
			reward_data = _util_func.objectCopy(_item_data.getItemRewardData(stage.stage_reward));
		
		if(reward_data === null || reward_data === undefined)
		{
			_logger.log({data : info, err : "ERR_DATA"}, "error");
			_error.errorEvent.emit('error', _error.errcode["ERR_DATA"], ret, res);
			return;
		}
		
		// 랜덤으로 보상 아이템 6개 생성
		var reward_list = {};
		reward_list[1] = reward_data[1][_util_func.randomInt(1,2)];
		reward_list[2] = reward_data[2][_util_func.randomInt(1,2)];
		reward_list[3] = reward_data[3][_util_func.randomInt(1,2)];
		reward_list[4] = reward_data[4][_util_func.randomInt(1,2)];
		reward_list[5] = reward_data[5][_util_func.randomInt(1,2)];
		reward_list[6] = reward_data[6][_util_func.randomInt(1,2)];
		
		// 미리 3개 중 1개를 일반보상으로 셋팅
		var total_probability = 0;
		var cash_probaility = 0;
		var normal_reward_probability = _util_func.randomInt(1, 1000000);
		var normal_reward_info = null;
		
		for(var i in reward_list)
		{
			if(reward_list[i].reward_type === 3 || reward_list[i].reward_type === 4)
			{
				reward_list[i].reward_id = _util_func.randomInt(reward_list[i].min, reward_list[i].max);
			}
			
			_logger.log("reward info : " + JSON.stringify(reward_list[i]), "info");
			
			delete reward_list[i].min;		delete reward_list[i].max;
			
			total_probability += reward_data[i].probability;
			if(normal_reward_info === null && total_probability >= normal_reward_probability)
			{
				_logger.log(" total_probability = " + total_probability + ", normal_reward_probability : " + normal_reward_probability, "info");
				normal_reward_info = reward_list[i];
			}
			else
			{
				cash_probaility += reward_data[i].probability;
			}
		}
		
		
		// 일반보상으로 셋팅한 1개를 제외한 나머지 둘 중 한개를 캐쉬보상으로 셋팅
		var cash_reward_info = null;
		var cash_reward_probability = _util_func.randomInt(1, cash_probaility);
		for(var i in reward_list)
		{
			if(reward_list[i].reward_id === normal_reward_info.reward_id)
				continue;

			total_probability += reward_data[i].probability;
			if(total_probability >= cash_reward_probability)
			{
				cash_reward_info = reward_list[i];
			}
		}
		
		_shard.singleQuery(bidx, uuid, "CALL set_raid_stage_clear(?,?,?,?,?,?,?,?,?,?,?); CALL set_user_game_result(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);",
			[uuid, char_idx, stage_no, clear, levelup_cnt, char_level, char_total_exp, add_score, add_gold, add_exp, add_ruby,
			 uuid, 1, stage_no, clear, add_score, add_gold, add_exp, add_ruby, reward_list[1].reward_type, reward_list[1].reward_id, reward_list[2].reward_type, reward_list[2].reward_id, reward_list[3].reward_type, reward_list[3].reward_id,
			 reward_list[4].reward_type, reward_list[4].reward_id, reward_list[5].reward_type, reward_list[5].reward_id, reward_list[6].reward_type, reward_list[6].reward_id,
			 normal_reward_info.reward_type, normal_reward_info.reward_id, cash_reward_info.reward_type, cash_reward_info.reward_id], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				ret['clear'] = clear;
				ret['info'] = result[0];
				if(clear)
				{
					ret['reward01'] = reward_list[1];
					ret['reward02'] = reward_list[2];
					ret['reward03'] = reward_list[3];
					ret['reward04'] = reward_list[4];
					ret['reward05'] = reward_list[5];
					ret['reward06'] = reward_list[6];
				}
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
	
	pGameRaidStageReward : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		var slot = info[2];
		
		// if(slot < 1 || slot > 3)
		// {
			// _logger.log({data : info, err : "ERR_GAME_WRONG_SLOT_ID"}, "error");
			// _error.errorEvent.emit('error', _error.errcode["ERR_GAME_WRONG_SLOT_ID"], ret, res);
			// return;
		// }
		
		_shard.singleQuery(bidx, uuid, "CALL set_reward_game_result(?,?);", [uuid, slot], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				ret['info'] = result[0];
				// 유닛 보상 확인
				if(ret.info.type === 2)
				{
					var unit_book_add_stat_type = 0;
					var unit_book_add_stat = 0;
					
					var unit_data = _unit_data.getUnitData(ret.info.id);
			
					if(unit_data.is_book === 1)
					{
						unit_book_add_stat_type = unit_data.add_book_stat_type;
						unit_book_add_stat = unit_data.add_book_stat;
					}
					
					_shard.singleQuery(bidx, uuid, "CALL set_add_unit_book_info(?,?,?,?);", [uuid, ret.info.id, unit_book_add_stat_type, unit_book_add_stat], function(err, result)
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
				}
				else
				{
					res.end(JSON.stringify(ret));
				}
			}
		}, true);
	},
	
	pGameRaidStageRewardCash : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		_shard.singleQuery(bidx, uuid, "CALL set_reward_game_result_cash(?,?,?);", [uuid, 2, 10], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				ret['info'] = result[0];
				// 유닛 보상 확인
				if(ret.info.type === 2)
				{
					var unit_book_add_stat_type = 0;
					var unit_book_add_stat = 0;
					
					var unit_data = _unit_data.getUnitData(ret.info.id);
			
					if(unit_data.is_book === 1)
					{
						unit_book_add_stat_type = unit_data.add_book_stat_type;
						unit_book_add_stat = unit_data.add_book_stat;
					}
					
					_shard.singleQuery(bidx, uuid, "CALL set_add_unit_book_info(?,?,?,?);", [uuid, ret.info.id, unit_book_add_stat_type, unit_book_add_stat], function(err, result)
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
				}
				else
				{
					res.end(JSON.stringify(ret));
				}
			}
		}, true);
	},
	
	pGameRaidStageRewardComplete : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		_shard.singleQuery(bidx, uuid, "CALL set_reward_complete(?);", [uuid], function(err, result)
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
		}, true);
	},

    pGameInfiniteStageClear : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		var char_idx = info[2];
        var round_id = info[3];
        var clear = info[4];
		var play_time = info[5];
		var monster_kill = info[6];
        var add_gold_per = info[7];
		
		var add_score = 0;
		var add_gold = 0;

		_logger.log("monster kill info : " + JSON.stringify(monster_kill), "info");
		for(var i in monster_kill)
		{
			add_score += _unit_data.getUnitData(monster_kill[i]['id']).reward_point * monster_kill[i]['kill'];
			add_gold += _unit_data.getUnitData(monster_kill[i]['id']).reward_gold * monster_kill[i]['kill'];
		}

        add_gold = parseInt(add_gold + (add_gold*(add_gold_per/1000000)));

		var query = "CALL set_infinite_clear(?,?,?,?,?,?);"
		var args = [uuid, char_idx, round_id, clear, add_score, add_gold];

		_shard.singleQuery(bidx, uuid, query, args, function (err, result) {
		    if (err) {
		        _logger.log({ data: info, err: err }, "error");
		        _error.errorEvent.emit('error', err, ret, res);
		    }
		    else {
                res.end(JSON.stringify(ret));
		    }
		}, true);
	},
	
	// 게임 시작 요청
	// 여기서 인게임 아이템 구매도 같이 해결
	pGameStart : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		var stage_type = info[2];
		//var store_item_list = info[3];
		
		var server_stage_type = 0;
        var use_count = 1;
		var total_price = 0;
		var item_list = [];
		
		// 클라에서 사용중인 stage_type(eMultiType)
		// 0: 싱글, 1: 점령전, 2: 섬멸전, 3: 레이드 4: 무한의 탑
		// DB에서는 0: 싱글, 1: pvp, 2: 레이드, 3: 무한의 탑
		if(stage_type === 1 || stage_type === 2)
        {
            server_stage_type = 1;
            use_count = _key_data.getKeyData("Ticket_Cost_PvP");
        }
		else if(stage_type === 3)	
        {
            server_stage_type = 2;
            use_count = _key_data.getKeyData("Ticket_Cost_Raid");
        }
        else if(stage_type === 4)
        {
            server_stage_type = 3;
            use_count = _key_data.getKeyData("Ticket_Cost_UnlimitedTower");
        }
		
		_shard.singleQuery(bidx, uuid, "CALL set_start_game_info(?,?,?);", [uuid, server_stage_type, use_count], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				ret.info = {};
				ret.info.stage_type = stage_type;
				ret.info.gold = result[0].gold;
				ret.info.ruby = result[0].ruby;
				ret.info.stamp = result[0].stamp;
				ret.info.heart = result[0].heart;
                ret.info.ticket = result[0].ticket;
				ret.info.use_item = item_list;
				if(result[0].gacha_item !== 0)
					ret.info.use_item.push(result[0].gacha_item);
				
				ret.info.remain_stamp_time = result[0].remain_stamp_time;
                ret.info.remain_ticket_time = result[0].remain_ticket_time;
					
				// 보너스 스테이지 확률 계산(임시)
				var bonus = _util_func.randomInt(0, 1000000);
				if(bonus < 5000)
					ret.bonus_stage = 2;
				else if(bonus < 15000)
					ret.bonus_stage = 1;
				else
					ret.bonus_stage = 0;
					
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
	
	// 인게임 아이템 구매
	pGameBuyGacha : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		var stage_type = info[2];
		var gacha_id = info[3];
		
		// 클라에서 사용중인 stage_type(eMultiType)
		// 0: 싱글, 1: 점령전, 2: 섬멸전, 3: 레이드
		// DB에서는 0: 싱글, 1: pvp, 2: 레이드
		if(stage_type === 1)		stage_type = 1;
		else if(stage_type === 2)	stage_type = 1;
		else if(stage_type === 3)	stage_type = 2;
		
		// 가차 아이템 정보 가져오기
		var gacha_data = _store_data.getStoreGachaData(gacha_id);
		if(gacha_data === null || gacha_data === undefined)
		{
			_logger.log({data : info, err : "ERR_DATA"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_DATA'], ret, res);
			return;
		}
		
		// 확률 생성 및 아이템 생성
		var new_object = null;
		var probability = _util_func.randomInt(1, 1000000);
		var total_probability = 0;
		for(var i in gacha_data)
		{
			total_probability += gacha_data[i].probability;
			if(total_probability >= probability)
			{
				new_object = _util_func.objectCopy(gacha_data[i]);
				
				// sale 가격 적용
				new_object.buy_cost = new_object.buy_cost - (new_object.buy_cost * (new_object.sale/100));
				break;
			}
		}
		
		if(new_object === null|| new_object === undefined)
		{
			_logger.log({data : info, err : "ERR_DATA"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_DATA'], ret, res);
			return;
		}
		
		_shard.singleQuery(bidx, uuid, "CALL set_ingame_gacha_item_add_info(?,?,?,?,?);", [uuid, stage_type, new_object.object_id, new_object.buy_cost_type, new_object.buy_cost], function(err, result)
		{
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				ret.info = result[0];
				ret.info.stage_type = info[2];
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
}

// 최초 초기화
Game.init();