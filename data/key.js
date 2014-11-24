var key_data = {};

exports.read = function()
{
	//_fs.readFile("json/KeyData_Sheet1.json", function(err, data)
	//{
	//	if(err)
	//	{
	//		console.log("KeyData_Sheet1.json read failed!");
	//		return;
	//	}

	//	var _key = JSON.parse(data.toString());

	//	for(var i in _key)
	//	{
	//		key_data[_key[i]['Key_c']] =
	//		{
	//			key : _key[i]['Key_c'],
	//			value : parseInt(_key[i]['Value_ui']),
	//		};
	//	}
	//});
}

exports.getKeyData = function(key)
{
	return key_data[key].value;
}