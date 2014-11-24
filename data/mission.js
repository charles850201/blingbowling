var mission_data = {};
var mission_type_data = {};

// 1. 이벤트 미션: 이벤트 기간이 지나면 삭제
// 2. 주간 미션: 일주일 마다 초기화 
// 3. 일일 미션: 일일 마다 초기화
// 4. 연속 미션: 완수 되면 초기화

exports.read = function()
{
	//_fs.readFile("json/MissionData_Mission.json", function(err, data)
	//{
	//	if(err)
	//	{
	//		console.log("MissionData_Mission.json read failed!");
	//		return;
	//	}

	//	var _mission_data = JSON.parse(data.toString());

	//	for(var i in _mission_data)
	//	{
	//		mission_data[parseInt(_mission_data[i]['Index_us'])] =
	//		{
	//			id : parseInt(_mission_data[i]['Index_us']),
	//			mission_type : parseInt(_mission_data[i]['Type_b']),
	//			goal_type : parseInt(_mission_data[i]['GoalType_b']),
	//			goal_value : parseInt(_mission_data[i]['GoalValue_ui']),
	//			reward_type : parseInt(_mission_data[i]['RewardType_b']),
	//			reward_id : parseInt(_mission_data[i]['RewardItemId_us']),
	//		};
			
	//		if(mission_type_data[_mission_data[i]['Type_b']] === null || mission_type_data[_mission_data[i]['Type_b']] === undefined)
	//		{
	//			mission_type_data[_mission_data[i]['Type_b']] = [];
	//		}
			
	//		mission_type_data[_mission_data[i]['Type_b']].push( mission_data[parseInt(_mission_data[i]['Index_us'])] );
	//	}
		
	//	//console.log(mission_data);
	//	//console.log(mission_type_data);
	//});
}

exports.getMissionData = function(mission_id)
{
	return mission_data[mission_id];
}

exports.getMissionTypeData = function(mission_type)
{
	return mission_type_data[mission_type];
}