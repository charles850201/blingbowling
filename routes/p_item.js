/*
 * p_item.js
 * item 관련된 프로토콜 처리
 */

exports.run=function(res,data)
{
	new Item(res,data);
}

function Item(res,data)
{
	this.run(res, data);
}

Item.func={};

Item.init =  function()
{
	// 프로토콜에 함수 대입
	// p로 시작하는 함수가 프로토콜 전용 함수
	Item.func[_protocol.protocol["item"]["P_ITEM_BUY"]] = Item.prototype.pItemBuy;
	Item.func[_protocol.protocol["item"]["P_ITEM_STRENGTHEN"]] = Item.prototype.pItemStrengthen;
	Item.func[_protocol.protocol["item"]["P_ITEM_UPGRADE"]] = Item.prototype.pItemUpgrade;
	Item.func[_protocol.protocol["item"]["P_ITEM_EQUIP"]] = Item.prototype.pItemEquip;
	Item.func[_protocol.protocol["item"]["P_ITEM_SELL"]] = Item.prototype.pItemSell;
	Item.func[_protocol.protocol["item"]["P_ITEM_GACHA_BUY"]] = Item.prototype.pGachaBuy;
	Item.func[_protocol.protocol["item"]["P_ITEM_UNIT_STRENGTHEN"]] = Item.prototype.pUnitStrengthen;
	Item.func[_protocol.protocol["item"]["P_ITEM_UNIT_UPGRADE"]] = Item.prototype.pUnitUpgrade;
	Item.func[_protocol.protocol["item"]["P_ITEM_UNIT_EQUIP"]] = Item.prototype.pUnitEquip;
	Item.func[_protocol.protocol["item"]["P_ITEM_UNIT_COMBINE"]] = Item.prototype.pUnitCombine;
	Item.func[_protocol.protocol["item"]["P_ITEM_UNIT_UNEQUIP"]] = Item.prototype.pUnitUnequip;
	Item.func[_protocol.protocol["item"]["P_ITEM_WEAPON_SWAP"]] = Item.prototype.pWeaponSwap;
	Item.func[_protocol.protocol["item"]["P_ITEM_CHANGEOPTION_BUY"]] = Item.prototype.pChangeOptionBuy;
	Item.func[_protocol.protocol["item"]["P_ITEM_SETOPTION"]] = Item.prototype.pSetOption;
	Item.func[_protocol.protocol["item"]["P_ITEM_UNIT_ITEMEQUIP"]] = Item.prototype.pUnitItemEquip;
	
	_logger.log("Item init Call", "info");
}

// 객체생성 시점에서 실행되는것들임 
Item.prototype = {
	run:function(res, data)
	{
		var ret = {cmd : data.cmd, rnd : null, errno : 0, uuid : data.info[0]};
		
		(Item.func[data.cmd] === undefined) ? res.end("protocol not found"):Item.func[data.cmd].apply(this,[data.info,ret,res]);
	},
	
	pItemBuy : function(info,ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 3, info, ret, res)) return;
		
		var store_id = info[2];
		
		var store_item = _store_data.getStoreItemData(store_id);
		if(store_item === null || store_item === undefined)
		{
			_logger.log({data : info, err : "ERR_ITEM_WRONG_ID"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_WRONG_ID'], ret, res);
			return;
		}
		
		// 인게임 부활 아이템 사용(임시)
		if(store_item.category === 6)
		{
			_shard.singleQuery(bidx, uuid, "CALL set_money_add_info(?, ?, ?, ?, ?);", [uuid, 0, 0, store_item.buy_cost_type, store_item.buy_cost], function(err, result)
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
			return;
		}
		
		var item = _item_data.getItemData(store_item.object_id);
		if(item === null || item === undefined)
		{
			_logger.log({data : info, err : "ERR_ITEM_WRONG_ID"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_WRONG_ID'], ret, res);
			return;
		}
		
		var buy_cost = store_item.buy_cost - (store_item.buy_cost * (store_item.sale/100));
		
		var query = "";
		var args = [];
		
		// 장착 아이템
		if(item.type >= 1 && item.type <= 3)
		{
		    var option_list = _item_data.getOptionList(store_item.object_id);
		    var value_list = _item_data.getValueList(option_list);

			query = "CALL set_item_add_info(?,?,?,?,?,?,?,?,?,?,?,?,?);";
			args.push(uuid, store_item.object_id, store_item.buy_cost_type, buy_cost, 0, option_list[0], value_list[0], option_list[1], value_list[1], option_list[2], value_list[2], option_list[3], value_list[3]);
		}
		else if(item.type >= 7 && item.type <= 9 || item.type === 12)
		{
			var add_money_type = 0;
			switch(item.type)
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
				case 12 :
					add_money_type = 4;
				break;
			}
			
			query = "CALL set_money_add_info(?, ?, ?, ?, ?);";
			args.push(uuid, add_money_type, item.value_no, store_item.buy_cost_type, buy_cost);
		}
		else
		{
			res.end("not sale");
			return;
		}
		
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
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
	
	pItemStrengthen : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 7, info, ret, res)) return;
		
		var item_idx = info[2];
		var item_id = info[3];
		var item_current_level = info[4];
		var item_add_probability = info[5];
		var material_item_list = info[6];
		var upgrade_count = 0;
		
		// 업그레이드 할 아이템의 그레이드 확인
		var item_grade = _item_data.getItemData(item_id).grade;
		var item_grade_exp = _item_data.getItemExpData(item_grade);
		if(item_grade === null || item_grade === undefined || item_grade_exp === null || item_grade_exp === undefined)
		{
			_logger.log({data : info, err : "ERR_ITEM_WRONG_ID"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_WRONG_ID'], ret, res);
			return;
		}
		
		if(item_current_level >= 5)
		{
			_logger.log({data : info, err : "ERR_ITEM_NO_MORE_UPGRADE"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_NO_MORE_UPGRADE'], ret, res);
			return;
		}

		// 확률 생성
		var probability = _util_func.randomInt(1, 100);
		var total_probability = 0;
		var is_upgrade = 0;
		var delete_material_count = 0;
		
		_logger.log('grdae : ' + item_grade, "info");
		
		// 5개의 조합 아이템을 보면서 현재 내 아이템 그레이드에 맞는 확률을 가져옴
		for(var i in material_item_list)
		{
			if(material_item_list[i].item_idx === 0)
				continue;

			material_item_list[i].grade = _item_data.getItemData(material_item_list[i].item_id).grade;
			total_probability += item_grade_exp.grade_probability[material_item_list[i].grade];
			
			_logger.log('material item info : ' + JSON.stringify(material_item_list[i]), "info");

			delete_material_count++;
		}
		
		_logger.log('probability : ' + probability + ', add_probability : ' + item_add_probability + ', total_probability : ' + total_probability, "info");
		if(probability <= total_probability + item_add_probability)
		{
			is_upgrade = 1;
			upgrade_count = 1;
		}
		
		if(total_probability > 100)
			total_probability = 100;
		
		_shard.singleQuery(bidx, uuid, "CALL set_item_strengthen_info2(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);",
			[uuid, item_idx, item_id, item_grade_exp.cost_type, item_grade_exp.cost, item_current_level, upgrade_count, 5, is_upgrade, total_probability, item_add_probability, material_item_list[0].item_idx, material_item_list[1].item_idx, material_item_list[2].item_idx, material_item_list[3].item_idx, material_item_list[4].item_idx, delete_material_count], function(err, result)
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
					
				ret['info'] = result[0];
				ret['item_list'] = result[1];
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
	
	pItemUpgrade : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 7, info, ret, res)) return;
		
		var item_idx = info[2];
		var item_id = info[3];
		var item_current_level = info[4];
		var item_add_probability = info[5];
		var material_item_list = info[6];
		
		// 같은 아이템이 등급에 상관없이 하나라도 있다면 등급업 시 그 아이템 그대로 유지시켜줄 변수
		// var save_item = false;
		
		// 업그레이드 할 유닛의 그레이드 확인
		var item_info = _item_data.getItemData(item_id);
		var item_grade = item_info.grade;
		var item_grade_exp = _item_data.getItemExpData(item_grade);
		if(item_info === null || item_info === undefined || item_grade === null || item_grade === undefined || item_grade_exp === null || item_grade_exp === undefined)
		{
			_logger.log({data : info, err : "ERR_ITEM_WRONG_ID"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_WRONG_ID'], ret, res);
			return;
		}
		
		if(item_grade >= 7)
		{
			_logger.log({data : info, err : "ERR_ITEM_NO_MORE_UPGRADE"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_NO_MORE_UPGRADE'], ret, res);
			return;
		}
		
		if(item_current_level !== 5)
		{
			_logger.log({data : info, err : "ERR_ITEM_NOT_ENOUGH_LEVEL"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_NOT_ENOUGH_LEVEL'], ret, res);
			return;
		}
		
		// var item_grade_data = _item_data.getItemGradeData(item_grade+1);
		// _logger.log("item_grade_data : " + JSON.stringify(item_grade_data), "info");
		
		var item_upgrade_data = _item_data.getItemUpgradeData(item_grade+1, item_info.equip_class, item_info.type);
		if(item_upgrade_data === null || item_upgrade_data === undefined)
		{
			_logger.log({data : info, err : "ERR_ITEM_WRONG_ID"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_WRONG_ID'], ret, res);
			return;
		}

		// 확률 생성
		var probability = _util_func.randomInt(1, 100);
		var total_probability = 0;
		var is_upgrade = 0;
		var delete_material_count = 0;
		var new_item_id = 0;
		
		// 5개의 조합 아이템을 보면서 현재 내 아이템 그레이드에 맞는 확률을 가져옴
		for(var i in material_item_list)
		{
			if(material_item_list[i].item_idx === 0)
				continue;

			material_item_list[i].grade = _item_data.getItemData(material_item_list[i].item_id).grade;
			total_probability += item_grade_exp.grade_probability[material_item_list[i].grade];
			
			_logger.log('material item info : ' + JSON.stringify(material_item_list[i]), "info");

			delete_material_count++;
			
			// if(_item_data.getItemData(item_id).group_id === _item_data.getItemData(material_item_list[i].item_id).group_id)
				// save_item = true;
		}
		
		_logger.log('probability : ' + probability + ', add_probability : ' + item_add_probability + ', total_probability : ' + total_probability, "info");
		if(probability <= total_probability + item_add_probability)
		{
			is_upgrade = 1;
			
			var rand = _util_func.randomInt(0, _util_func.getLength(item_upgrade_data) - 1);
			_logger.log('rand ============================ ' + rand);
			new_item_id = item_upgrade_data[rand].id;
			
			// if(save_item === true)
				// new_item_id = _item_data.getItemData(item_id).upgrade_id;
			_logger.log('new_item_id ============================ ' + new_item_id);
		}
		
		if(total_probability > 100)
			total_probability = 100;

		_shard.singleQuery(bidx, uuid, "CALL set_item_upgrade_info2(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);",
			[uuid, item_idx, item_id, new_item_id, item_grade_exp.cost_type, item_grade_exp.upgrade_cost, item_current_level, is_upgrade, total_probability, item_add_probability, material_item_list[0].item_idx, material_item_list[1].item_idx, material_item_list[2].item_idx, material_item_list[3].item_idx, material_item_list[4].item_idx, delete_material_count], function(err, result)
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
					
				ret['info'] = result[0];
				ret['item_list'] = result[1];
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
	
	pItemEquip : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 6, info, ret, res)) return;
		
		var char_idx = info[2];
		var item_idx = info[3];
		var item_id = info[4];
		var item_parts_type = info[5];		// 1: 무기, 2: 갑옷, 3: 투구, 4: 스왑용 무기
		
		var item = _item_data.getItemData(item_id);
		if(item === null || item === undefined)
		{
			_logger.log({data : info, err : "ERR_ITEM_WRONG_ID"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_WRONG_ID'], ret, res);
			return;
		}
		
		if( (item.type < 1 || item.type > 3) ||
		    (item_parts_type < 1 || item_parts_type > 4) )
		{
			_logger.log({data : info, err : "ERR_ITEM_NOT_EQUIP_ITEM"}, "error");
			_error.errorEvent.emit('error', _error.errcode["ERR_ITEM_NOT_EQUIP_ITEM"], ret, res);
			return;
		}
		
		_shard.singleQuery(bidx, uuid, "CALL set_item_equip_info(?,?,?,?,?,?);", [uuid, char_idx, item_idx, item_id, item_parts_type, item.equip_class], function(err, result)
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
					
				var item_equip_list = result[0];
				for(var i in item_equip_list)
				{
					var item = _item_data.getItemData(item_equip_list[i].item_id);
					if(item === null || item === undefined)
					{
						continue;
					}
					
					item_equip_list[i].skill01 = item.skillid01;
					item_equip_list[i].skill02 = item.skillid02;
					item_equip_list[i].skill03 = item.skillid03;
					item_equip_list[i].skill04 = item.skillid04;
				}
				ret['info'] = item_equip_list;
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
	
	pItemSell : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 5, info, ret, res)) return;
		
		var type = info[2];
		var sell_idx = info[3];
		var sell_id = info[4];
		
		var _query = "";
		var sell_object = {};
		
		// 아이템 판매
		if(type === 1)
		{
			_query = "CALL set_item_sell(?,?,?,?);";
			sell_object = _item_data.getItemData(sell_id);
		}
		// 몬스터 판매
		else if(type === 2)
		{
			_query = "CALL set_unit_sell(?,?,?,?);";
			sell_object = _unit_data.getUnitData(sell_id);
		}
		// else
		else
		{
			_logger.log({data : info, err : "ERR_ITEM_WRONG_ID"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_WRONG_ID'], ret, res);
			return;
		}
		
		if(sell_object === null || sell_object === undefined)
		{
			_logger.log({data : info, err : "ERR_ITEM_WRONG_ID"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_WRONG_ID'], ret, res);
			return;
		}
		
		_shard.singleQuery(bidx, uuid, _query, [uuid, sell_idx, 1, sell_object.sell_price], function(err, result)
		{console.log(_query);
			if(err)
			{
				_logger.log({data : info, err : err}, "error");
				_error.errorEvent.emit('error', err, ret, res);
			}
			else
			{
				ret.info = result[0];
				ret.info.sell_type = type;
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
	
	pGachaBuy : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 4, info, ret, res)) return;
		
		var gacha_id = info[2];
		var continue_gacha = info[3];
		
		var gacha_data = _store_data.getStoreGachaData(gacha_id);
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
				
				// sale 가격 적용
				new_object.buy_cost = new_object.buy_cost - (new_object.buy_cost * (new_object.sale/100));
				
				if(continue_gacha === 1)
					new_object.buy_cost = new_object.continue_price;
					
				break;
			}
		}
		
		if(new_object === null|| new_object === undefined)
		{
			_logger.log({data : info, err : "ERR_DATA"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_DATA'], ret, res);
			return;
		}
		
		var query = "";
		var args = [];
		
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

			var option_list = _item_data.getOptionList(new_object.object_id);
			var value_list = _item_data.getValueList(option_list);
			
			query = "CALL set_item_add_info(?,?,?,?,?,?,?,?,?,?,?,?,?);";
			args.push(uuid, new_object.object_id, new_object.buy_cost_type, new_object.buy_cost, 0, option_list[0], value_list[0], option_list[1], value_list[1], option_list[2], value_list[2], option_list[3], value_list[3]);
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
			args.push(uuid, new_object.object_id, new_object.buy_cost_type, new_object.buy_cost, unit_book_add_stat_type, unit_book_add_stat);
		}
		else
		{
			_logger.log({data : info, err : "ERR_ITEM_WRONG_ID"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_WRONG_ID'], ret, res);
			return;
		}
		
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
				ret.info.type = new_object.object_type;
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
	
	pUnitStrengthen : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 7, info, ret, res)) return;
		
		var unit_idx = info[2];
		var unit_id = info[3];
		var unit_current_level = info[4];
		var unit_add_probability = info[5];
		var material_unit_list = info[6];
		var upgrade_count = 0;
		
		// 업그레이드 할 유닛의 그레이드 확인
		var unit_grade = _unit_data.getUnitData(unit_id).grade;
		var unit_grade_exp = _unit_data.getUnitExpData(unit_grade);
		if(unit_grade === null || unit_grade === undefined || unit_grade_exp === null || unit_grade_exp === undefined)
		{
			_logger.log({data : info, err : "ERR_ITEM_WRONG_ID"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_WRONG_ID'], ret, res);
			return;
		}
		
		if(unit_current_level === 5)
		{
			_logger.log({data : info, err : "ERR_ITEM_NO_MORE_UPGRADE"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_NO_MORE_UPGRADE'], ret, res);
			return;
		}

		// 확률 생성
		var probability = _util_func.randomInt(1, 100);
		var total_probability = 0;
		var is_upgrade = 0;
		var delete_material_count = 0;
		
		_logger.log('grdae : ' + unit_grade, "info");
		
		// 5개의 조합 유닛 아이템을 보면서 현재 내 유닛의 그레이드에 맞는 확률을 가져옴
		for(var i in material_unit_list)
		{
			if(material_unit_list[i].unit_idx === 0)
				continue;

			material_unit_list[i].grade = _unit_data.getUnitData(material_unit_list[i].unit_id).grade;
			total_probability += unit_grade_exp.grade_probability[material_unit_list[i].grade];
			
			_logger.log('material unit info : ' + JSON.stringify(material_unit_list[i]), "info");

			delete_material_count++;
		}
		
		_logger.log('probability : ' + probability + ', add_probability : ' + unit_add_probability + ', total_probability : ' + total_probability, "info");
		if(probability <= total_probability + unit_add_probability)
		{
			is_upgrade = 1;
			upgrade_count = 1;
		}
		
		if(total_probability > 100)
			total_probability = 100;
		
		_shard.singleQuery(bidx, uuid, "CALL set_unit_strengthen_info(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);",
			[uuid, unit_idx, unit_id, unit_grade_exp.cost_type, unit_grade_exp.cost, unit_current_level, upgrade_count, 5, is_upgrade, total_probability, unit_add_probability, material_unit_list[0].unit_idx, material_unit_list[1].unit_idx, material_unit_list[2].unit_idx, material_unit_list[3].unit_idx, material_unit_list[4].unit_idx, delete_material_count], function(err, result)
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
					
				ret['info'] = result[0];
				ret['unit_list'] = result[1];
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
	
	pUnitUpgrade : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 7, info, ret, res)) return;
		
		var unit_idx = info[2];
		var unit_id = info[3];
		var unit_current_level = info[4];
		var unit_add_probability = info[5];
		var material_unit_list = info[6];
		
		var unit_book_add_stat_type = 0;
		var unit_book_add_stat = 0;
		
		// 같은 유닛 카드가 등급에 상관없이 하나라도 있다면 등급업 시 그 카드 그대로 유지시켜줄 변수
		// var save_unit = false;
		
		// 업그레이드 할 유닛의 그레이드 확인
		var unit_grade = _unit_data.getUnitData(unit_id).grade;
		var unit_grade_exp = _unit_data.getUnitExpData(unit_grade);		
		if(unit_grade === null || unit_grade === undefined || unit_grade_exp === null || unit_grade_exp === undefined)
		{
			_logger.log({data : info, err : "ERR_ITEM_WRONG_ID"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_WRONG_ID'], ret, res);
			return;
		}
		
		if(unit_grade >= 7)
		{
			_logger.log({data : info, err : "ERR_ITEM_NO_MORE_UPGRADE"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_NO_MORE_UPGRADE'], ret, res);
			return;
		}
		
		if(unit_current_level !== 5)
		{
			_logger.log({data : info, err : "ERR_ITEM_NOT_ENOUGH_LEVEL"}, "error");
			_error.errorEvent.emit('error', _error.errcode['ERR_ITEM_NOT_ENOUGH_LEVEL'], ret, res);
			return;
		}
		
		var unit_grade_data = _unit_data.getUnitGradeData(unit_grade+1);
		_logger.log("unit_grade_data : " + JSON.stringify(unit_grade_data), "info");

		// 확률 생성
		var probability = _util_func.randomInt(1, 100);
		var total_probability = 0;
		var is_upgrade = 0;
		var delete_material_count = 0;
		var new_unit_id = 0;
		
		// 5개의 조합 유닛 아이템을 보면서 현재 내 유닛의 그레이드에 맞는 확률을 가져옴
		for(var i in material_unit_list)
		{
			if(material_unit_list[i].unit_idx === 0)
				continue;

			material_unit_list[i].grade = _unit_data.getUnitData(material_unit_list[i].unit_id).grade;
			total_probability += unit_grade_exp.grade_probability[material_unit_list[i].grade];
			
			_logger.log('material unit info : ' + JSON.stringify(material_unit_list[i]), "info");

			delete_material_count++;
			
			// if(_unit_data.getUnitData(unit_id).group_id === _unit_data.getUnitData(material_unit_list[i].unit_id).group_id)
				// save_unit = true;
		}
		
		_logger.log('probability : ' + probability + ', add_probability : ' + unit_add_probability + ', total_probability : ' + total_probability, "info");
		if(probability <= total_probability + unit_add_probability)
		{
			is_upgrade = 1;
			
			var rand = _util_func.randomInt(0, _util_func.getLength(unit_grade_data) - 1);
			_logger.log('rand ============================ ' + rand);
			new_unit_id = unit_grade_data[rand].id;
			
			// if(save_unit === true)
				// new_unit_id = _unit_data.getUnitData(unit_id).upgrade_id;
			_logger.log('new_unit_id ============================ ' + new_unit_id);
			
			var unit_data = _unit_data.getUnitData(new_unit_id);
			
			if(unit_data.is_book === 1)
			{
				unit_book_add_stat_type = unit_data.add_book_stat_type;
				unit_book_add_stat = unit_data.add_book_stat;
			}
		}
		
		if(total_probability > 100)
			total_probability = 100;

		_shard.singleQuery(bidx, uuid, "CALL set_unit_upgrade_info(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);",
			[uuid, unit_idx, unit_id, new_unit_id, unit_grade_exp.cost_type, unit_grade_exp.upgrade_cost, unit_current_level, is_upgrade, total_probability, unit_add_probability,
			 material_unit_list[0].unit_idx, material_unit_list[1].unit_idx, material_unit_list[2].unit_idx, material_unit_list[3].unit_idx, material_unit_list[4].unit_idx, delete_material_count, unit_book_add_stat_type, unit_book_add_stat], function(err, result)
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
					
				ret['info'] = result[0];
				ret['unit_list'] = result[1];
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
	
	pUnitEquip : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 5, info, ret, res)) return;
		
		var unit_idx = info[2];
		var unit_id = info[3];
		var slot_id = info[4];
		
		if(slot_id < 0 || slot_id > 3)
		{
			_logger.log({data : info, err : "ERR_ITEM_WRONG_SLOT_ID"}, "error");
			_error.errorEvent.emit('error', _error.errcode["ERR_ITEM_WRONG_SLOT_ID"], ret, res);
			return;
		}
		
		_shard.singleQuery(bidx, uuid, "CALL set_unit_equip_info(?,?,?,?);", [uuid, unit_idx, unit_id, slot_id], function(err, result)
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
					
				ret['info'] = result[0];
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
	
	pUnitCombine : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 7, info, ret, res)) return;
		
		var combine01_unit_idx = info[2];
		var combine01_unit_id = info[3];
		var combine01_unit_level = info[4];
		var combine02_unit_idx = info[5];
		var combine02_unit_id = info[6];
		
		var unit_book_add_stat_type = 0;
		var unit_book_add_stat = 0;
		
		var unit01 = _unit_data.getUnitData(combine01_unit_id);
		var unit02 = _unit_data.getUnitData(combine02_unit_id);
		
		if(unit01 === null || unit01 === undefined || unit02 === null || unit02 === undefined)
		{
			_logger.log({data : info, err : "ERR_ITEM_WRONG_SLOT_ID"}, "error");
			_error.errorEvent.emit('error', _error.errcode["ERR_ITEM_WRONG_SLOT_ID"], ret, res);
			return;
		}
		
		// 등급이 다르다면 조합 불가능
		/* if(unit01.grade !== unit02.grade)
		{
			_logger.log({data : info, warning : "ERR_ITEM_NOT_SAME_GRADE"}, "warning");
			_error.errorEvent.emit('error', _error.errcode["ERR_ITEM_NOT_SAME_GRADE"], ret, res);
			return;
		} */
		/*
		var upgrade_value = 0;
		var unit_combine = _unit_data.getUnitCombineData();
		var combine_probability = _util_func.randomInt(1, 1000000);
		console.log("combine probability : " + combine_probability);
		if(combine_probability <= unit_combine.increase_probability)
		{
			upgrade_value = 1;
		}
		else if(combine_probability <= unit_combine.increase_probability + unit_combine.decrease_probability)
		{
			upgrade_value = -1;
		}
		console.log("combine upgrade_value : " + upgrade_value);
		// 조합 등급이 최저 등급인데 감소하는 확률이 나오거나, 최고 등급인데 증가하는 확률이 나오면 같은 등급으로 조합
		if(unit01.grade + upgrade_value <= 0 || unit01.grade + upgrade_value >= 7)
		{
			upgrade_value = 0;
		}
		
		var unit_grade_data = _unit_data.getUnitGradeData(unit01.grade+upgrade_value);
		*/
		
		var unit_grade_data = _unit_data.getUnitGradeData(unit01.grade);
		var rand = _util_func.randomInt(0, _util_func.getLength(unit_grade_data) - 1);
		var new_unit_id = unit_grade_data[rand].id;
		
		var unit_data = _unit_data.getUnitData(new_unit_id);
			
		if(unit_data.is_book === 1)
		{
			unit_book_add_stat_type = unit_data.add_book_stat_type;
			unit_book_add_stat = unit_data.add_book_stat;
		}
		
		_shard.singleQuery(bidx, uuid, "CALL set_unit_combine_info(?,?,?,?,?,?,?,?,?);",
			[uuid, new_unit_id, 1, 0, combine01_unit_idx, combine01_unit_level, combine02_unit_idx, unit_book_add_stat_type, unit_book_add_stat], function(err, result)
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
					
				ret['info'] = result[0];
				ret['unit_list'] = result[1];
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
	
	pUnitUnequip : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 5, info, ret, res)) return;
		
		var unit_idx = info[2];
		var unit_id = info[3];
		var slot_id = info[4];
		
		if(slot_id < 0 && slot_id > 2)
		{
			_logger.log({data : info, err : "ERR_ITEM_WRONG_SLOT_ID"}, "error");
			_error.errorEvent.emit('error', _error.errcode["ERR_ITEM_WRONG_SLOT_ID"], ret, res);
			return;
		}
		
		_shard.singleQuery(bidx, uuid, "CALL set_unit_unequip_info(?,?,?,?);", [uuid, unit_idx, unit_id, slot_id], function(err, result)
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
					
				ret['info'] = result[0];
				res.end(JSON.stringify(ret));
			}
		}, true);
	},
	
	pWeaponSwap : function(info, ret, res)
	{
		var uuid = info[0];
		var bidx = info[1];
		
		if (!_util_func.checkInfo(bidx, uuid, 7, info, ret, res)) return;
		
		var char_idx = info[2];
		var weapon1_idx = info[3];
		var weapon1_id = info[4];
		var weapon2_idx = info[5];
		var weapon2_id = info[6];

		_shard.singleQuery(bidx, uuid, "CALL set_item_weapon_swap_info(?,?,?,?,?,?);", [uuid, char_idx, weapon1_idx, weapon1_id, weapon2_idx, weapon2_id], function(err, result)
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
					
				var item_equip_list = result[0];
				for(var i in item_equip_list)
				{
					var item = _item_data.getItemData(item_equip_list[i].item_id);
					if(item === null || item === undefined)
					{
						continue;
					}
					
					item_equip_list[i].skill01 = item.skillid01;
					item_equip_list[i].skill02 = item.skillid02;
					item_equip_list[i].skill03 = item.skillid03;
					item_equip_list[i].skill04 = item.skillid04;
				}
				ret['info'] = item_equip_list;
				res.end(JSON.stringify(ret));
			}
		}, true);
	},

    // 옵션변경 구입 요청
    // 해당옵션 위치의 변경가능 한 옵션ID 2개를 전달(현재옵션 제외)
	pChangeOptionBuy: function (info, ret, res)
	{
        var uuid = info[0];
        var bidx = info[1];

        if (!_util_func.checkInfo(bidx, uuid, 7, info, ret, res)) return;

		var item_idx = info[2];
		var item_id = info[3];
		var option_idx = info[4];
		var cur_option_id = info[5];
		var change_count = info[6];

        // 변경 가능한 옵션(2개)
		var change_opt_list = _item_data.getChangeOptionList(item_id, option_idx, cur_option_id);

        // 옵션변경 가능회수 체크
		var item_info = _item_data.getItemData(item_id);
		if (item_info.change_opt_count <= change_count)
		    return;

        // 옵션변경 가격
		var item_grade = item_info.grade;
		var upgrade_cost = 2 * item_grade * (change_count + 1) * 100;

		_shard.singleQuery(bidx, uuid, "CALL set_money_add_info(?, ?, ?, ?, ?);", [uuid, 0, 0, 1, upgrade_cost], function (err, result) {
		    if (err) {
		        _logger.log({ data: info, err: err }, "error");
		        _error.errorEvent.emit('error', err, ret, res);
		    }
		    else {
		        ret['info'] = result[0];
		        ret['info'].item_idx = item_idx;
		        ret['info'].option_slot = option_idx;
		        ret['info']['option_list'] = change_opt_list;
		        res.end(JSON.stringify(ret));
		    }
		}, true);
	},

    // 옵션변경권 구입 후, 유저가 선택한 옵션으로 변경 요청
    // 기존옵션 선택 시 받지 않는다.
    pSetOption : function(info, ret, res)
    {
        var uuid = info[0];
        var bidx = info[1];

        if (!_util_func.checkInfo(bidx, uuid, 6, info, ret, res)) return;

        var item_idx = info[2];
        var option_idx = info[3];
        var option_id = info[4];
        var value = info[5];

        var option_data = _item_data.getItemOptionData(option_id);
        if (option_data === null || option_data === undefined)
            return;

        if (option_data.max < value)
            return;

        _shard.singleQuery(bidx, uuid, "CALL set_item_option(?, ?, ?, ? ,?);", [uuid, item_idx, option_idx, option_id, value], function (err, result) {
            if (err) {
                _logger.log({ data: info, err: err }, "error");
                _error.errorEvent.emit('error', err, ret, res);
            }
            else {
                ret['info'] = result[0];
                res.end(JSON.stringify(ret));
            }
        }, true);
    },

    // 유닛에 아이템을 착용 시킨다.
    // 이전 아이템은 삭제, 착용한 아이템은 해제할 수 없다.
    pUnitItemEquip : function(info, ret, res)
    {
        var uuid = info[0];
        var bidx = info[1];

        if (!_util_func.checkInfo(bidx, uuid, 7, info, ret, res)) return;

        var unit_idx = info[2];
        var unit_id = info[3];
        var item_idx = info[4];
        var item_id = info[5];
        var item_parts_type = info[6];		// 1: 무기, 2: 갑옷, 3: 투구

        var item = _item_data.getItemData(item_id);
        if (item === null || item === undefined) {
            _logger.log({ data: info, err: "ERR_ITEM_WRONG_ID" }, "error");
            _error.errorEvent.emit('error', _error.errcode['ERR_ITEM_WRONG_ID'], ret, res);
            return;
        }

        if (item.type != item_parts_type) {
            _logger.log({ data: info, err: "ERR_ITEM_NOT_EQUIP_ITEM" }, "error");
            _error.errorEvent.emit('error', _error.errcode["ERR_ITEM_NOT_EQUIP_ITEM"], ret, res);
            return;
        }

        var unit = _unit_data.getUnitData(unit_id);
        if (unit === null || unit === undefined) {
            _logger.log({ data: info, err: "ERR_UNIT_WRONG_ID" }, "error");
            _error.errorEvent.emit('error', _error.errcode['ERR_UNIT_WRONG_ID'], ret, res);
            return;
        }

        if (unit.unit_class != item.unit_class) {
            _logger.log(unit.unit_class, "info");
            _logger.log(item.unit_class, "info");
            _logger.log({ data: info, err: "ERR_UNIT_CLASS" }, "error");
            _error.errorEvent.emit('error', _error.errcode['ERR_UNIT_CLASS'], ret, res);
            return;
        }

        _shard.singleQuery(bidx, uuid, "CALL set_unit_itemequip_info(?,?,?,?,?);", [uuid, unit_idx, item_idx, item_id, item_parts_type], function (err, result) {
            if (err) {
                _logger.log({ data: info, err: err }, "error");
                _error.errorEvent.emit('error', err, ret, res);
            }
            else {
                if (!Array.isArray(result[0]))
                    result[0] = [result[0]];

                ret['info'] = result[0];
                res.end(JSON.stringify(ret));
            }
        }, true);
    }
}

Item.init();