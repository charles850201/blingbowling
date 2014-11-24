/**
 * dispatcher.js
 * 패킷 1차 분기점
 */
 
var func = [null, _user, _character, _item, _game, _mission, _friend];

exports.dispatch = function(req, res)
{
	var json = null;

	if(req.query.enc != null)		// get
	{
		json = JSON.parse(req.query.enc);
	}
	else	if(req.body.enc != null)	// post
	{
		json = JSON.parse(req.body.enc);
	}
	else						// error
	{
		res.end("bye bye sayonara1");
		return;
	}

	_logger.log({ip : req.ip, data : json}, "info");
	
	var cmd = parseInt(json.cmd/1000);

	if(func[cmd] == null || func[cmd] == undefined)
	{
		res.end("bye bye sayonara2");
		return;
	}

	func[cmd].run(res, json);
}