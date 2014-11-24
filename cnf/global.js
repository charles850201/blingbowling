global._shardMaster= {
		host:"192.168.0.191", 
		user : "root",
		password : "tkfkdgody",
		database : "dcross_master",
		connectionLimit : 10,
		multipleStatements : true,
};

global._dbinfo= [
{
		host:"192.168.0.191", 
		user : "root",
		password : "tkfkdgody",
		database : "dcross_s1",
		connectionLimit : 10,
		multipleStatements : true,
}
]

global._logger = require('./../util/logger');
global._util_func = require('./../util/util_func');

global._fs = require('fs');
global._async = require('async');
global._crypto = require('crypto');
global._http_request = require('request');
global._protocol = require('./protocol');
global._error = require('./error');
global._shard = require('./../util/shard');

global._user = require('./../routes/p_user');
global._character = require('./../routes/p_character');
global._item = require('./../routes/p_item');
global._game = require('./../routes/p_game');
global._mission = require('./../routes/p_mission');
global._friend = require('./../routes/p_friend');

// json data 모두 global 변수로 설정
global._item_data = require('./../data/item');
global._character_data = require('./../data/character');
global._default_data = require('./../data/default');
global._store_data = require('./../data/store');
global._stage_data = require('./../data/stage');
global._unit_data = require('./../data/unit');
global._mission_data = require('./../data/mission');
global._key_data = require('./../data/key');

_item_data.read();
_character_data.read();
_default_data.read();
_store_data.read();
_stage_data.read();
_unit_data.read();
_mission_data.read();
_key_data.read();