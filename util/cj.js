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
			targetUserKeyType : 0, 	// īī�� �̿� �� ������ 0
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
	* send_push �Լ� �������� ����
	* pushType : Ǫ�� Operation�� ���� - 0: UniCast, MultiCast  1: BroadCast  2: Samping(bulk)
	* message : ���� Ǫ�� �޼���(json ����)
	* targetPushType : BroadCast ���� - 0: GCM  1: APNS  2: NCM
	* user_list : UniCast(MultiCast) ���� - Ǫ�� ���� ������ īī���� uuid �迭 - [1,2,3,4]
	* cb : ������� ���� �ݹ� �Լ�(�������ڴ� errorCode �ϳ�)
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
	* regist �Լ� �������� ����
	* store : ���� �����(googleplay, appstore, tstore, uplus, olleh)
	* product_id : �ξ� ��ǰ ���̵�
	* kakao_id : īī�� uid
	* uuid : ���� �� ���� uuid
	* gift : ���� ���� (Y or N)
	* cb : ������� ���� �ݹ� �Լ�(�������ڴ� JSON type�� ���� �ϳ�)
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
				* body ����
				* resCode : -9 �ʱ�ȭ �� ����, -8 �Ķ���� ����, -1 DB ó�� ����, 0 ����, 6 ��ϵ� ��ǰ �ƴ�, 100 ������
				* transactionId : ���� ��ȣ - �� 19�ڸ� = ����Ÿ��(1) + ��¥������(15) + �ø����ȣ(3)
				* applicationId : ���Ϻ� ���� ID
				* productName : ��ǰ��
				* productId : ��ǰ �ڵ�
				* amount : ��ǰ ����
				*/
			}
			else
			{
				_logger.log(body, "error");
			}
		});
	},
	
	/*
	* verify �Լ� �������� ����
	* type : VerifyType - RM or PU, RM : ������ ��ȸ�� ���(�α��ν� �ѹ���), PU : ���� ���� ������ �� ���
	* store : ���� �����(googleplay, appstore, tstore, uplus, olleh)
	* application_id : ���Ϻ� ���� ID
	* uuid : ���� �� ���� uuid
	* purchase : Ŭ�󿡰� ���� ���� ���� ��
	* cb : ������� ���� �ݹ� �Լ�(�������ڴ� JSON type�� ���� �ϳ�)
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
				* body ����
				* resCode : -9 ���� ���� ����, -8 �Ķ���� ����, -7 ��ȣȭ ����, -6 ��ȣȭ parameter ���� ����, 0 ����
				* results : ���� ������ ���� ���(���� ���Ű��� ���� ��� ����Ʈ ����)
				*	- transactionId : ���� ��ȣ(���� 2�� ����, ���� 3���� ����)
				*	- result : ��� �ڵ�
				*	- itemId : ������
				*	- itemAmt : ���� �ݾ�
				*	- rewardFlag : ���� ���� �� ���� �ڵ�( Y : ��������, N : ���Ű��� )
				*	- rewardInfo : { rewardTitle : �����, RewardCause : ���� ���� }  -> ���� ������ ��� �ݵ�� ���������� ����!!
				*	- result :	-1 ����,
							 0 ���� �Ϸ�(���������� ��� ���� ���ɰ�, ������ ��� ��� ������ ���� ���� �Ϸ�� ������Ʈ -> consume ����)
							 2 ���� �Ϸ�(���� ������������ consume ���� ���� ���� -> ������ ������ ���ߴٸ� ���� �� consume ȣ��)
							 6 ���� ����
							 8 ��ȸ�� TransactionID�� ���� ���(�̹� consume ���� �Ϸ�� ��)
							10 ��Ÿ ���� ����
				*/
			}
			else
			{
				_logger.log(body, "error");
			}
		});
	},
	
	/*
	* comsume �Լ� �������� ����
	* uuid : ���� �� ���� uuid
	* transaction_list : ���¸� ������Ʈ �� transaction id(����Ʈ�� ��Ʈ������ ��ȯ�Ͽ� �Ѱ��־�� ��)
	* cb : ������� ���� �ݹ� �Լ�(�������ڴ� JSON type�� ���� �ϳ�)
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
				* body ����
				* resCode : -9 �ʱ�ȭ �� ����, -8 �Ķ���� ����, -6 ��ȣȭ parameter ���� ����, -1 DBó�� ����, 0 ����
				* results : ���� ���� ������Ʈ�� ���� ���(���� ���Ű��� ���� ��� ����Ʈ ����)
				*	- transactionId : ���� ��ȣ(���� 2�� ����, ���� 3���� ����)
				*	- result : ��� �ڵ�,  -1 ���º��� ����, 0 ����
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