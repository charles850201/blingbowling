module.exports.protocol = {};

exports.protocol["base"] = {};
exports.protocol["base"]["user"] = 1;
exports.protocol["base"]["character"] = 2;
exports.protocol["base"]["item"] = 3;
exports.protocol["base"]["game"] = 4;

exports.protocol["user"] = {};
exports.protocol["user"]["P_USER"] = 1000;
exports.protocol["user"]["P_USER_LOGIN"] = 1001;
exports.protocol["user"]["P_USER_ASSET_INFO"] = 1002;
exports.protocol["user"]["P_USER_SET_NICKNAME"] = 1003;

// 메일
exports.protocol["user"]["P_USER_MAIL"] = 1100;
exports.protocol["user"]["P_USER_MAIL_INFO"] = 1101;
exports.protocol["user"]["P_USER_MAIL_RECV"] = 1102;
exports.protocol["user"]["P_USER_MAIL_RECV_ALL"] = 1103;

// 캐릭터 관련
exports.protocol["character"] = {};
exports.protocol["character"]["P_CHARACTER"] = 2000;
exports.protocol["character"]["P_CHARACTER_LIST"] = 2001;
exports.protocol["character"]["P_CHARACTER_SELECT"] = 2002;
exports.protocol["character"]["P_CHARACTER_CREATE"] = 2003;
exports.protocol["character"]["P_CHARACTER_CLEAR_STAGE_LIST"] = 2004;
exports.protocol["character"]["P_CHARACTER_REBIRTH"] = 2005;

// 아이템 관련
exports.protocol["item"] = {};
exports.protocol["item"]["P_ITEM"] = 3000;
exports.protocol["item"]["P_ITEM_BUY"] = 3001;
exports.protocol["item"]["P_ITEM_STRENGTHEN"] = 3002;
exports.protocol["item"]["P_ITEM_UPGRADE"] = 3003;
exports.protocol["item"]["P_ITEM_EQUIP"] = 3004;
exports.protocol["item"]["P_ITEM_SELL"] = 3005;
exports.protocol["item"]["P_ITEM_GACHA_BUY"] = 3006;
exports.protocol["item"]["P_ITEM_UNIT_STRENGTHEN"] = 3007;
exports.protocol["item"]["P_ITEM_UNIT_UPGRADE"] = 3008;
exports.protocol["item"]["P_ITEM_UNIT_EQUIP"] = 3009;
exports.protocol["item"]["P_ITEM_UNIT_COMBINE"] = 3010;
exports.protocol["item"]["P_ITEM_UNIT_UNEQUIP"] = 3011;
exports.protocol["item"]["P_ITEM_WEAPON_SWAP"] = 3012;
exports.protocol["item"]["P_ITEM_CHANGEOPTION_BUY"] = 3013;
exports.protocol["item"]["P_ITEM_SETOPTION"] = 3014;
exports.protocol["item"]["P_ITEM_UNIT_ITEMEQUIP"] = 3015;

// 유료 결제 관련
exports.protocol["item"]["P_ITEM_PURCHASE"] = 3100;

// 게임 관련
exports.protocol["game"] = {};
exports.protocol["game"]["P_GAME"] = 4000;
exports.protocol["game"]["P_GAME_SINGLE_STAGE_CLEAR"] = 4001;
exports.protocol["game"]["P_GAME_SINGLE_STAGE_REWARD"] = 4002;
exports.protocol["game"]["P_GAME_SINGLE_STAGE_REWARD_CASH"] = 4003;
exports.protocol["game"]["P_GAME_SINGLE_STAGE_REWARD_COMPLETE"] = 4004;
exports.protocol["game"]["P_GAME_RAID_STAGE_CLEAR"] = 4011;
exports.protocol["game"]["P_GAME_RAID_STAGE_REWARD"] = 4012;
exports.protocol["game"]["P_GAME_RAID_STAGE_REWARD_CASH"] = 4013;
exports.protocol["game"]["P_GAME_RAID_STAGE_REWARD_COMPLETE"] = 4014;
exports.protocol["game"]["P_GAME_INFINITE_STAGE_CLEAR"] = 4021;
exports.protocol["game"]["P_GAME_START"] = 4101;
exports.protocol["game"]["P_GAME_BUY_GACHA"] = 4102;
exports.protocol["game"]["P_GAME_LOBBY_SERVER_INFO"] = 4201;
exports.protocol["game"]["P_GAME_CHAT_SERVER_INFO"] = 4202;

// 미션
exports.protocol["mission"] = {};
exports.protocol["mission"]["P_MISSION"] = 5000;
exports.protocol["mission"]["P_MISSION_INFO"] = 5001;
exports.protocol["mission"]["P_MISSION_UPDATE"] = 5002;
exports.protocol["mission"]["P_MISSION_REWARD"] = 5003;
exports.protocol["mission"]["P_MISSION_REWARD_ALL"] = 5004;

// 친구
exports.protocol["friend"] = {};
exports.protocol["friend"]["P_FRIEND"] = 6000;
exports.protocol["friend"]["P_FRIEND_RECOMMAND_LIST"] = 6001;
exports.protocol["friend"]["P_FRIEND_REQUEST"] = 6002;
exports.protocol["friend"]["P_FRIEND_DELETE"] = 6003;
exports.protocol["friend"]["P_FRIEND_ACCEPT"] = 6004;
exports.protocol["friend"]["P_FRIEND_DENY"] = 6005;
exports.protocol["friend"]["P_FRIEND_LIST"] = 6006;
exports.protocol["friend"]["P_FRIEND_SEND_HEART"] = 6007;
exports.protocol["friend"]["P_FRIEND_SEARCH"] = 6008;


exports.protocol["test"] = {};
exports.protocol["test"]["P_TEST"] = 9900;
exports.protocol["test"]["P_TEST_1"] = 9901;