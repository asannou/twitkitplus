var consumer = {};

consumer.twitter =
	{ consumerKey   : "ZVSTvUh41xj5AHNKwGxA"
	, consumerSecret: "C1OVXVsVD3pBuQ6rBMIVMDqx1ehW5yXZzFz9HmII"
	, serviceProvider:
	  { signatureMethod     : "HMAC-SHA1"
	  , requestTokenURL     : "http://twitter.com/oauth/request_token"
	  , userAuthorizationURL: "http://twitter.com/oauth/authorize"
	  , accessTokenURL      : "http://twitter.com/oauth/access_token"
	  , echoURL             : "http://adplats.timeserver.asia/javascript/example/echo.html"
	  }
	};

consumer.initializeForm =
	function initializeForm(oauth_request, oauth_etc, usage) {
//	    var selector = oauth_etc.elements[0];
	    var selection = "twitter";
	    var selected = consumer[selection];
	    if (selected != null) {
	        consumer.setInputs(oauth_etc, { URL           : selected.serviceProvider[usage + "URL"]
	                                      , consumerSecret: selected.consumerSecret
	                                      , tokenSecret   : selected[usage + "Secret"]
	                                 });
	        consumer.setInputs(oauth_request, { oauth_signature_method: selected.serviceProvider.signatureMethod
	                                          , oauth_consumer_key    : selected.consumerKey
	                                          , oauth_token           : selected[usage]
	                                 });
	    }
	    return true; 
	};

consumer.setInputs =
	function setInputs(oauth_request, props) {
	    for (p in props) {
	        if (oauth_request[p] != null && props[p] != null) {
	            oauth_request[p].value = props[p];
	        }
	    }
	}

consumer.signForm =
	function signForm(oauth_request,oauth_request2, oauth_etc) {
	    oauth_request.action = "http://twitter.com/oauth/request_token";
	    var accessor = { consumerSecret: "C1OVXVsVD3pBuQ6rBMIVMDqx1ehW5yXZzFz9HmII"
	                   , tokenSecret   : ""};
	    var message = { action: oauth_request.action
	                  , method: "POST"
	                  , parameters: []
	                  };
	    for (var e = 0; e < oauth_request.elements.length; ++e) {
	        var input = oauth_request.elements[e];
	        if(input.name != null 
	            && input.name != "" 
	            && input.value != null 
	            && (!(input.type == "checkbox" || input.type == "radio") || input.checked)){
	                message.parameters.push([input.name, input.value]);
	        }
	    }
	    OAuth.setTimestampAndNonce(message);
	    OAuth.SignatureMethod.sign(message, accessor);
	    var parameterMap = OAuth.getParameterMap(message.parameters);
alert('Haikui First');
alert(parameterMap.toSource());

	    for (var p in parameterMap) {
	        if (p.substring(0, 6) == "oauth_" && oauth_request[p] != null && oauth_request[p].name != null && oauth_request[p].name != ""){
	            oauth_request[p].value = parameterMap[p];
	        }
	    }
		var aj = new Ajax( oauth_request.action, {
			headers: Tweetbar.http_headers(),
			postBody: parameterMap,
			onComplete:
				function () {
					// callback();
				},
			onSuccess:
				function (raw_data) {
					//set authForm param
				    var selection = "twitter";
				    var selected = consumer[selection];
				    var temp_oauth_param1 = raw_data.split('&');
				    var temp_oauth_param2 = temp_oauth_param1[0].split('=');
			        consumer.setInputs(oauth_request2, { oauth_signature_method: selected.serviceProvider.signatureMethod
			                                           , oauth_signature       : parameterMap.oauth_signature
			                                           , oauth_consumer_key    : selected.oauth_consumer_key
			                                           , oauth_timestamp       : parameterMap.oauth_timestamp
			                                           , oauth_version         : '1.0'
			                                           , oauth_token           : temp_oauth_param2[1]
			                                 });
					//set auth window
					var auth_url= 'http://twitter.com/oauth/authorize?' + raw_data;
					var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].getService(Components.interfaces.nsIWindowWatcher);
					var win = ww.openWindow(null, auth_url,"aboutMyExtension", "chrome,centerscreen", null);
				},
			onFailure:
				function (e) {
					alert('Fail');
	//				alert(e.toSource());
				}
		}).request();

	    return false;
	};

consumer.authForm =
	function authForm(oauth_request2) {
	    oauth_request2.action = "http://twitter.com/oauth/access_token";
	 //   oauth_request.action = "http://twitter.com/oauth/authorize";
//	    var accessor = { consumerSecret: "C1OVXVsVD3pBuQ6rBMIVMDqx1ehW5yXZzFz9HmII"
//	                   , tokenSecret   : ""};
	    var message = { action: oauth_request2.action
	                  , method: "POST"
	                  , parameters: []
	                  };
	    for (var e = 0; e < oauth_request2.elements.length; ++e) {
	        var input = oauth_request2.elements[e];
	        if(input.name != null 
	            && input.name != "" 
	            && input.value != null 
	            && (!(input.type == "checkbox" || input.type == "radio") || input.checked)){
	                message.parameters.push([input.name, input.value]);
	        }
	    }
//	    OAuth.setTimestampAndNonce(message);
//	    OAuth.SignatureMethod.sign(message, accessor);
	    var parameterMap = OAuth.getParameterMap(message.parameters);

	    for (var p in parameterMap) {
	        if (p.substring(0, 6) == "oauth_" && oauth_request2[p] != null && oauth_request2[p].name != null && oauth_request2[p].name != ""){
	            oauth_request2[p].value = parameterMap[p];
	        }
	    }
alert('Haikui Last');
alert(oauth_request2.action);
alert(parameterMap.toSource());
		var aj = new Ajax( oauth_request2.action, {
			headers: Tweetbar.http_headers(),
			postBody: parameterMap,
			onComplete:
				function () {
					// callback();
				},
			onSuccess:
				function (raw_data) {
					alert('sucessAuth');
					alert(raw_data);
//					var auth_url= 'http://twitter.com/oauth/authorize?' + raw_data;
//					var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].getService(Components.interfaces.nsIWindowWatcher);
//					var win = ww.openWindow(null, auth_url,"aboutMyExtension", "chrome,centerscreen", null);
				},
			onFailure:
				function (e) {
					alert('Fail');
	//				alert(e.toSource());
				}
		}).request();

	    return false;
	};
