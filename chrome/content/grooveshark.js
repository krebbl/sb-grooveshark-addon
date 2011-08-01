// Constants
var GS_DOMAIN = "grooveshark.com";
var GS_HOME_URL = "http://listen." + GS_DOMAIN;
var GS_TOKEN_URL = "http://" + GS_DOMAIN + "/more.php";
// #"https://cowbell." + DOMAIN + "/service.php";
var GS_API_URL = "http://cowbell." + GS_DOMAIN + "/more.php";
var GS_SERVICE_URL = "http://cowbell." + GS_DOMAIN + "/service.php";

var GS_RANDOM_CHARS = "1234567890abcdef";

var GS_CLIENT_NAME = "htmlshark"
// #htmlshark#jsqueue;
var GS_CLIENT_VERSION = "20110606"
//"20100831.25"
// var GS_RE_SESSION = re.compile('"sessionID":"\s*?([A-z0-9]+)"') //re.compile('sessionID:\s*?\'([A-z0-9]+)\',')
var GS_SESSION_ID = "";
var GS_SECRET_KEY_JS = "bewareOfBearsharktopus"
var GS_SECRET_KEY = "backToTheScienceLab"

var GS_VALIDITY_SESSION = 172800 // 2 days
var GS_VALIDITY_TOKEN = 1000 // ca. 16 min.

var GroovesharkAPI = {
	session : null,
	token : null,
	lastTokenTime : 0,
	startSession : function() {
		this.session = this.parseHomepage();
		this.token = this.getToken();
		this.lastTokenTime = (new Date()).getTime();
		// alert(this.lastTokenTime);
	},
	parseHomepage : function() {
		var xhr = new XMLHttpRequest();
		xhr.open("GET", GS_HOME_URL, false);
		xhr.send(null);
		if(xhr.status == 200) {
			return xhr.responseText.match('"sessionID":"\s*?([A-z0-9]+)"')[1];
		}
	},
	getToken : function() {
		parameters = {
			"secretKey" : this.generateSecretKey(this.session)
		};
		var response = this.request(parameters, "getCommunicationToken", "token");
		// alert(JSON.stringify(response));
		try {
			return response["result"];
		} catch(err) {
			alert("TokenError: " + err);
		}
	},
	generateToken : function(method, client) {
		if(100000 <= ((new Date()).getTime() - this.lastTokenTime)) {
			this.token = this.getToken();
			this.lastTokenTime = (new Date()).getTime();
		}
		var randomChars = "";
		var secreteKey = "";
		if(client == 'jsqueue') {
			secretKey = GS_SECRET_KEY_JS
		} else {
			secretKey = GS_SECRET_KEY
		}
		while(6 > randomChars.length) {
			var r = GetRandom(0, GS_RANDOM_CHARS.length - 1);
			randomChars = randomChars + GS_RANDOM_CHARS[r];
		}
		var token = this.makeHash(method + ":" + this.token + ":" + secretKey + ":" + randomChars, 'SHA1');

		return randomChars + token;
	},
	generateSecretKey : function(str) {
		return this.makeHash(str);
	},
	makeHash : function(str, type) {
		var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
		createInstance(Components.interfaces.nsIScriptableUnicodeConverter);

		// we use UTF-8 here, you can choose other encodings.
		converter.charset = "UTF-8";
		// result is an out parameter,
		// result.value will contain the array length
		var result = {};
		// data is an array of bytes
		var data = converter.convertToByteArray(str, result);

		var ch = Components.classes["@mozilla.org/security/hash;1"]
		.createInstance(Components.interfaces.nsICryptoHash);

		var crypt;
		if(!type) {
			crypt = ch.MD5;
		} else if(type == "SHA1") {
			crypt = ch.SHA1;
		}
		;
		ch.init(crypt);
		ch.update(data, data.length);

		var hash = ch.finish(false);

		// convert the binary hash data to a hex string.
		s = "";
		for(i in hash) {
			s += toHexString(hash.charCodeAt(i));
		}
		// s now contains your hash in hex: should be
		// 5eb63bbbe01eeed093cb22bb8f5acdc3
		return s;
	},
	getPopular : function() {
		parameters = {
			type : 'daily'
		};
		response = this.request(parameters, "popularGetSongs");
		// alert(JSON.stringify(response));
		return response['result']['Songs'];
	},
	getSearchResults : function(query, type) {
		if(!type) {
			type = "Songs";
		}
		var parameters = {
			"query" : query,
			"type" : type
		}
		response = this.request(parameters, "getSearchResultsEx");
		// alert(JSON.stringify(response));
		return response['result']['result'];
	},
	request : function(parameters, method, type, clientVersion) {
		if(!type) {
			type = "default";
		}
		if(!clientVersion || parseFloat(clientVersion) < parseFloat(GS_CLIENT_VERSION)) {
			clientVersion = GS_CLIENT_VERSION;
		}

		var clientName = 'htmlshark'
		if(method == 'getStreamKeyFromSongIDEx') {
			clientName = 'jsqueue';
			clientVersion = "20110606.04";
		}

		if(method == 'getCommunicationToken' || type == "token") {
			clientName = 'htmlshark';
		}

		if(method == 'getSearchResultsEx') {
			clientName = 'htmlshark';
		}

		if(method == "albumGetSongs") {
			clientName = 'htmlshark';
		}

		var url;

		if(type == "token") {
			url = GS_TOKEN_URL + "?" + method;
		} else {

			if("service" == type) {
				url = GS_SERVICE_URL + "?" + method
			} else {
				url = GS_API_URL + "?" + method
			}
		}

		var xhr = new XMLHttpRequest();
		xhr.open("POST", url, false);
		xhr.setRequestHeader("Content-Type", "application/json");
		xhr.setRequestHeader("User-Agent", "Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US; rv:1.9.2.12) Gecko/20101026 Firefox/3.6.12 (.NET CLR 3.5.30729)");
		xhr.setRequestHeader("Referer", "http://listen.grooveshark.com/main.swf?cowbell=fe87233106a6cef919a1294fb2c3c05f");

		var p = {
			"header" : {
				"client" : clientName,
				"clientRevision" : clientVersion,
				"uuid" : "E69B4EDA-10D0-496A-8201-56AE9B7DE743",
				"session" : this.session
			},
			"country" : {
				"IPR" : "1021",
				"ID" : "223",
				"CC1" : "0",
				"CC2" : "0",
				"CC3" : "0",
				"CC4" : "2147483648"
			},
			"privacy" : 1,
			"parameters" : parameters,
			"method" : method
		}

		if(type != 'token') {
			p['header']['token'] = this.generateToken(method, clientName);
		}

		var postData = JSON.stringify(p);

		xhr.send(postData);
		if(xhr.status == 200) {
			return JSON.parse(xhr.responseText);
		}
		return {};
	},
	getStreamURL : function(songID) {
		parameters = {
			"songID" : songID,
			"prefetch" : false,
			"mobile" : false,
			"country" : {
				"IPR" : "1021",
				"ID" : "223",
				"CC1" : "0",
				"CC2" : "0",
				"CC3" : "0",
				"CC4" : "2147483648"
			}
		}
		response = this.request(parameters, "getStreamKeyFromSongIDEx");
		// alert(JSON.stringify(response));
		try {
			streamKey = response["result"]["streamKey"];
			streamServer = response["result"]["ip"];
			streamServerID = response["result"]["streamServerID"];
			postData = {
				"streamKey" : streamKey
			};
			postData = encodeURI(postData);
			url = "http://" + streamServer + "/stream.php?streamKey=" + streamKey;

			return url;
		} catch(err) {
			alert("URL: " + err);
			return '';
		}
	}
}

// return the two-digit hexadecimal code for a byte
function toHexString(charCode) {
	return ("0" + charCode.toString(16)).slice(-2);
}

function GetRandom(min, max) {
	if(min > max) {
		return (-1);
	}
	if(min == max) {
		return (min);
	}

	return (min + parseInt(Math.random() * ( max - min + 1)));
}