exports.randomInt = function(from, to)   
{  
	return Math.floor((Math.random()*(to - from + 1)) + from);  
}

exports.randomIntArray = function(from, to, count)
{
	if((to - from + 1) < count)
		return null;
	
	var intArray = [];
	for(var i = 0; i < count; i++)
	{
		var start = 0;
		var end = 0;
		if(i === 0)
		{
			start = from;
			end = to + 1 - count;
		}
		else
		{
			start = intArray[i-1] + 1;
			end = to + 1 - (count - i);
		}
		
		intArray.push(this.randomInt(start, end));
	}
	
	return intArray;
}

exports.getValues = function(object, key)
{
	var values = [];
	if(Array.isArray(object))
	{
		object.forEach(function(v, i)
		{
			values.push(v[key]);
		});
	}
	else
	{
		values.push(object[key]);
	}

	return values;
}

exports.getKeyValues = function(object, key, value)
{
	var values = {};
	if(Array.isArray(object))
	{
		object.forEach(function(v, i)
		{
			values[v[key]] = v[value];
		});
	}
	else
	{
		values[object[key]] = object[value];
	}

	return values;
}

exports.getLength = function(object)
{
	if(Array.isArray(object))
		return object.length;
		
	return Object.keys(object).length; 
}

exports.objectCopy = function (obj)
{
	return JSON.parse(JSON.stringify(obj));
}

exports.checkInfo = function(bidx, uuid, count, info, ret, res)
{
	if (bidx === null || bidx === undefined)
	{
		ret["errno"] = -1111111;
//		ret["errno"] = _error.errcode["ERR_WRONG_DATA"];
		//_utilFunc.sendResult(res, ret);
		res.end(JSON.stringify(ret));
		return false;
	}

	if (uuid === null || uuid === undefined || uuid === 0)
	{
		ret["errno"] = -2222222;
//		ret["errno"] = _error.errcode["ERR_WRONG_DATA"];
		//_utilFunc.sendResult(res, ret);
		res.end(JSON.stringify(ret));
		return false;
	}
	
	if (count > 0)
	{
		for (var i = 0; i < count; i++)
		{
			if (info[i] === null || info[i] === undefined)
			{
				ret["errno"] = -3333333;
//				ret["errno"] = _error.errcode["ERR_WRONG_DATA"];
				//_utilFunc.sendResult(res, ret);
				res.end(JSON.stringify(ret));
				return false;
			}
		}
	}
	
	return true;
}