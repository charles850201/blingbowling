var default_data = {};

exports.read = function()
{
	_fs.readFile("json/Default_CharacterDefault.json", function(err, data)
	{
		if(err)
		{
			console.log("Default_CharacterDefault.json read failed!");
			return;
		}

		var _default = JSON.parse(data.toString());

		for(var i in _default)
		{
			default_data[parseInt(_default[i]['ClassId_b'])] =
			{
				class_id : parseInt(_default[i]['ClassId_b']),
				weapon : parseInt(_default[i]['Weapon_ui']),
				armor : parseInt(_default[i]['Armor_ui']),
				helmet : parseInt(_default[i]['Helmet_ui']),
				unit01 : parseInt(_default[i]['Unit01_us']),
			};
		}
	});
}

exports.getDefaultData = function(class_id)
{
	return default_data[class_id];
}
