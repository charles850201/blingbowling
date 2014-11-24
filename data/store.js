var store_gacha_data = {};
var store_item_data = {};

exports.read = function()
{
	_fs.readFile("json/Store_Sto.json", function(err, data)
	{
		if(err)
		{
			_logger.log("Store_Sto.json read failed!", "error");
			return;
		}

		var store_item = JSON.parse(data.toString());

		for(var i in store_item)
		{
			store_item_data[parseInt(store_item[i]['StoreId_us'])] = 
			{
				object_type : parseInt(store_item[i]['IDType_b']),
				object_id : parseInt(store_item[i]['ItemId_us']),
				category : parseInt(store_item[i]['Category_b']),
				equip_class : parseInt(store_item[i]['Class_b']),
				buy_cost_type : parseInt(store_item[i]['CostType_b']),
				buy_cost : parseInt(store_item[i]['Cost_ui']),
				sale : parseInt(store_item[i]['Bonus_us']),
				gift : parseInt(store_item[i]['Gift_is']),
			};
		}
	});
	
	_fs.readFile("json/Store_Gacha.json", function(err, data)
	{
		if(err)
		{
			_logger.log("Store_Gacha.json read failed!", "error");
			return;
		}

		var store_gacha = JSON.parse(data.toString());

		var gacha_id = 0;
		
		for(var i in store_gacha)
		{
			if(gacha_id != parseInt(store_gacha[i]['Gacha_b']))
			{
				gacha_id = parseInt(store_gacha[i]['Gacha_b']);
				store_gacha_data[gacha_id] = {};
			}
		
			store_gacha_data[gacha_id][parseInt(store_gacha[i]['StoreId_us'])] = 
			{
				store_id : parseInt(store_gacha[i]['StoreId_us']),
				object_type : parseInt(store_gacha[i]['IDType_b']),
				object_id : parseInt(store_gacha[i]['ItemId_us']),
				buy_cost_type : parseInt(store_gacha[i]['CostType_b']),
				buy_cost : parseInt(store_gacha[i]['Cost_ui']),
				sale : parseInt(store_gacha[i]['Bonus_us']),
				probability : parseInt(store_gacha[i]['Chance_f']),
				continue_price : parseInt(store_gacha[i]['ConsecutiveCost_ui']),
			};
		}
	});
}

exports.getStoreGachaData = function(gacha_id)
{
	return store_gacha_data[gacha_id];
}

exports.getStoreItemData = function(store_id)
{
	return store_item_data[store_id];
}