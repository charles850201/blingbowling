var item_data = {};
var item_exp_data = {};
var item_reward_data = {};
var item_grade_data = {};
var item_option_data = {};
// 아이템 업그레이드 데이터
// [등급][클래스][타입] 으로 이루어진 3중 배열
var item_upgrade_data = {};

// 랜덤옵션 데이터
var rand_option_data = {};

exports.read = function()
{
	_fs.readFile("json/Item_It.json", function(err, data)
	{
		if(err)
		{
			_logger.log("Item_It.json read failed!","error");
			return;
		}

		var item = JSON.parse(data.toString());

		for(var i in item)
		{
			item_data[parseInt(item[i]['Id_us'])] = 
			{
				id : parseInt(item[i]['Id_us']),
				type : parseInt(item[i]['Type_b']),
				consumption_type : parseInt(item[i]['Consumption_is']),
				value_no : parseInt(item[i]['ItemValue_i']),
				duplicate_count : parseInt(item[i]['Duplicate_us']),
				
				// 스킬
				skillid01 : parseInt(item[i]['SkillId1_us']),
				skillid02 : parseInt(item[i]['SkillId2_us']),
				skillid03 : parseInt(item[i]['SkillId3_us']),
				skillid04 : parseInt(item[i]['SkillId4_us']),
				
				equip_class : parseInt(item[i]['Class_b']),
				next_upgrade_idx : parseInt(item[i]['GradeIdx_us']),
				group_id : parseInt(item[i]['Group_us']),
				grade : parseInt(item[i]['Grade_b']),
				upgrade_id : parseInt(item[i]['GradeIdx_us']),
				sell_price : parseInt(item[i]['SellingPrice_ui']),

			    // 착용레벨
				equip_lv : parseInt(item[i]['EquipLv_b']),

			    // 옵션
				optionid01 : parseInt(item[i]['LoadGroupOpIdx01_us']),
				optionid02 : parseInt(item[i]['LoadGroupOpIdx02_us']),
				optionid03 : parseInt(item[i]['LoadGroupOpIdx03_us']),
				optionid04 : parseInt(item[i]['LoadGroupOpIdx04_us']),

                // 옵션 변경 제한 횟수
				change_opt_count: parseInt(item[i]['ChageOpLimit_b']),

			    // 유닛 클래스
				unit_class: parseInt(item[i]['MonClass_b']),
			};
			
			if(item_upgrade_data[parseInt(item[i]['Grade_b'])] === null || item_upgrade_data[parseInt(item[i]['Grade_b'])] === undefined)
			{
				item_upgrade_data[parseInt(item[i]['Grade_b'])] = [];
			}
			
			if(item_upgrade_data[parseInt(item[i]['Grade_b'])][parseInt(item[i]['Class_b'])] === null || item_upgrade_data[parseInt(item[i]['Grade_b'])][parseInt(item[i]['Class_b'])] === undefined)
			{
				item_upgrade_data[parseInt(item[i]['Grade_b'])][parseInt(item[i]['Class_b'])] = [];
			}
			
			if(item_upgrade_data[parseInt(item[i]['Grade_b'])][parseInt(item[i]['Class_b'])][parseInt(item[i]['Type_b'])] === null || item_upgrade_data[parseInt(item[i]['Grade_b'])][parseInt(item[i]['Class_b'])][parseInt(item[i]['Type_b'])] === undefined)
			{
				item_upgrade_data[parseInt(item[i]['Grade_b'])][parseInt(item[i]['Class_b'])][parseInt(item[i]['Type_b'])] = [];
			}
			
			item_upgrade_data[parseInt(item[i]['Grade_b'])][parseInt(item[i]['Class_b'])][parseInt(item[i]['Type_b'])].push(item_data[parseInt(item[i]['Id_us'])]);

			
			
			
			if(item_grade_data[parseInt(item[i]['Grade_b'])] === null || item_grade_data[parseInt(item[i]['Grade_b'])] === undefined)
			{
				item_grade_data[parseInt(item[i]['Grade_b'])] = [];
			}
			
			if(parseInt(item[i]['Grade_b']) !== 0)
			{
				item_grade_data[parseInt(item[i]['Grade_b'])].push(
				{
					id : parseInt(item[i]['Id_us']),
					type : parseInt(item[i]['Type_b']),
					grade : parseInt(item[i]['Grade_b']),
				});
			}
		}

        // Option TestCode
		//var option_list = _item_data.getOptionList(1101);
		//var value_list = _item_data.getValueList(option_list);
		//for (var i in option_list) {
		//    _logger.log(option_list[i], "info");
		//    _logger.log(value_list[i], "info");
		//}

	    //// Change Option TestCode
		////item_id, option_idx, cur_option_id
		//var change_list = _item_data.getChangeOptionList(1101, 1, 1);
		//for (var i in change_list) {
		//    _logger.log(change_list[i], "info");
		//}
	});
	
	//_fs.readFile("json/EXPData_UpPer.json", function(err, data)
	//{
	//	if(err)
	//	{
	//		_logger.log("EXPData_UpPer.json read failed!", "error");
	//		return;
	//	}

	//	var item_exp = JSON.parse(data.toString());

	//	for(var i in item_exp)
	//	{
	//		if(parseInt(item_exp[i]['UpType_b']) === 1)
	//		{
	//			item_exp_data[parseInt(item_exp[i]['TargetGrade_b'])] =
	//			{
	//				grade_probability : [ 0,
	//							parseInt(item_exp[i]['MaterialGrade01_us']),
	//							parseInt(item_exp[i]['MaterialGrade02_us']),
	//							parseInt(item_exp[i]['MaterialGrade03_us']),
	//							parseInt(item_exp[i]['MaterialGrade04_us']),
	//							parseInt(item_exp[i]['MaterialGrade05_us']),
	//							parseInt(item_exp[i]['MaterialGrade06_us']),
	//							parseInt(item_exp[i]['MaterialGrade07_us']) ],
	//				cost_type : 1,
	//				cost : parseInt(item_exp[i]['Cost_ui']),	// 강화 코스트
	//				upgrade_cost : parseInt(item_exp[i]['EvolCost_ui']),	// 진화 코스트
	//			};
	//		}
	//	}
		
	//	//_logger.log(item_exp_data, "info");
	//});
	
	// _fs.readFile("json/EXPData_EquipUp.json", function(err, data)
	// {
		// if(err)
		// {
			// _logger.log("EXPData_EquipUp.json read failed!","error");
			// return;
		// }

		// var item_exp = JSON.parse(data.toString());

		// var grade = -1;
		
		// for(var i in item_exp)
		// {
			// if(grade != parseInt(item_exp[i]['Grade_b']))
			// {
				// grade = parseInt(item_exp[i]['Grade_b']);
				// item_exp_data[grade] = {};
			// }

			// item_exp_data[grade][parseInt(item_exp[i]['Level_b'])] =
			// {
				// grade : grade,
				// level : parseInt(item_exp[i]['Level_b']),
				// up_cost_gold : parseInt(item_exp[i]['Gold_ui']),
				// up_cost_ruby : parseInt(item_exp[i]['Ruby_ui']),
				// material : {
							// type : parseInt(item_exp[i]['MaterialType01_b']),
							// id : parseInt(item_exp[i]['MaterialIdx01_us']),
							// count : parseInt(item_exp[i]['MaterialCount01_b']),
						 // },
				// probability : parseInt(item_exp[i]['Percent_ui']),
			// };
		// }
	// });
	
	_fs.readFile("json/Item_Reward_ItReward.json", function(err, data)
	{
		if(err)
		{
			_logger.log("Item_Reward_ItReward.json read failed!", "error");
			return;
		}

		var item_reward = JSON.parse(data.toString());

		var group_id = -1;
		
		for(var i in item_reward)
		{
			if(group_id != parseInt(item_reward[i]['GrIdx_ui']))
			{
				group_id = parseInt(item_reward[i]['GrIdx_ui']);
				item_reward_data[group_id] = {};
			}
			
			item_reward_data[group_id][parseInt(item_reward[i]['BoxIdx_b'])] = {};
			item_reward_data[group_id][parseInt(item_reward[i]['BoxIdx_b'])][1] =
			{
				reward_type : parseInt(item_reward[i]['Rtype01_b']),
				reward_id : parseInt(item_reward[i]['Ridx01_ui']),
				min : parseInt(item_reward[i]['Min01_ui']),
				max : parseInt(item_reward[i]['Max01_ui'])
			};
			
			item_reward_data[group_id][parseInt(item_reward[i]['BoxIdx_b'])][2] =
			{
				reward_type : parseInt(item_reward[i]['Rtype02_b']),
				reward_id : parseInt(item_reward[i]['Ridx02_ui']),
				min : parseInt(item_reward[i]['Min02_ui']),
				max : parseInt(item_reward[i]['Max02_ui'])
			};
			
			// item_reward_data[group_id][parseInt(item_reward[i]['BoxIdx_b'])][3] =
			// {
				// reward_type : parseInt(item_reward[i]['Rtype03_b']),
				// reward_id : parseInt(item_reward[i]['Ridx03_ui']),
				// min : parseInt(item_reward[i]['Min03_ui']),
				// max : parseInt(item_reward[i]['Max03_ui'])
			// };
			
			item_reward_data[group_id][item_reward[i]['BoxIdx_b']]['probability'] = parseInt(item_reward[i]['Percent_ui']);
		}

		//_logger.log(item_reward_data, "info");
	});

    // 옵션 데이터
	//_fs.readFile("json/Item_Option_Option.json", function (err, data) {
	//    if (err) {
	//        _logger.log("Item_Option_Option.json read failed!", "error");
	//        return;
	//    }

	//    var item_option = JSON.parse(data.toString());

	//    for (var i in item_option)
	//    {
	//        item_option_data[parseInt(item_option[i]['Idx_us'])] =
	//		{
	//		    id: parseInt(item_option[i]['Idx_us']),
	//		    type: parseInt(item_option[i]['OpType_b']),
	//		    min: parseInt(item_option[i]['Value01_f']),
	//		    max: parseInt(item_option[i]['Value02_f']),
	//		}
	//    }

	//    //_logger.log(item_option_data, "info");
	//});

    // 랜덤옵션 데이터
    //_fs.readFile("json/Item_Option_RanOption.json", function (err, data)
    //{
    //    if (err)
    //    {
    //        _logger.log("Item_Option_RanOption.json read failed!", "error");
    //        return;
    //    }

    //    var rand_option = JSON.parse(data.toString());
    //    var group_id = -1;
    //    var rand_value = 0;

    //    for (var i in rand_option)
    //    {
    //        if (group_id != parseInt(rand_option[i]['GroupIdx_us']))
    //        {
    //            rand_value = 0;
    //            group_id = parseInt(rand_option[i]['GroupIdx_us']);
    //            rand_option_data[group_id] = [];
    //        }

    //        rand_value = parseInt(rand_option[i]['Chance_ui']) + rand_value;
    //        var prob_info =
    //        {
    //           probability: rand_value,
    //           option_id: parseInt(rand_option[i]['LoadOpIdx_us'])
    //        }

    //        rand_option_data[group_id].push(prob_info);
	//    }

    //    //_logger.log(rand_option_data, "info");
    //});
}

exports.getItemData = function(item_id)
{
	return item_data[item_id];
}

exports.getItemExpData = function(grade)
{
	return item_exp_data[grade];
}

exports.getItemRewardData = function(group_id)
{
	return item_reward_data[group_id];
}

exports.getItemGradeData = function(grade)
{
	return item_grade_data[grade];
}

exports.getItemUpgradeData = function(grade, equip_class, type)
{
	return item_upgrade_data[grade][equip_class][type];
}

exports.getItemOptionData = function (option_id) {
    return item_option_data[option_id];
}

exports.getRandOptionData = function (group_id)
{
    return rand_option_data[group_id];
}

// Get OptionList
exports.getOptionList = function(item_id)
{
    var option_list = [];
    var item_info = this.getItemData(item_id);
    if (item_info === null || item_info === undefined)
        return null;

    option_list.push(this.getRandOptionID(item_info.optionid01));
    option_list.push(this.getRandOptionID(item_info.optionid02));
    option_list.push(this.getRandOptionID(item_info.optionid03));
    option_list.push(this.getRandOptionID(item_info.optionid04));

    return option_list;
}

// Get Value List
exports.getValueList = function (option_list) {
    var value_list = [];
    for (var i in option_list)
        value_list.push(this.getOptionValue(option_list[i]));

    return value_list;
}
 
// Get Random Option
exports.getRandOptionID = function (group_id)
{
    if (group_id === 0)
        return 0;

    var option_list = this.getRandOptionData(group_id);
    if (option_list === null || option_list === undefined)
        return 0;

    var probability = _util_func.randomInt(1, 1000000);
    for (var i in option_list) {
        if (probability <= option_list[i].probability) {
            return option_list[i].option_id;
        }
    }

    _logger.log("probability error", "info");
    return 0;
}

// Get Option Value
exports.getOptionValue = function (option_id)
{
    var option_data = this.getItemOptionData(option_id);
    if (option_data === null || option_data === undefined)
        return 0;

    return _util_func.randomInt(option_data.min, option_data.max);
}

// Get Change Option
exports.getChangeOptionList = function (item_id, option_idx, cur_option_id) {
    var item_info = this.getItemData(item_id);
    if (item_info === null || item_info === undefined)
        return null;

    var group_id = 0;
    switch (option_idx) {
        case 1: group_id = item_info.optionid01; break;
        case 2: group_id = item_info.optionid02; break;
        case 3: group_id = item_info.optionid03; break;
        case 4: group_id = item_info.optionid04; break;
    }

    var option_list = [];
    var check_list = [];
    check_list.push(cur_option_id);

    while (true) {
        var option_id = this.getRandOptionID(group_id);
        var is_exist = false;
        for (var i in check_list) {
            if (check_list[i] == option_id)
                is_exist = true;
        }

        if (!is_exist) {
            var option_info = {};
            option_info.id = option_id;
            option_info.value = this.getOptionValue(option_id);

            option_list.push(option_info);
            check_list.push(option_id);

            if (option_list.length == 2)
                break;
        }
    }

    return option_list;
}