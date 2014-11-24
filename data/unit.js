var unit_data = {};
var unit_grade_data = {};
var unit_exp_data = {};
var unit_upgrade_data = {};
var unit_combine_data = {};

exports.read = function()
{
	_fs.readFile("json/Monster_unitmon.json", function(err, data)
	{
		if(err)
		{
			_logger.log("Monster_unitmon.json read failed!", "error");
			return;
		}

		var unit = JSON.parse(data.toString());

		for(var i in unit)
		{
			unit_data[parseInt(unit[i]['UnitId_us'])] =
			{
				id : parseInt(unit[i]['UnitId_us']),
				reward_exp : parseInt(unit[i]['Exp_ui']),
				reward_gold : parseInt(unit[i]['Gold_ui']),
				reward_point : parseInt(unit[i]['Point_ui']),
				reward_ruby : parseInt(unit[i]['Ruby_ui']),
				type : parseInt(unit[i]['UnitType_b']),
				grade : parseInt(unit[i]['Grade_b']),
				group_id : parseInt(unit[i]['GroupIdx_us']),
				upgrade_id : parseInt(unit[i]['GradeIdx_us']),
				is_book : parseInt(unit[i]['IsBook_is']),
				add_book_stat_type : parseInt(unit[i]['BookAbility_b']),	// 도감 수집으로 인해 추가되는 능력치 타입(1: 공, 2: 방, 3: 체)
				add_book_stat : parseInt(unit[i]['AbilityNum_b']),
				sell_price: parseInt(unit[i]['SellingPrice_ui']),
				unit_class: parseInt(unit[i]['MonClass_b']),
			};
			
			if(unit_grade_data[parseInt(unit[i]['Grade_b'])] === null || unit_grade_data[parseInt(unit[i]['Grade_b'])] === undefined)
			{
				unit_grade_data[parseInt(unit[i]['Grade_b'])] = [];
			}
			
			if(parseInt(unit[i]['UnitType_b']) === 0)
			{
				unit_grade_data[parseInt(unit[i]['Grade_b'])].push(
				{
					id : parseInt(unit[i]['UnitId_us']),
					reward_exp : parseInt(unit[i]['Exp_ui']),
					reward_gold : parseInt(unit[i]['Gold_ui']),
					reward_point : parseInt(unit[i]['Point_ui']),
					type : parseInt(unit[i]['UnitType_b']),
					grade : parseInt(unit[i]['Grade_b']),
				});
			}
		}
		
		//_logger.log(unit_grade_data, "info");
	});
	
	//_fs.readFile("json/EXPData_UpPer.json", function(err, data)
	//{
	//	if(err)
	//	{
	//		_logger.log("EXPData_UpPer.json read failed!", "error");
	//		return;
	//	}

	//	var unit_exp = JSON.parse(data.toString());

	//	for(var i in unit_exp)
	//	{
	//		if(parseInt(unit_exp[i]['UpType_b']) === 2)
	//		{
	//			unit_exp_data[parseInt(unit_exp[i]['TargetGrade_b'])] =
	//			{
	//				grade_probability : [ 0,
	//							parseInt(unit_exp[i]['MaterialGrade01_us']),
	//							parseInt(unit_exp[i]['MaterialGrade02_us']),
	//							parseInt(unit_exp[i]['MaterialGrade03_us']),
	//							parseInt(unit_exp[i]['MaterialGrade04_us']),
	//							parseInt(unit_exp[i]['MaterialGrade05_us']),
	//							parseInt(unit_exp[i]['MaterialGrade06_us']),
	//							parseInt(unit_exp[i]['MaterialGrade07_us']) ],
	//				cost_type : 1,
	//				cost : parseInt(unit_exp[i]['Cost_ui']),	// 강화 코스트
	//				upgrade_cost : parseInt(unit_exp[i]['EvolCost_ui']),	// 진화 코스트
	//			};
	//		}
	//	}
		
	//	//_logger.log(unit_exp_data, "info");
	//});
	
	_fs.readFile("json/Monster_Combine_Combine.json", function(err, data)
	{
		if(err)
		{
			_logger.log("Monster_Combine_Combine.json read failed!", "error");
			return;
		}
		
		var unit_combine = JSON.parse(data.toString());
		
		for(var i in unit_combine)
		{
			unit_combine_data = 
			{
				equal_probability : parseInt(unit_combine[i]['EqualPer_ui']),
				increase_probability : parseInt(unit_combine[i]['IncreasePer_ui']),
				decrease_probability : parseInt(unit_combine[i]['DecreasePer_ui']),
			};
		}
		
		//_logger.log(unit_combine_data, "info");
	});
}

exports.getUnitData = function(unit_id)
{
	return unit_data[unit_id];
}

exports.getUnitGradeData = function(grade)
{
	return unit_grade_data[grade];
}

exports.getUnitExpData = function(unit_id)
{
	return unit_exp_data[unit_id];
}

exports.getUnitUpgradeData = function(unit_upgrade_id)
{
	return unit_upgrade_data[unit_upgrade_id];
}

exports.getUnitCombineData = function()
{
	return unit_combine_data;
}