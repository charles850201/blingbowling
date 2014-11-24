
// android in app billing(∞·¡¶)
var receipt = {
	publicKey : "",
	
	init : function(publickey)
	{
		var KEY_PREFIX, KEY_SUFFIX, chunkSize, chunks;
		KEY_PREFIX = "-----BEGIN PUBLIC KEY-----\n";
		KEY_SUFFIX = '\n-----END PUBLIC KEY-----';
		chunks = [];
		chunkSize = 64;
		
		this.publicKey = publickey;
		
		while (this.publicKey)
		{
			if (this.publicKey.length < chunkSize)
			{
				chunks.push(this.publicKey);
				break;
			}
			else
			{
				chunks.push(this.publicKey.substr(0, chunkSize));
				this.publicKey = this.publicKey.substr(chunkSize);
			}
		}
		
		this.publicKey = chunks.join("\n");
		this.publicKey = KEY_PREFIX + this.publicKey + KEY_SUFFIX;
	},
	
	verifyReceipt : function(signedData, signature)
	{
		var verifier;
		verifier = _crypto.createVerify('RSA-SHA1');
		verifier.update(signedData);
		return verifier.verify(this.publicKey, signature, 'base64');
	},
};

var android = {
	iab : receipt,
};

module.exports = android;