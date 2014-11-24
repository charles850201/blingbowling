exports.errcode = {};

exports.errcode["ERR_DB"]= -1001;
exports.errcode["ERR_LOGIN_NO_ID"]= -1002;
exports.errcode["ERR_LOGIN_NOT_JOIN"]= -1003;
exports.errcode["ERR_LOGIN_INCORRECT_PASSWORD"]= -1004;

exports.errcode["ERR_CHARACTER_WRONG_ID"]= -2001;
exports.errcode["ERR_CHARACTER_ALREADY_CONNECTED"] = -2002;
exports.errcode["ERR_CHARACTER_ALREADY_CREATE"] = -2003;
exports.errcode["ERR_CHARACTER_NOT_ENOUGH_STAR_POINT"] = -2004;
exports.errcode["ERR_CHARACTER_ALREADY_REBIRTH"] = -2005;
exports.errcode["ERR_CHARACTER_NOT_ENOUGH_REBIRTH"] = -2006;

exports.errcode["ERR_ITEM_WRONG_ID"] = -3001;
exports.errcode["ERR_ITEM_NOT_ENOUGH_GOLD"]= -3002;
exports.errcode["ERR_ITEM_ALREADY_HAVE"]= -3003;
exports.errcode["ERR_ITEM_NO_MORE_STRENGTHEN"]= -3004;
exports.errcode["ERR_ITEM_NOT_EQUIP_CLASS"]= -3005;
exports.errcode["ERR_ITEM_WRONG_SLOT_ID"]= -3006;
exports.errcode["ERR_ITEM_NOT_EQUIP_ITEM"]= -3007;
exports.errcode["ERR_ITEM_NO_HAVE_ITEM"]= -3008;
exports.errcode["ERR_ITEM_ALREADY_EQUIP"]= -3009;
exports.errcode["ERR_ITEM_NOT_ENOUGH_LEVEL"]= -3010;
exports.errcode["ERR_ITEM_NO_MORE_UPGRADE"]= -3011;
exports.errcode["ERR_ITEM_NOT_SELL_EQUIP"]= -3012;
exports.errcode["ERR_ITEM_NOT_SAME_GRADE"]= -3013;
exports.errcode["ERR_ITEM_WRONG_MATERIAL_ITEM"]= -3014;

exports.errcode["ERR_GAME_CANNOT_MATCHING_RECONNECTING"] = -4001;
exports.errcode["ERR_GAME_CANNOT_FIND_EMPTY_SERVER"] = -4002;
exports.errcode["ERR_GAME_WRONG_STAGE_ID"] = -4003;
exports.errcode["ERR_GAME_WRONG_SLOT_ID"] = -4004;
exports.errcode["ERR_GAME_NOT_REWARD"] = -4005;
exports.errcode["ERR_ITEM_NOT_ENOUGH_STAMP"] = -4006;

exports.errcode["ERR_GAME_ALREADY_CONNECTED"] = -4501;
exports.errcode["ERR_GAME_NOT_READY"] = -4502;
exports.errcode["ERR_GAME_NOT_CONNECTED"] = -4503;

exports.errcode["ERR_MISSION_WRONG_ID"] = -5001;
exports.errcode["ERR_MISSION_NOT_COMPLETE"] = -5002;

exports.errcode["ERR_ALREADY_FRIEND"] = -6001;
exports.errcode["ERR_MAX_FRIEND"] = -6002;
exports.errcode["ERR_ISNOT_FRIEND"] = -6003;
exports.errcode["ERR_SEND_HEART_TIME"] = -6004;

exports.errcode["ERR_DATA"] = -9998;
exports.errcode["ERR_SYSTEM"] = -9999;
/*
exports.errorEvent = new process.EventEmitter();

exports.error_event = function(res, ret, errcode){
    ret['errcode'] = errcode;
    res.end(JSON.stringify(ret));
}*/

exports.errorEvent = new process.EventEmitter();

exports.errorEvent.on('error', function(errcode, ret, res)
{
	ret['errno'] = errcode;
	res.end(JSON.stringify(ret));
});