var url_info = 
{
	dev : 
	{
		push_url : "http://cpdev-m.pushapi.netmarble.net/messages",
		billing_url : "http://112.175.174.38:80/v2/Service/Billing/",
	},
	alpha : 
	{
		push_url : "http://cpdev-m.pushapi.netmarble.net/messages",
		billing_url : "http://112.175.174.134:80/v2/Service/Billing/",
	},
	real : 
	{
		push_url : "http://pushapi.api.netmarble.net/messages",
		billing_url : "https://nmbill.netmarble.net:443/v2/Service/Billing/",
	},
};

var cj_push = 
{
	push_url : null,
	push_message : 
	{
		messages : {
			pushType : 0,
			serviceCode : "",
			payload : {},
			targetPushServiceType : 0,
			targetUserKeyType : 0, 	// 카카오 이용 시 무조건 0
			targetUserList : {
				users : []
			}
		}
	},
	init : function(server_type, service_code)
	{
		// dev
		if(server_type == 1)
		{
			this.push_url = url_info.dev.push_url;
		}
		// alpha
		else if(server_type == 2)
		{
			this.push_url = url_info.alpha.push_url;
		}
		// real
		else if(server_type == 3)
		{
			this.push_url = url_info.real.push_url;
		}
		else
		{
			_logger.log("cj_push init failed", "error");
		}
		
		this.push_message.messages.serviceCode = service_code;
	},
	/*
	* send_push 함수 전달인자 설명
	* pushType : 푸쉬 Operation의 종류 - 0: UniCast, MultiCast  1: BroadCast  2: Samping(bulk)
	* message : 보낼 푸쉬 메세지(json 형식)
	* targetPushType : BroadCast 전용 - 0: GCM  1: APNS  2: NCM
	* user_list : UniCast(MultiCast) 전용 - 푸쉬 받을 유저의 카카오톡 uuid 배열 - [1,2,3,4]
	* cb : 결과값을 받을 콜백 함수(전달인자는 errorCode 하나)
	*/
	send_push : function(pushType, message, targetPushType, user_list, cb)
	{
		this.push_message.messages.pushType = pushType;
		this.push_message.messages.payload = message;
		
		if(pushType == 0)
		{
			delete this.push_message.messages.targetPushServiceType;
			this.push_message.messages.targetUserKeyType = 0;
		}
		else if(pushType == 1)
		{
			this.push_message.messages.targetPushServiceType = targetPushType;
			delete this.push_message.messages.targetUserKeyType;
		}
			
		this.push_message.messages.targetUserList.users = user_list;
		
		console.log(JSON.stringify(this.push_message));
		
		_http_request.post(
		{
			headers : { 'Content-Type': 'application/json' },
			url : this.push_url,
			body : JSON.stringify(this.push_message)
		},
		/* post callback */function(err, res, body)
		{
			body = JSON.parse(body);
			if(cb)
			{
				cb(body.errorCode);
			}
			else
			{
				_logger.log(body, "error");
			}
		});
	},
};


var cj_billing = {
	billing_url : null,
	game_code : null,
	init : function(server_type, game_code)
	{
		// dev
		if(server_type == 1)
		{
			this.billing_url = url_info.dev.billing_url;
		}
		// alpha
		else if(server_type == 2)
		{
			this.billing_url = url_info.alpha.billing_url;
		}
		// real
		else if(server_type == 3)
		{
			this.billing_url = url_info.real.billing_url;
		}
		else
		{
			_logger.log("cj_billing init failed", "error");
		}
		
		this.game_code = game_code;
	},
	
	/*
	* regist 함수 전달인자 설명
	* store : 결제 스토어(googleplay, appstore, tstore, uplus, olleh)
	* product_id : 인앱 상품 아이디
	* kakao_id : 카카오 uid
	* uuid : 게임 내 유저 uuid
	* gift : 선물 여부 (Y or N)
	* cb : 결과값을 받을 콜백 함수(전달인자는 JSON type의 변수 하나)
	*/
	regist : function(store, product_id, kakao_id, uuid, gift)
	{
		var req_body = "CheckType=POST&StoreType=" + store + "&GameCode=" + game_code + "&ItemId=" + product_id + "&UserType=kakao&UserKey=" + kakao_id + "&UserPhoneNumber=0&GiftFlag=" + gift + "&CountryCode=KR&Etc01=";
		
		_http_request.post(
		{
			headers : { 'Content-Type': 'application/x-www-form-urlencoded' },
			url : this.billing_url + "Initialize/?",
			body : req_body
		},
		/* post callback */function(err, res, body)
		{
			body = JSON.parse(body);
			if(cb)
			{
				cb(body);
				/*
				* body 구조
				* resCode : -9 초기화 중 오류, -8 파라메터 오류, -1 DB 처리 오류, 0 성공, 6 등록된 상품 아님, 100 점검중
				* transactionId : 구매 번호 - 총 19자리 = 결제타입(1) + 날짜데이터(15) + 시리얼번호(3)
				* applicationId : 마켓별 게임 ID
				* productName : 상품명
				* productId : 상품 코드
				* amount : 상품 가격
				*/
			}
			else
			{
				_logger.log(body, "error");
			}
		});
	},
	
	/*
	* verify 함수 전달인자 설명
	* type : VerifyType - RM or PU, RM : 리워드 조회시 사용(로그인시 한번만), PU : 실제 결제 진행할 때 사용
	* store : 결제 스토어(googleplay, appstore, tstore, uplus, olleh)
	* application_id : 마켓별 게임 ID
	* uuid : 게임 내 유저 uuid
	* purchase : 클라에게 받은 결제 정보 값
	* cb : 결과값을 받을 콜백 함수(전달인자는 JSON type의 변수 하나)
	*/
	verify : function(type, store, application_id, uuid, purchase, cb)
	{
		var req_body = "CheckType=POST&VerifyType=" + type + "&StoreType=" + store + "&ApplicationId=" + application_id + "&UserType=kakao&UserKey=" + uuid + "&GameCode=" + game_code + "&UserPhoneNumber=0&Purchases=" + purchase;
		
		_http_request.post(
		{
			headers : { 'Content-Type': 'application/x-www-form-urlencoded' },
			url : this.billing_url + "Billing/?",
			body : req_body
		},
		/* post callback */function(err, res, body)
		{
			body = JSON.parse(body);
			if(cb)
			{
				cb(body);
				/*
				* body 구조
				* resCode : -9 검증 진행 오류, -8 파라메터 오류, -7 암호화 오류, -6 암호화 parameter 길이 오류, 0 성공
				* results : 구매 정보에 대한 결과(여러 구매건이 있을 경우 리스트 형식)
				*	- transactionId : 구매 번호(구매 2로 시작, 보상 3으로 시작)
				*	- result : 결과 코드
				*	- itemId : 아이템
				*	- itemAmt : 결제 금액
				*	- rewardFlag : 보상 지급 건 구분 코드( Y : 보상지급, N : 구매검증 )
				*	- rewardInfo : { rewardTitle : 보상명, RewardCause : 보상 사유 }  -> 보상 지급의 경우 반드시 우편함으로 지급!!
				*	- result :	-1 오류,
							 0 검증 완료(보상지급일 경우 지급 가능건, 구매일 경우 대기 상태인 건을 결제 완료로 업데이트 -> consume 진행)
							 2 검증 완료(정상 결제건이지만 consume 되지 않은 상태 -> 아이템 지급을 안했다면 지급 후 consume 호출)
							 6 검증 오류
							 8 조회된 TransactionID가 없는 경우(이미 consume 까지 완료된 건)
							10 기타 상태 오류
				*/
			}
			else
			{
				_logger.log(body, "error");
			}
		});
	},
	
	/*
	* comsume 함수 전달인자 설명
	* uuid : 게임 내 유저 uuid
	* transaction_list : 상태를 업데이트 할 transaction id(리스트를 스트링으로 변환하여 넘겨주어야 함)
	* cb : 결과값을 받을 콜백 함수(전달인자는 JSON type의 변수 하나)
	*/
	comsume : function(uuid, transaction_list, cb)
	{
		var req_body = "CheckType=POST&UserType=kakao&UserKey=" + uuid + "&transactionIdx=" + transaction_list;
		
		_http_request.post(
		{
			headers : { 'Content-Type': 'application/x-www-form-urlencoded' },
			url : this.billing_url + "Consume/?",
			body : req_body
		},
		/* post callback */function(err, res, body)
		{
			body = JSON.parse(body);
			if(cb)
			{
				cb(body);
				/*
				* body 구조
				* resCode : -9 초기화 중 오류, -8 파라메터 오류, -6 암호화 parameter 길이 오류, -1 DB처리 오류, 0 성공
				* results : 구매 상태 업데이트에 대한 결과(여러 구매건이 있을 경우 리스트 형식)
				*	- transactionId : 구매 번호(구매 2로 시작, 보상 3으로 시작)
				*	- result : 결과 코드,  -1 상태변경 실패, 0 성공
				*/
			}
			else
			{
				_logger.log(body, "error");
			}
		});
	},
};




var cj = 
{
	push : cj_push,
	billing : cj_billing,
	init : function(server_type, service_code, game_code)
	{
		this.push.init(server_type, service_code);
		this.billing.inti(server_type, game_code);
	},
	
};

module.exports = cj;