var stage_data = {};

exports.read = function()
{
	_fs.readFile("json/Stage_Sta.json", function(err, data)
	{
		if(err)
		{
			console.log("Stage_Sta.json read failed!");
			return;
		}

		var stage = JSON.parse(data.toString());

		for(var i in stage)
		{
			stage_data[parseInt(stage[i]['StageId_us'])] = 
			{
				stage_id : parseInt(stage[i]['StageId_us']),
				stage_limit_time : parseInt(stage[i]['LimitTime_us']),
				stage_std_time : parseInt(stage[i]['StandardTime_us']),
				stage_grade : [parseInt(stage[i]['GradeSS_us']), parseInt(stage[i]['GradeS_us']), parseInt(stage[i]['GradeAA_us']), parseInt(stage[i]['GradeA_us'])],
				stage_reward : parseInt(stage[i]['RewardGroup_us']),
				stage_reward_special : parseInt(stage[i]['RewardGroupSS_us']),
				stage_fatigue : parseInt(stage[i]['Fatigue_b']),
				stage_clear_point : parseInt(stage[i]['ClearPoint_ui']),
			};
		}

		//console.log(stage_data);
	});
}

exports.getStagedata = function(stage_id)
{
	return stage_data[stage_id];
}
