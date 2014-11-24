var character_data = {};
var character_exp_data = {};

exports.read = function()
{
	_fs.readFile("json/Character_Char.json", function(err, data)
	{
		if(err)
		{
			console.log("Character_Char.json read failed!");
			return;
		}

		var character = JSON.parse(data.toString());

		for(var i in character)
		{
			// 캐릭터 아이디, 환생 시 변경할 캐릭터 아이디, 환생 횟수
			character_data[ parseInt(character[i]['ClassId_b']) ] =
			{
				rebirth_target_id : parseInt(character[i]['Second_b']),
				rebirth_count : parseInt(character[i]['RebirthNum_b']),
				//character_level : character[i]['Lv_b'],
				//character_exp : character[i]['Exp_ui'],
				//character_accrue_exp : character[i]['ExpAccrue_ui'],
				//character_buy_level : character[i]['CostLevel_b'],
				buy_cost_type : parseInt(character[i]['CostType_b']),
				buy_cost : parseInt(character[i]['Cost_ui'])
			};
		}
	});
	
	
	_fs.readFile("json/EXPData_CharEXP.json", function(err, data)
	{
		if(err)
		{
			console.log("EXPData_CharEXP.json read failed!");
			return;
		}

		var character_exp = JSON.parse(data.toString());

		var rebirth_count = 0;
		
		for(var i in character_exp)
		{
			if(rebirth_count != parseInt(character_exp[i]['RebirthNum_b']))
			{
				rebirth_count = parseInt(character_exp[i]['RebirthNum_b']);
				character_exp_data[rebirth_count] = {};
			}

			character_exp_data[rebirth_count][parseInt(character_exp[i]['Level_b'])] =
			{
				level : parseInt(character_exp[i]['Level_b']),
				exp : parseInt(character_exp[i]['EXP01_ui']),
				total_exp : parseInt(character_exp[i]['TotalEXP01_ui']),
			};
		}
	});
}

exports.getCharacterData = function(character_id)
{
	return character_data[character_id];
}

exports.getCharacterExpData = function(rebirth_count)
{
	return character_exp_data[rebirth_count];
}
