global._util_func = require('./../util/util_func');
global._logger = require('./../util/logger');

global._fs = require('fs');
global._async = require('async');
global._crypto = require('crypto');
global._http_request = require('request');
global._protocol = require('./../cnf/protocol');
global._error = require('./../cnf/error');
global._shard = require('./../util/shard');

global._user = require('./p_user');
global._character = require('./p_character');
global._item = require('./p_item');
global._game = require('./p_game');

// json data ��� global ������ ����
global._item_data = require('./../data/item');
global._character_data = require('./../data/character');
global._default_data = require('./../data/default');
global._store_data = require('./../data/store');
global._stage_data = require('./../data/stage');
global._unit_data = require('./../data/unit');
global._mission_data = require('./../data/mission');

_item_data.read();
_character_data.read();
_default_data.read();
_store_data.read();
_stage_data.read();
_unit_data.read();
_mission_data.read();


// watch - ���� ���� ����
var watch = require('node-watch');
watch('./json/', function(filename)
{
	//console.log(filename.slice(5));
});