/*
	TwitKit+ v1.2.2
	
	Based off of Tweetbar by tokisaba [timeserver0906@gmail.com]
	
	homepage:  http://pok.jp/
*/

/**
 * The main JavaScript class for TwitKit+.
 * 
 * @class
 * @requires MooTools
 * @version 1.2.2
 */
var Tweetbar = {
	
	// Variables //
	/**
	 * Tweets for each panel are stored here
	 */
	tweets: {
		friends: {},
		followers: {},
		public_timeline: {},
		home_timeline: {},
		replies: {},
		direct_messages: {},
		me: {},
		list: {},
	},
	/**
	 * Used for parsing Twitter's created_at API property later on
	 */
	month_names: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
	/**
	 * User is(n't) authenticated
	 */
	isAuthenticated: false,
	/**
	 * The current list being viewed
	 */
	currentList: null,
	/**
	 * Stores the updater object created by MooTools periodical() function
	 */
	updater: null,
	/**
	 * The MooTools Fx object responsible for showing/hiding the login window
	 */
	loginSlider: null,
	/**
	 * The current user's Twitter username
	 */
	username: null,
	/**
	 * The current user's Twitter password
	 */
	password: null,
	/**
	 * If we're waiting for the user to log in to do something, the action that
	 * will be performed is stored here.
	 */
	pendingAction: null,
	/**
	 * Cached HTTP headers to send with API requests
	 */
	httpHeaders: null,
	/**
	 * The service responsible for retrieving and setting preferences
	 */
	prefService: null,
	/**
	 * Service which reads/writes cookies
	 */
	cookieService: null,
	/**
	 * Service that retrieves localized strings
	 */
	stringBundleService: null,
	/**
	 * Shorthand way of accessing Tweetbar.stringBundleService
	 */
	strings: null,
	
	// Startup Functions //
	/**
	 * Initializes TwitKit+ processes and prepares the
	 * sidebar. This function is essential for TwitKit+ to
	 * function correctly.
	 * 
	 * @constructor
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	run:
		function () {
			Tweetbar.prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.twitkitplus.");
			Tweetbar.cookieService = Components.classes["@mozilla.org/cookiemanager;1"].getService(Components.interfaces.nsICookieManager);
			
			// l10n //
			Tweetbar.stringBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
			Tweetbar.strings = {
				UI: Tweetbar.stringBundleService.createBundle('chrome://twitkitplus/locale/ui.properties')
			};
			( Tweetbar.prefService.getBoolPref('secureConnection') ) ? Tweetbar.protocol = 'https' : Tweetbar.protocol = 'http';

			this.localize();

			// Markdown //
			Tweetbar.markDown = new Showdown.converter();
			
			// Docking //
			var url = window.location.href;
			if ( url.search('undocked') !== -1 ) {
				$('is-undocked').remove();
			}
			
			Tweetbar.DOMWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
				.getInterface(Components.interfaces.nsIWebNavigation)
				.QueryInterface(Components.interfaces.nsIDocShellTreeItem)
				.rootTreeItem
				.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
				.getInterface(Components.interfaces.nsIDOMWindow);
			
			var scheme = Tweetbar.prefService.getCharPref('colorScheme').toLowerCase();
			var link = new Element('link');
			link.setProperties({
				'rel': 'stylesheet',
				'href': 'chrome://twitkitplus/skin/themes/' + scheme + '.css',
				'type': 'text/css',
				'media': 'screen',
			});
			link.injectInside('thehead');
			$('thebody').setStyle('font-size', Tweetbar.prefService.getCharPref('fontSize') + '%');
			
			this.setListSize();
			
			this.loginSlider = new Fx.Slide('loginform', {duration: 500});
			this.loginSlider.hide();

			
			if ( Tweetbar.protocol == 'https' ){
				$('using-ssl').setProperty('src', 'chrome://twitkitplus/skin/images/ssl-on.png');
			}else{
				$('using-ssl').setProperty('src', 'chrome://twitkitplus/skin/images/ssl-off.png');
			}
			var initial_panel = Tweetbar.prefService.getCharPref('active_panel');
			if ( initial_panel == '' ){
				initial_panel = 'public_timeline';
			}
			
			try {
				Tweetbar.username = Tweetbar.prefService.getCharPref('tkp_username');
				Tweetbar.password = Tweetbar.prefService.getCharPref('tkp_password');
				if ( Tweetbar.username !== '' && Tweetbar.password !== '' ) {
					Tweetbar.isAuthenticated = true;
					Tweetbar.set_username_on_page();
				} else {
					Tweetbar.username = null;
					Tweetbar.password = null;
				}
			} catch (e) { }
			
			//Tweetbar.prefService.setCharPref('list_lastname','default');
			this.activate_panel(initial_panel);
		},
	/**
	 * Translates all words in the HTML document to the
	 * user's current locale.
	 * 
	 * @methodOf Tweetbar
	 * @since 1.1
	 */
	localize:
		function () {
			$('.signin').innerHTML = this._('login.signIn');
			$('login-header').innerHTML = this._('login.header');
			$('username-label').innerHTML = this._('login.form.username');
			$('password-label').innerHTML = this._('login.form.password');
			$('loginbutton').setProperty('value', this._('login.form.submit'));
			$('signup').innerHTML = this._('login.signUp', '<a href="' + Tweetbar.protocol + '://twitter.com/account/create?tb_10" target="_content">', '</a>');
			$('question').innerHTML = this._('poster.question');
			$('compress').setProperty('title', this._('poster.compress'));
			$('public').innerHTML = this._('tabs.public.title');
			$('user').innerHTML = this._('tabs.user.title');
			$('friends').innerHTML = this._('tabs.friends.title');
			$('followers').innerHTML = this._('tabs.followers.title');
			$('replies').innerHTML = this._('tabs.replies.title');
			$('direct-messages').innerHTML = this._('tabs.directMessages.title');
			$('me').innerHTML = this._('tabs.me.title');
			//$('refreshing').innerHTML = this._('misc.refreshing');
			$('refresh').innerHTML = this._('misc.refresh');
			$('clear-link').innerHTML = this._('misc.clear');
			$('loading').innerHTML = this._('misc.loading');

			return null;
		},
	
	// l10n //
	/**
	 * Translates a string into the user's current locale.
	 * If one parameter is given, the string is retrieved.
	 * If more than one parameters are given, the string is
	 * formatted with the 2nd, 3rd, 4th parameters, etc.
	 * 
	 * @param {String} label Word to localize
	 * @param {String} [vars=""] (optional) Extra variables
	 * @returns {String} A localized string
	 * @methodOf Tweetbar
	 * @since 1.1
	 */
	_:
		function (label) {
			if ( arguments.length === 1 ) {
				try {
					return Tweetbar.strings.UI.GetStringFromName(label);
				} catch (e) {
					return label;
				}
			}
			return Tweetbar.strings.UI.formatStringFromName(label,
				Array.prototype.slice.call(arguments, 1),
				arguments.length - 1);
		},
	
	// HTTP Headers //
	/**
	 * Reset all HTTP headers (used in logging in/out)
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	clear_http_headers:
		function () {
			Tweetbar.httpHeaders = null;
		},
	/**
	 * Return standarad HTTP headers to be sent to Twitter.
	 * 
	 * @returns {Array} An array of HTTP headers.
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	http_headers:
		function () {
			if ( !Tweetbar.httpHeaders ) {
				Tweetbar.httpHeaders = {
					'X-Twitter-Client': 'TwitKit',
					'X-Twitter-Client-Version': '1.0.5',
					'X-Twitter-Client-URL': 'http://engel.uk.to/twitkit/1.2.2.xml',
				};
				if ( Tweetbar.username && Tweetbar.password )
					Tweetbar.httpHeaders['Authorization'] = Tweetbar.http_basic_auth();
			}
			return Tweetbar.httpHeaders;
		},
	/**
	 * Return Basic authentication for HTTP headers.
	 * 
	 * @returns {String} Basic authentication string.
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	http_basic_auth:
		function () {
			return 'Basic ' + btoa(Tweetbar.username + ':' + Tweetbar.password);
		},
	
	// Cookies //
	/**
	 * Clears cookies for twitter.com, to prevent sign-in
	 * problems.
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	clear_cookies:
		function () {
			var url = 'HTTP://TWITTER.COM';
			var iter = Tweetbar.cookieService.enumerator;
			while ( iter.hasMoreElements() ) {
				var cookie = iter.getNext();
				if ( cookie instanceof Components.interfaces.nsICookie ) {
					if ( url.indexOf(cookie.host.toUpperCase()) != -1 )
						Tweetbar.cookieService.remove(cookie.host, cookie.name, cookie.path, cookie.blocked);
				}
			}
		},
	
	// Miscellaneous //
	/**
	 * Returns the Twitter API request URL for the specified action.
	 * 
	 * @param {String} resource A valid Twitter API request.
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	api_url_for_statuses:
		function (resource,param,count) {
		    if(param == undefined || param == ''){
		        addparam = '?';
		    }else{
		    	addparam = param + '&';
		    }
		    if(count != undefined ){
		        addcount = 'count=' + count;
		    }else{
		        addcount = 'count=20';
		    }
			return Tweetbar.protocol + '://twitter.com/statuses/' + resource + '.json' + addparam + addcount;
		},
	api_url_for_nonstatuses:
		function (resource,param) {
			return Tweetbar.protocol + '://twitter.com/' + resource + '.json'+ param;
		},
	api2_url_for_statuses:
		function (resource,param,status) {
		    if(param == undefined || param == ''){
		        addparam = '?';
		    }else{
		    	addparam = param + '&';
		    }
		    if(status == undefined || status == ''){
		        addstatus = 'statuses';
		    }else{
		    	addstatus = status;
		    }
			return Tweetbar.protocol + '://api.twitter.com/1/' + addstatus + '/' + resource + '.json'+ addparam;
		},
	api_url_for_search:
		function (resource,param) {
			return 'http://search.twitter.com/' + resource + '.json'+ param;
		},

//	api_url_for_more_statuses:
//		function (resource) {
//			return Tweetbar.protocol + '://twitter.com/statuses/home_timeline.json?max_id=' + resource;
//		},
	/**
	 * Make links and replies clickable.
	 * 
	 * @param {String} s Tweet text
	 * @returns {String} Tweet text with clickable links and Twitter names
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	expand_status:
		function (s) {
			ret = s.toString();
			ret = ret.replace(/\</,'&lt;');

			//tweetphoto
			reg_tweetphoto = new RegExp('http:\/\/tweetphoto\.com\/([a-zA-Z0-9]+)([?()!).,\\s]|<|$)', 'g');
			ret = ret.replace(reg_tweetphoto, '<a rel="twitpic_gm" href="tkavoidurl://tweetphoto.com/$1" target="_blank"><img style="border: 1px solid #ccc; float: left; margin: 0 3px 3px 0; height: 72px; width: 72px;" src="tkavoidurl://TweetPhotoAPI.com/api/TPAPI.svc/json/imagefromurl?size=thumbnail&url=tkavoidurl://tweetphoto.com/$1" border="0" /></a>$2');
			//twitpic
			reg_twitpic = new RegExp('http:\/\/(www\.|)twitpic\.com\/([a-zA-Z0-9]+)([?()!).,\\s]|<|$)', 'g');
			ret = ret.replace(reg_twitpic, '<a rel="twitpic_gm" href="tkavoidurl://twitpic.com/$2" target="_blank"><img style="border: 1px solid #ccc; float: left; margin: 0 3px 3px 0; height: 72px; width: 72px;" src="tkavoidurl://twitpic.com/show/thumb/$2" border="0" /></a>$3');
			//movepic
			reg_movapic = new RegExp('http:\/\/movapic\.com\/pic\/([a-zA-Z0-9]+)([?()!).,\\s]|<|$)', 'g');
			ret = ret.replace(reg_movapic, '<a rel="twitpic_gm" href="tkavoidurl://movapic.com/pic/$1" target="_blank"><img style="border: 1px solid #ccc; float: left; margin: 0 3px 3px 0; height: 72px; width: 72px;" src="tkavoidurl://image.movapic.com/pic/s_$1.jpeg" border="0" /></a>$2');
			//imgly
			reg_imgly = new RegExp('http:\/\/img\.ly\/([a-zA-Z0-9]+)([?()!).,\\s]|<|$)', 'g');
			ret = ret.replace(reg_imgly, '<a rel="twitpic_gm" href="tkavoidurl://img.ly/$1" target="_blank"><img style="border: 1px solid #ccc; float: left; margin: 0 3px 3px 0; height: 72px; width: 72px;" src="tkavoidurl://img.ly/show/mini/$1" border="0" /></a>$2');
			//yfrog
			reg_yfrog = new RegExp('http:\/\/yfrog\.com\/([a-zA-Z0-9]+)([?()!).,\\s]|<|$)', 'g');
			ret = ret.replace(reg_yfrog, '<a rel="twitpic_gm" href="tkavoidurl://yfrog.com/$1" target="_blank"><img style="border: 1px solid #ccc; float: left; margin: 0 3px 3px 0; height: 72px; width: 72px;" src="tkavoidurl://yfrog.com/$1.th.jpg" border="0" /></a>$2');
			//make <a> tag
			re = new RegExp('(<\\w+.*?>|[^=!:\'"/]|^|)((?:https?:\/\/)|(?:irc:\/\/)|(?:www\.){4})([-\\w]+(?:\.[-\\w]+)*(?::\\d+)?(?:/(?:(?:[~\\w\\+#%-]|(?:[,.;@:][^\\s$]))+)?)*(?:\\?[\\w\\+%&=.;:-]+)?(?:\#[\\w\-\.]*)?)([?()!).,\\s]|<|$)', 'gi');
			ret = ret.replace(re, '$1' + this.anchor_tag('$2$3') + '$4');
			//画像用URLを元に戻す
			re = new RegExp('tkavoidurl://', 'g');
			ret = ret.replace(re, 'http://');
			ret = ret.replace(/<a href="www/g, '<a href="http:\/\/www'); //'
			ret = ret.replace(/<a href="(\S+) ([^<>]+)" target(.+)>(\S+) ([^<]+)<\/a>/, '<a href="$1" target$3>$1</a> $5');
			ret = ret.replace(/([\w-]+)@([\w-]+\.)([\w-]+)/, this.anchor_tag('mailto:$1&#64;$2$3', '$1&#64;$2$3'));
			ret = ret.replace(/(\s|^)\@([0-9a-z_A-Z]+)/g, this.anchor_tag(Tweetbar.protocol + ':\/\/twitter.com/$2'.toLowerCase(),'$1@$2','$2 ' + this._('misc.onTwitter')));
			return ret;
		},
	/**
	 * Take a JSON object, parse it for parameters we need, and format them.
	 *
	 * @param {Object} obj A JSON object returned from the Twitter API.
	 * @returns {Object} A filtered and formatted tweet object
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	create_status_object:
		function (obj) {
			return {
				'id': parseInt(obj.id),
				'text': Tweetbar.expand_status(obj.text),
				'created_at': Date.parse(obj.created_at || Date()),
				'source': obj.source,
				'favorited': obj.favorited,
				'truncated': obj.truncated,
				'reply_id': parseInt(obj.in_reply_to_status_id)
			}
		},
	/**
	 * Take a JSON object containing a user, parse it, and format it.
	 * 
	 * @param {Object} obj A JSON object returned from a 'friends' or 'followers' API request.
	 * @returns {Object} A filtered and formatted user object
	 * @see Tweetbar#create_status_object
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	create_user_object:
		function (obj) {
			return {
				'id': parseInt(obj.id),
				'url': obj.url,
				'profile_image_url': obj.profile_image_url,
				'name': obj.name,
				'location': obj.location,
				'description': obj.description,
				'screen_name': obj.screen_name,
			}
		},
	/**
	 * Link a username to its Twitter profile.
	 * 
	 * @param {String} user A user object returned from Tweetbar#create_user_object.
	 * @param {String} [text="$username"] The text to show in the link. Username by default.
	 * @returns {String} A linked tag.
	 * @see Tweetbar#create_user_object
	 * @see Tweetbar#anchor_tag
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	user_anchor_tag:
		function (user, text) {
			var name;
			( Tweetbar.prefService.getCharPref('showNamesAs') == 'screennames' ) ? name = user['screen_name'] : name = user['name'];
			return this.anchor_tag(Tweetbar.protocol + '://twitter.com/' + user['screen_name'],
				( (text) ? text : name),
				user['name'] + ' in ' + user['location']);
		},
	/**
	 * Anchor a tag.
	 * 
	 * @param {String} url The URL to link to.
	 * @param {String} [text=""] The text to anchor.
	 * @param {String} [title=""] Title to use (text displayed when link is hovered over).
	 * @returns {String} An anchored tag.
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	anchor_tag:
		function (url, text, title) {
			return '<a href="'+url+'" target="_blank" title="' +
				( (title) ? title : '') +'" alt="'+
				( (title) ? title : '') +'">'+
				( (text) ? text : url ) + '</a>';
		},
	/**
	 * Convert a date returned from Twitter API requests to a relative time string.
	 * 
	 * @param {String} time_value A date returned from Twitter API requests
	 * @returns {String} Relative time string
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	relative_time_string:
		function (time_value) {
			var delta = parseInt(((new Date).getTime() - time_value) / 1000);
		   
			if ( delta < 60 )
				return 'less than a minute ago';
			else if ( delta < 120 )
				return 'about a minute ago';
			else if ( delta < ( 45*60 ) )
				return ( parseInt(delta / 60) ).toString() + ' minutes ago';
			else if ( delta < ( 90*60 ) )
				return 'about an hour ago';
			else if ( delta < ( 24*60*60 ) )
				return 'about ' + ( parseInt(delta / 3600) ).toString() + ' hours ago';
			else if ( delta < ( 48*60*60 ) )
				return '1 day ago';
			else
				return ( parseInt(delta / 86400) ).toString() + ' days ago';
		},
	
	// Misc. Tweet Functions //
	/**
	 * This is a shorthand method of retrieving the tweets currently being displayed.
	 * 
	 * @returns {Object} An object filled with tweets
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	current_tweets:
		function () {
			return this.tweets[this.currentList];
		},
	/**
	 * Clear tweets from the current panel.
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	clear_current_tweets:
		function () {
			var panel = this.currentList;
			
			for ( var tweet in this.tweets[panel] ) {
				if ( this.tweets[panel][tweet]._b )
					delete this.tweets[panel][tweet];
			}
			//this.update_current_list();
		},
	

	// URL Compression //
	/**
	 * Replaces a long URL in the status box with a URL compressed by is.gd
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	compress_url:
		function () {
			var originalinput = document.getElementById('status').value;
			var originurl = document.getElementById('status').value.match(/(https?|ftp)(:\/\/[-_.!~*\'()a-zA-Z0-9;\/?:\@&=+\$,%#]+)/g);  //'
			var shortener_service = Tweetbar.prefService.getCharPref('shortenerService').toLowerCase();
			if ( originurl.length == 0 ){
				return;
			}
			for(var i=0;i<originurl.length;i++){
				var convert_results = '';
				var raw_data_results ;
				var temp_originurl = originurl[i];

				if(originurl[i].length > 25){
					if ( shortener_service == 'is.gd' ) {
						var shortener_url = "http://is.gd/api.php?longurl=";
						var url = shortener_url+escape(originurl[i]);
						var aj = new Ajax( url, {
							method: 'get',
							postBody: {},
							onSuccess:
								function (replaced) {
									convert_results = replaced;
									originalinput = originalinput.replace(temp_originurl,convert_results);
									document.getElementById('status').value = originalinput;
									$('nav-label').setHTML('finish URL shoten'+i);
									updateStatusTextCharCounter(originalinput);
								}
						}).request();
					} else if ( shortener_service == 'bit.ly' ) {
						var shortener_url = "http://api.bit.ly/shorten?version=2.0.1&longUrl=";
						var extra_bits = "&login=timeserver&apiKey=R_667934812dd1de4236f8eadad88d7846";
						var url = shortener_url+escape(originurl[i])+extra_bits;
						var aj = new Ajax( url, {
							method: 'get',
							postBody: {},
							onSuccess:
								function (raw_data) {
									raw_data_results = raw_data;//different process only bit.ly

									if (typeof JSON == "undefined"){ 
										Components.utils.import("resource://gre/modules/JSON.jsm");
									}
									if (typeof JSON.parse == "undefined"){ 
										convert_results = JSON.fromString(raw_data_results).results[temp_originurl].shortUrl;
									}else{
										convert_results = JSON.parse(raw_data_results).results[temp_originurl].shortUrl;
									}
									//convert_results = JSON.parse(raw_data_results).results[temp_originurl].shortUrl;
									originalinput = originalinput.replace(temp_originurl,convert_results);
									document.getElementById('status').value = originalinput;
									$('nav-label').setHTML('finish URL shoten'+i);
									updateStatusTextCharCounter(originalinput);
				}
						}).request();
					} else if ( shortener_service == 'tinyurl' ) {
						var shortener_url = "http://tinyurl.com/api-create.php?url=";
						var url = shortener_url+escape(originurl[i]);
						var aj = new Ajax( url, {
							method: 'get',
							postBody: {},
							onSuccess:
								function (replaced) {
									convert_results = replaced;
									originalinput = originalinput.replace(temp_originurl,convert_results);
									document.getElementById('status').value = originalinput;
									$('nav-label').setHTML('finish URL shoten'+i);
									updateStatusTextCharCounter(originalinput);
								}
						}).request();
					} else if ( shortener_service == 'tr.im' ) {
						var shortener_url = "http://tr.im/api/trim_simple?url=";
						var url = shortener_url+escape(originurl[i]);
						var aj = new Ajax( url, {
							method: 'get',
							postBody: {},
							onSuccess:
								function (replaced) {
									convert_results = replaced;
									originalinput = originalinput.replace(temp_originurl,convert_results);
									document.getElementById('status').value = originalinput;
									$('nav-label').setHTML('finish URL shoten'+i);
									updateStatusTextCharCounter(originalinput);
								}
						}).request();
					} else if ( shortener_service == 'xrl.us' ) {
						var shortener_url = "http://metamark.net/api/rest/simple?long_url=";
						var url = shortener_url+escape(originurl[i]);
						var aj = new Ajax( url, {
							method: 'get',
							postBody: {},
							onSuccess:
								function (replaced) {
									convert_results = replaced;
									originalinput = originalinput.replace(temp_originurl,convert_results);
									document.getElementById('status').value = originalinput;
									$('nav-label').setHTML('finish URL shoten'+i);
									updateStatusTextCharCounter(originalinput);
								}
						}).request();
					}
				}
			}
		},
		
	// Rendering //
	/**
	 * Render a tweet (but don't print it).
	 * 
	 * @param {Object} tweet A tweet object returned by Tweetbar#create_status_object.
	 * @param {Object} li A MooTools Element object of a 'li' element.
	 * @returns {String} Fully-rendered tweet HTML.
	 * @see Tweetbar#create_status_object
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	render_tweet:
		function (tweet, li) {
//alert('render_tweet');
//alert(tweet.toSource());
			var display_date = '';
			if ( tweet ) {
				if ( !tweet._a ){
					tweet._a = true;
				}else if ( !tweet._b ){
					tweet._b = true;
				}
				if ( this.currentList != 'replies' && this.currentList != 'me'){
					li.setProperty('id', tweet.id);
				}
				
				// user_pic
				var link_reply_with_pic = '<a href="#" onclick="setReplyNonId(\'' + tweet.user.screen_name + '\');">';
				if ( tweet.user && tweet.user.profile_image_url ){
					if(tweet.rtuser && tweet.rtuser.profile_image_url){
						link_reply_with_pic += '<img src="' + tweet.user.profile_image_url + '" width="24" height="24" alt="' + tweet.user.name + '"  onmouseover="$(\'nav-label\').innerHTML = \'User : ' + tweet.user.name + '\';" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';" />'
    					                     + '<span class="rtpic"><a href="#" onclick="setReplyNonId(\'' + tweet.rtuser.screen_name + '\');">'
    					                     + '<img src="' + tweet.rtuser.profile_image_url + '" width="18" height="18" alt="' + tweet.rtuser.name + '"  onmouseover="$(\'nav-label\').innerHTML = \'RTUser : ' + tweet.rtuser.name + '\';" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';" align ="right" /></a></span>';
					}else{
						link_reply_with_pic += '<img src="' + tweet.user.profile_image_url + '" width="24" height="24" alt="' + tweet.user.name + '"  onmouseover="$(\'nav-label\').innerHTML = \'User : ' + tweet.user.name + '\';" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';" />';
					}
				}

				link_reply_with_pic +=  '</a>';

				( tweet.user.screen_name == Tweetbar.username ) ? dellink = '<a href="#" onclick="Tweetbar.delete_tweet(\'' + tweet.id + '\');"><img style="border: none; float: right;" src="chrome://twitkitplus/skin/images/delete.png" alt="" /></a>' : dellink = '';
				
				( this.currentList == 'replies' ) ? date = '' : date = ' - ' + Tweetbar.relative_time_string(tweet.created_at);
				
				/*
				 * Hashtags implementation - by Joschi
				 */
//				tweet.text = tweet.text.replace(/(\s|^|)(#(\w*))([\s.!()/]|$)/g,'$1<a target="_blank" href="http://hashtags.org/tag/$3">$2</a>$4');
				tweet.text = tweet.text.replace(/(\s|^|)(#(\w*))([\s.!()/]|$)/g,'$1<a target="_blank" href="http://search.twitter.com/search?q=%23$3">$2</a>$4');
				// Markdown //
				tweet.text = Tweetbar.markDown.makeHtml(tweet.text);
				favorite = '';
				if ( tweet.favorited == true )
					favorite = '<a class="re" href="javascript: Tweetbar.unfav_tweet(\'' + tweet.id + '\'); void 0;" onmouseover="$(\'nav-label\').innerHTML = Tweetbar._(\'icon.delfav\'); " onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';"><img id="fav-' + tweet.id + '" class="re" src="chrome://twitkitplus/skin/images/fav_remove.png" alt="" /></a>';
				else
					favorite = '<a class="re" href="javascript: Tweetbar.fav_tweet(\'' + tweet.id + '\'); void 0;" onmouseover="$(\'nav-label\').innerHTML = Tweetbar._(\'icon.addfav\');" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';"><img id="fav-' + tweet.id + '" class="re" src="chrome://twitkitplus/skin/images/fav_add.png" alt="" /></a>';
				
				if ( tweet.truncated )
					tweet.text = tweet.text.replace(/\.\.\.$/, Tweetbar.anchor_tag(Tweetbar.protocol + '://twitter.com/' + tweet.user.screen_name + '/statuses/' + tweet.id, '...'));
				
				if ( tweet.in_reply_to_status_id ) {
					user_regexp = /@([a-zA-Z0-9_]+)/;
					user = user_regexp.exec(tweet.text)[1];
					in_reply_to = '<br> in reply to <a href="' + Tweetbar.protocol + '://twitter.com/' + user + '/statuses/' + tweet.in_reply_to_status_id + '/" target="_blank">' + tweet.in_reply_to_status_id + '</a>';
				} else if( tweet.reply_id ){
					user_regexp = /@([a-zA-Z0-9_]+)/;
					user = user_regexp.exec(tweet.text)[1];
					in_reply_to = '<br> in reply to <a href="' + Tweetbar.protocol + '://twitter.com/' + user + '/statuses/' + tweet.reply_id + '/" target="_blank">' + tweet.reply_id + '</a>';
				} else {
					in_reply_to = '';
				}
				//icons
				link_reply = '<a class="re" href="#" onclick="setReply(\''+ tweet.user.screen_name + '\',\'' + tweet.id + '\'); return false;" onmouseover="$(\'nav-label\').innerHTML = Tweetbar._(\'icon.reply\');" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';"><img class="re" src="chrome://twitkitplus/skin/images/reply.png" alt="" /></a>';

				var img_match = '';
				img_match = tweet.text.match(/<img .*?>/);
				if(img_match != undefined && img_match.length != null){
					img_match = img_match.toSource().match(/(https?|ftp):\/\/[-_.!~*\'()a-zA-Z0-9;\/?:\@&=+\$,%#]+/); //'
					link_qt_text = tweet.text.replace(/<.*?>/g, "") + " " + img_match[0];
				}else{
					link_qt_text = tweet.text.replace(/<.*?>/g, "");
				}
				//tweetphoto
				reg_tweetphoto = new RegExp('http:\/\/TweetPhotoAPI\.com\/api\/TPAPI\.svc\/json\/imagefromurl.size.thumbnail&amp;url=http:\/\/tweetphoto\.com\/(.*[a-zA-Z0-9]+)', 'g');
				link_qt_text = link_qt_text.replace(reg_tweetphoto, 'http://tweetphoto.com/$1');
				//twitpic
				reg_twitpic = new RegExp('http:\/\/(www\.|)twitpic\.com\/show\/thumb\/([a-zA-Z0-9]+)([?()!).,\\s]|<|$)', 'g');
				link_qt_text = link_qt_text.replace(reg_twitpic, 'http://twitpic.com/$2$3');
				//movepic
				reg_movapic = new RegExp('http:\/\/image\.movapic\.com\/pic\/s_([a-zA-Z0-9]+).jpeg', 'g');
				link_qt_text = link_qt_text.replace(reg_movapic, 'http://movapic.com/pic/$1');
				//img.ly
				reg_imgly = new RegExp('http:\/\/img\.ly\/show\/mini\/([a-zA-Z0-9]+)', 'g');
				link_qt_text = link_qt_text.replace(reg_imgly, 'http://img.ly/$1');

				//yfrog
				reg_yfrog = new RegExp('http:\/\/yfrog\.com\/([a-zA-Z0-9]+).th.jpg', 'g');
				link_qt_text = link_qt_text.replace(reg_yfrog, 'http://yfrog.com/$1');

				link_qt = '<a class="re" href="#" onclick="setNonPublicRT(\''+ tweet.user.screen_name + '\',decodeURI(\'' + encodeURI(link_qt_text) + '\'),\'' + tweet.id + '\'); autofit(this); return false;" onmouseover="$(\'nav-label\').innerHTML = Tweetbar._(\'icon.nonpubQT\');" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';"><img class="re" src="chrome://twitkitplus/skin/images/qt.png" alt="" /></a>';
				link_qtp = '<a class="re" href="#" onclick="setQT(\''+ tweet.user.screen_name + '\',decodeURI(\'' + encodeURI(link_qt_text) + '\'),\'' + tweet.id + '\'); autofit(this); return false;" onmouseover="$(\'nav-label\').innerHTML = Tweetbar._(\'icon.pubQT\');" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';"><img class="re" src="chrome://twitkitplus/skin/images/qtp.png" alt="" /></a>';
				link_rt = '<a class="re" href="#" onclick="if(confirm(\'Twitkit\+ : \\n want to retweet?\')){Tweetbar.send_retweet(\'retweet\',' + tweet.id + ');} return false;"><img class="re" src="chrome://twitkitplus/skin/images/rt.png" onmouseover="$(\'nav-label\').innerHTML = Tweetbar._(\'icon.pubRT\');" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';" alt="" /></a>';


				link_follow = '<a class="re" href="javascript: Tweetbar.follow_user(\'' + tweet.user.screen_name + '\'); void 0;" onmouseover="$(\'nav-label\').innerHTML = \'follow\';" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';"><img class="re" src="chrome://twitkitplus/skin/images/follow.png" /></a>';

				link_unfollow = '<a class="re" href="javascript: Tweetbar.unfollow_user(\'' + tweet.user.screen_name + '\'); void 0;" onmouseover="$(\'nav-label\').innerHTML = \'unfollow\';" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';"><img class="re" src="chrome://twitkitplus/skin/images/unfollow.png" alt="" /></a>';

				link_userinfo = '<a href="#" onclick="Tweetbar.activate_panel(\'me\',this,\'' + tweet.user.screen_name + '\'); void 0;" onmouseover="$(\'nav-label\').innerHTML = Tweetbar._(\'tabs.me.title\');" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';"><img class="re" src="chrome://twitkitplus/skin/tabs/me.png" width=10 height=10 /></a>';

				var link_geo =''
				if(tweet.geo_type){
					link_geo = '<a href="http://maps.google.com/maps?z=16&q=' + tweet.geo_coordinates + '" target="_blank" ><img class="re" src="chrome://twitkitplus/skin/images/geo.png" width=10 height=10 onmouseover="$(\'nav-label\').innerHTML = \'To Google Map\';" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';" /></a>';
				}
				
				//set text
				var view_text = tweet.text;
				var link_retweeter = ''
				if(tweet.rtuser){
					view_text = '<img class="re" src="chrome://twitkitplus/skin/images/rttext.png" alt="" /> ' + view_text;
					link_retweeter = 'Retweeted by ' + this.user_anchor_tag(tweet.rtuser);
				}
				if(tweet.user.protected){
					view_text = '<img class="re" src="chrome://twitkitplus/skin/images/protect.png" alt="" onmouseover="$(\'nav-label\').innerHTML = Tweetbar._(\'icon.unpublic\');" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';" /> ' + view_text ;
				}
				//convert \n
				view_text = view_text.replace(/\n/g, '<br/>');

				
                link_debug = '';
				//link_debug = '<a class="re" href="#" onclick = "var hohoge = \'' + escape(tweet.toSource().replace(/,/g, "\n").replace(/\\/g, "%")) + '\'; alert(unescape((unescape(hohoge))));" onmouseover="$(\'nav-label\').innerHTML = \'debug.info.decoded\';" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';"><img class="re" src="chrome://twitkitplus/skin/images/debug.png" alt="" /></a>&nbsp;<a class="re" href="#" onclick = "var hohoge = \'' + escape(tweet.toSource().replace(/,/g, "\n")) + '\'; alert(unescape((unescape(hohoge))));" onmouseover="$(\'nav-label\').innerHTML = \'debug.info\';" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';"><img class="re" src="chrome://twitkitplus/skin/images/debug.png" alt="" /></a>';
				var tsource = tweet.source.replace(/<a /, '<a target="_blank" ');
				link_icon = link_geo
				          + '&nbsp;' + link_reply 
				          + '&nbsp;' + link_qt 
				          + '&nbsp;' + link_qtp 
				          + '&nbsp;' + link_rt 
				          + '&nbsp;' + favorite 
				          + '&nbsp;' + link_userinfo 
				          + '&nbsp;' + link_follow 
				          + '&nbsp;' + link_unfollow ;
				
				( Tweetbar.prefService.getBoolPref('showAppSource') ) ? source = '<div class="source">' + link_icon + '&nbsp;' + this._('misc.from') + ' ' + tsource +  '&nbsp;'  +  '</div>' : source = '<div class="source">' + link_icon +  '</div>';
				return '<p class="pic">' + link_reply_with_pic + link_debug + '</p>' 
					   + '<p class="what">' + view_text + '</p>' 
					   + '<p class="who">' + this.user_anchor_tag(tweet.user) + date + in_reply_to + '</p>' 
					   + '<p class="who">' + link_retweeter + '</p>' 
					   + source + dellink;
			}
			return null;
		},
	/**
	 * Render a direct message (but don't print it).
	 * 
	 * @param {Object} tweet A tweet object returned by Tweetbar#create_status_object.
	 * @param {Object} li A MooTools Element object of a 'li' element.
	 * @returns {String} Fully-rendered tweet HTML.
	 * @see Tweetbar#create_status_object
	 * @methodOf Tweetbar
	 * @since 1.2
	 */
	render_direct_message:
		function (tweet, li) {
			var display_date = '';
			if ( tweet ) {
				if ( !tweet._a )
					tweet._a = true;
				else if ( !tweet._b )
					tweet._b = true;
				if ( this.currentList != 'direct_messages' )
					li.setProperty('id', tweet.id);
				
				var sender_image = '';
				if ( tweet.sender && tweet.sender.profile_image_url )
					sender_image = '<img src="' + tweet.sender.profile_image_url + '" width="24" height="24" alt="' + tweet.sender.name + '" />';
				
				( this.currentList == 'direct_messages' ) ? date = '' : date = ' - ' + Tweetbar.relative_time_string(tweet.created_at);
				
				/*
				 * Hashtags implementation - by Joschi
				 */
				tweet.text = tweet.text.replace(/(\s|^|)(#(\w*))([\s.!()/]|$)/g,'$1<a target="_blank" href="http://search.twitter.com/search?q=%23$3">$2</a>$4');

				// Markdown //
				tweet.text = Tweetbar.markDown.makeHtml(tweet.text);
				
				//icons
				link_dm = '<a class="re" href="#" onclick="setReplyDM(\''+ tweet.sender.screen_name + '\'); return false;"><img class="re" src="chrome://twitkitplus/skin/images/reply.png" alt="" /></a>';
				link_reply_with_pic = '<a href="#" onclick="setReplyDM(\'' + tweet.sender.screen_name + '\');">'+ sender_image + '</a>';
				link_follow = '<a class="re" href="javascript: Tweetbar.follow_user(\'' + tweet.sender.screen_name + '\'); void 0;" onmouseover="$(\'nav-label\').innerHTML = \'follow\';" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';"><img class="re" src="chrome://twitkitplus/skin/images/follow.png" /></a>';
				link_unfollow = '<a class="re" href="javascript: Tweetbar.unfollow_user(\'' + tweet.sender.screen_name + '\'); void 0;" onmouseover="$(\'nav-label\').innerHTML = \'unfollow\';" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';"><img class="re" src="chrome://twitkitplus/skin/images/unfollow.png" alt="" /></a>';
				link_userinfo = '<a href="#" onclick="Tweetbar.activate_panel(\'me\',this,\'' + tweet.sender.screen_name + '\'); void 0;" onmouseover="$(\'nav-label\').innerHTML = Tweetbar._(\'tabs.me.title\');" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';"><img class="re" src="chrome://twitkitplus/skin/tabs/me.png" width=10 height=10 /></a>';

                link_debug = '';
				//link_debug = '<a class="re" href="#" onclick = "var hohoge = \'' + escape(tweet.toSource().replace(/,/g, "\n").replace(/\\/g, "%")) + '\'; alert(unescape((unescape(hohoge))));" onmouseover="$(\'nav-label\').innerHTML = \'debug.info.decoded\';" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';"><img class="re" src="chrome://twitkitplus/skin/images/debug.png" alt="" /></a>&nbsp;<a class="re" href="#" onclick = "var hohoge = \'' + escape(tweet.toSource().replace(/,/g, "\n")) + '\'; alert(unescape((unescape(hohoge))));" onmouseover="$(\'nav-label\').innerHTML = \'debug.info\';" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';"><img class="re" src="chrome://twitkitplus/skin/images/debug.png" alt="" /></a>';
				link_icon = link_dm + '&nbsp;' + link_userinfo + '&nbsp;' + link_follow + '&nbsp;' + link_unfollow ;

				return '<p class="pic">' + link_reply_with_pic +  link_debug + '</p>' +
					   '<p class="what">' + tweet.text + '</p>' +
					   '<p class="who">' + this.user_anchor_tag(tweet.sender) + date + '</p>' + 
					   '<div class="source">' + link_icon + '</div>';


//				return '<p class="pic"><a href="#" onclick="setReplyDM(\'' + tweet.sender.screen_name + '\');">'+ sender_image + '</a>' +
//					   '<span class="re"><a class="re" href="#" onclick="setReplyDM(\''+ tweet.sender.screen_name + '\'); return false;"><img class="re" src="chrome://twitkitplus/skin/images/reply.png" alt="" /></a>&nbsp;' + '</span></p>' +
//					   '<p class="what">' + tweet.text + '</p>' +
//					   '<p class="who">' + this.user_anchor_tag(tweet.sender) + date + '</p>';
			}
			return null;
		},
	/**
	 * Render a user (but don't print it).
	 * 
	 * @param {Object} user A user object returned by Tweetbar#create_user_object.
	 * @returns {String} Fully-rendered user HTML.
	 * @see Tweetbar#create_user_object
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	render_user:
		function (user) {
			if(user.status != undefined){
				status = user.status.text;
				if ( user.protected == true ) {
					status = '<em>' + this._('tabs.friends.protected') + '</em>';
				} else {
					/*
					 * Hashtags implementation - by Joschi
					 */
					status = Tweetbar.expand_status(status);
					status = status.replace(/(#(\w*))/g,'<a target="_blank" href="http://search.twitter.com/search?q=%23$2">$1</a>');
				}			
			}else{
				status = '';
			}
			link_follow = '<a class="re" href="javascript: Tweetbar.follow_user(\'' + user.screen_name + '\'); void 0;" onmouseover="$(\'nav-label\').innerHTML = \'follow\';" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';"><img class="re" src="chrome://twitkitplus/skin/images/follow.png" /></a>';
			link_unfollow = '<a class="re" href="javascript: Tweetbar.unfollow_user(\'' + user.screen_name + '\'); void 0;" onmouseover="$(\'nav-label\').innerHTML = \'unfollow\';" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';"><img class="re" src="chrome://twitkitplus/skin/images/unfollow.png" alt="" /></a>';
			link_userinfo = '<a href="#" onclick="Tweetbar.activate_panel(\'me\',this,\'' + user.screen_name + '\'); void 0;" onmouseover="$(\'nav-label\').innerHTML = Tweetbar._(\'tabs.me.title\');" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';"><img class="re" src="chrome://twitkitplus/skin/tabs/me.png" width=10 height=10 /></a>';

    
			return '<p class="pic"><a href="#" onclick="setReply(\'' + user.screen_name + '\');"><img src="' + user.profile_image_url + '" width="24" height="24" alt="' + user.name + '" /></a>' +
				   '<p class="what" style="font-size: 120%;">' + user.name + '</p>' +
				   '<p class="who">' + status + '<br/>' +
				   '<a target="_blank" href="' + Tweetbar.protocol + '://twitter.com/' + user.screen_name + '">' + user.screen_name + '</a>' + '&nbsp;' + link_follow + '&nbsp;' + link_unfollow + '&nbsp;' + link_userinfo + '</p>';
		},
	/**
	 * Update the current list of tweets (print it).
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	get_list:
		function (screen_name) {
			//getList

			var li = new Element('li');
			var temp_select_list = '<select name="example" onchange="Tweetbar.select_list(this.options[this.selectedIndex].value);">';
			temp_select_list += '<option value="default">Select List</option>';
			temp_select_list += '<option value="favorite">My Favorites</option>';
			//searchList
			try{
				temp_findtext = Tweetbar.prefService.getCharPref('findText').split("\n");
				var unicodeConverter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
	                          .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
				unicodeConverter.charset = "UTF-8";
				for(i=0;i<temp_findtext.length;i++){
					//alert(temp_findtext[i]);
					if(temp_findtext[i].length>0){

						temp_select_list += '<option value="search/' + encodeURI(unicodeConverter.ConvertToUnicode( temp_findtext[i] )).replace(/#/g,"%23")
						                  + '">search/' + unicodeConverter.ConvertToUnicode( temp_findtext[i] ) + '</option>';
					}
				}
			}catch(e){
			};
			
			
			var listname = Tweetbar.prefService.getCharPref('list_lastname');
			if(listname.match(/^search.*/)){
				temp_select_list += '<option value="' + listname + '">' + decodeURI(listname) + '&nbsp&nbsp</option>';
			}

			screen_name = Tweetbar.username;
			var url = Tweetbar.api2_url_for_statuses('lists','',screen_name);
			var aj = new Ajax( url, {
				headers: Tweetbar.http_headers(),
				method: 'get',
				postBody: {},
				onComplete:
					function (raw_data) {
						Tweetbar.hide_refresh_activity();
						//Tweetbar.set_updater();
					},
				onSuccess:
					function (raw_data) {
//					//インポートする
//					// Component.utils.import("resource://gre/modules/JSON.jsm");
//					//オブジェクトからJSON文字列を得る
//					 var jsonString = JSON.stringify( raw_data );
//					//JSON文字列からオブジェクトを得る
//					var rsp = JSON.parse(raw_data);
					if (typeof JSON == "undefined"){ 
						Components.utils.import("resource://gre/modules/JSON.jsm");
					}
					if (typeof JSON.parse == "undefined"){ 
						rsp = JSON.fromString(raw_data);
					}else{
						rsp = JSON.parse(raw_data);
					}

			//delete code by @tokisaba

//文字列をパースしてオブジェクト取得	JSON.fromString()	JSON.parse()
//JavascriptオブジェクトをJSON文字列を生成	JSON.toString()	JSON.stringify()
						for ( var i=0;i<rsp.lists.length;i++ ) {
							temp_select_list += '<option value="' + rsp.lists[i].uri + '">&nbsp' + rsp.lists[i].uri + '&nbsp&nbsp</option>';
						}

						var url = Tweetbar.api2_url_for_statuses('subscriptions','',screen_name+'/lists');
						var aj2 = new Ajax( url, {
							headers: Tweetbar.http_headers(),
							method: 'get',
							postBody: {},
							onComplete:
								function (raw_data) {
									Tweetbar.hide_refresh_activity();
									//Tweetbar.set_updater();
								},
							onSuccess:
								function (raw_data) {
									if (typeof JSON == "undefined"){ 
										Components.utils.import("resource://gre/modules/JSON.jsm");
									}
									if (typeof JSON.parse == "undefined"){ 
										rsp = JSON.fromString(raw_data);
									}else{
										rsp = JSON.parse(raw_data);
									}

//									var rsp = JSON.parse(raw_data);
									for ( i=0;i<rsp.lists.length;i++ ) {
										temp_select_list += '<option value="' + rsp.lists[i].uri + '">&nbsp' + rsp.lists[i].uri + '&nbsp&nbsp</option>'
									}
									temp_select_list += '</select>'
									li.setHTML(temp_select_list);
									li.injectInside('tweetsheader');
								},
							onFailure:
								function (e) {
									Tweetbar.hide_refresh_activity();
									//Tweetbar.set_updater();
								},
							onRequest:
								function () {
									Tweetbar.show_refresh_activity();
									//Tweetbar.clear_updater();
								}
						}).request();
					},
				onFailure:
					function (e) {
						Tweetbar.hide_refresh_activity();
						//Tweetbar.set_updater();
					},
				onRequest:
					function () {
						Tweetbar.show_refresh_activity();
						//Tweetbar.clear_updater();
					}
			}).request();
			



		},

	/**
	 * Update the current list of tweets (print it).
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	update_current_list_public:
		function (screen_name,mode,maxid,raw_data) {
			if(mode!='add' && mode!='addlist'){
				$('tweets').setHTML('');
			}else if(mode == undefined){
				$('tweets').setHTML('');
			}
			var max_tweet_id = 0;
			var listname = Tweetbar.prefService.getCharPref('list_lastname');
			var current_tweets = '';
			if(listname.match(/^search.*/)){
				if (typeof JSON == "undefined"){ 
					Components.utils.import("resource://gre/modules/JSON.jsm");
				}
				if (typeof JSON.parse == "undefined"){ 
					current_tweets = JSON.fromString(raw_data).results;
				}else{
					current_tweets = JSON.parse(raw_data).results;
				}
//				current_tweets = JSON.parse(raw_data).results;
			}else{
				if (typeof JSON == "undefined"){ 
					Components.utils.import("resource://gre/modules/JSON.jsm");
				}
				if (typeof JSON.parse == "undefined"){ 
					current_tweets = JSON.fromString(raw_data);
				}else{
					current_tweets = JSON.parse(raw_data);
				}
			}

			for ( var i=0; i < current_tweets.length; i++ ) {

				var temp_tweet = {};
				if((mode == 'add' || mode == 'addlist') && i == 0){
					i++;
				}

				// set geo status
	 			var geo_type        = '';
                var geo_coordinates = '';
	 			if(current_tweets[i].geo){
	 				geo_type        = current_tweets[i].geo.type;
                	geo_coordinates = current_tweets[i].geo.coordinates;
	 			}

				// set status
				if(listname.match(/^search.*/)){

		 			temp_tweet= { 
		 				 '_a':                   '' 
		 				,'_b':                   ''
		 				,'id':                   parseInt(current_tweets[i].id)
		 				,'user':{'profile_image_url': current_tweets[i].profile_image_url
				 				,'protected':         current_tweets[i].protected
		 						,'name':              current_tweets[i].from_user
		 						,'screen_name':       current_tweets[i].from_user }
		 				,'created_at':           Date.parse(current_tweets[i].created_at || Date())
		 				,'text':                 Tweetbar.expand_status(current_tweets[i].text)
		 				,'favorited':            ''
		 				,'in_reply_to_status_id':''
		 				,'reply_id':             ''
		 				,'source':               Tweetbar.htmlspecialchars_decode(current_tweets[i].source)
		 				,'geo_type':             geo_type
		 				,'geo_coordinates':      geo_coordinates
		 			};
		 		}else{
		 			if(current_tweets[i].retweeted_status){
			 			temp_tweet= { 
			 				 '_a':                   '' 
			 				,'_b':                   ''
			 				,'id':                   parseInt(current_tweets[i].retweeted_status.id)
			 				,'user':{'profile_image_url': current_tweets[i].retweeted_status.user.profile_image_url
			 						,'protected':         current_tweets[i].retweeted_status.user.protected
			 						,'name':              current_tweets[i].retweeted_status.user.name
			 						,'screen_name':       current_tweets[i].retweeted_status.user.screen_name }
			 				,'created_at':           Date.parse(current_tweets[i].retweeted_status.created_at || Date())
			 				,'text':                 Tweetbar.expand_status(current_tweets[i].retweeted_status.text)
			 				,'favorited':            current_tweets[i].retweeted_status.favorited
			 				,'in_reply_to_status_id':current_tweets[i].retweeted_status.in_reply_to_status_id
			 				,'in_reply_to_user_id':  parseInt(current_tweets[i].retweeted_status.in_reply_to_user_id)
			 				,'reply_id':             ''
			 				,'source':                   current_tweets[i].retweeted_status.source
			 				,'rtuser':{'profile_image_url': current_tweets[i].user.profile_image_url
			 						  ,'name':              current_tweets[i].user.name
			 						  ,'screen_name':       current_tweets[i].user.screen_name }
		 					,'geo_type':             geo_type
		 					,'geo_coordinates':      geo_coordinates
			 			}
		 			}else{
			 			temp_tweet= { 
			 				 '_a':                   '' 
			 				,'_b':                   ''
			 				,'id':                   parseInt(current_tweets[i].id)
			 				,'user':{'profile_image_url': current_tweets[i].user.profile_image_url
			 						,'protected':         current_tweets[i].user.protected
			 						,'name':              current_tweets[i].user.name
			 						,'screen_name':       current_tweets[i].user.screen_name }
			 				,'created_at':           Date.parse(current_tweets[i].created_at || Date())
			 				,'text':                 Tweetbar.expand_status(current_tweets[i].text)
			 				,'favorited':            current_tweets[i].favorited
			 				,'in_reply_to_status_id':current_tweets[i].in_reply_to_status_id
			 				,'in_reply_to_user_id':  parseInt(current_tweets[i].in_reply_to_user_id)
			 				,'reply_id':             ''
			 				,'source':                   current_tweets[i].source
		 					,'geo_type':             geo_type
		 					,'geo_coordinates':      geo_coordinates
			 			}
		 			}
		 		}
				var li = new Element('li');
				li.setHTML(this.render_tweet(temp_tweet, li));
				if ( ( i % 2 ) == 0 ){
					li.addClass('even');
				}
				if ( Tweetbar.username && temp_tweet.text.search('@' + Tweetbar.username) !== -1 ){
					li.addClass('reply');
				}
				if ( temp_tweet.user.protected){
					li.addClass('locked');
				}
				li.injectInside($('tweets'));
				max_tweet_id = temp_tweet.id;
			}
			var li = new Element('li');
			if(mode=='list' || mode=='addlist'){
				li.setHTML(Tweetbar.getMoreListStatus(max_tweet_id));
			}else{
				li.setHTML(Tweetbar.getMoreStatus(max_tweet_id));
			}
//			if(current_tweets.length==0){
//				li.setHTML('<p>no result</p>');
//			}
			li.injectInside($('tweets'));

		},
	/**
	 * Update the current list of tweets (print it).
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	update_current_list_friends:
		function (screen_name,mode,maxid) {
			( this.currentList == 'friends' ) ? theurl = Tweetbar.protocol + '://twitter.com/statuses/friends/' + this.username + '.json?lite=true' : theurl = Tweetbar.protocol + '://twitter.com/statuses/followers.json?lite=true';
			var aj = new Ajax( theurl, {
				headers: Tweetbar.http_headers(),
				method: 'get',
				postBody: {},
				onComplete:
					function (raw_data) {
						Tweetbar.hide_refresh_activity();
						Tweetbar.set_updater();
					},
				onSuccess:
					function (raw_data) {
            			if(mode==undefined){
            				$('tweets').setHTML('');
            			}
						if (typeof JSON == "undefined"){ 
							Components.utils.import("resource://gre/modules/JSON.jsm");
						}
						if (typeof JSON.parse == "undefined"){ 
							rsp = JSON.fromString(raw_data);
						}else{
							rsp = JSON.parse(raw_data);
						}
						var i = 0;
						for ( var user in rsp ) {
							if ( (rsp[user]['screen_name'] != undefined) && (rsp[user]['screen_name'] != 'forEach') ) {
								var li = new Element('li');
								li.setHTML(Tweetbar.render_user(rsp[user]));
								if ( ( i % 2 ) == 0 )
									li.addClass('even');
								li.injectInside('tweets');
								i++;
							}
						}
					},
        		onFailure:
        			function (e) {
        				Tweetbar.hide_refresh_activity();
        				Tweetbar.set_updater();
					    $('nav-label').setHTML('Request Failed.TwitterAPI may be down.');
        			},
				onRequest:
					function () {
						Tweetbar.show_refresh_activity();
						Tweetbar.clear_updater();
					}
			}).request();
		},
	/**
	 * Update the current list of tweets (print it).
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	update_current_list_replies:
		function (screen_name,mode,maxid) {
			if(maxid==undefined){
				maxid = '';
			}
			if ( this.currentList == 'replies' ) {
				var aj = new Ajax( Tweetbar.protocol + '://twitter.com/statuses/mentions.json' + maxid, {
					headers: Tweetbar.http_headers(),
					method: 'get',
					postBody: {},
					onComplete:
						function (raw_data) {
							Tweetbar.hide_refresh_activity();
							Tweetbar.set_updater();
						},
					onSuccess:
						function (raw_data) {
                			if(mode==undefined){
                				$('tweets').setHTML('');
                			}
							if (typeof JSON == "undefined"){ 
								Components.utils.import("resource://gre/modules/JSON.jsm");
							}
							if (typeof JSON.parse == "undefined"){ 
								rsp = JSON.fromString(raw_data);
							}else{
								rsp = JSON.parse(raw_data);
							}
							var max_tweet_id = 0;
            				for ( var i=0; i < rsp.length; i++ ) {
            					if(mode=='add' && i==0){
            						i++;
            					}
								var li = new Element('li');
								rsp[i].text = Tweetbar.expand_status(rsp[i].text);
								li.setHTML(Tweetbar.render_tweet(rsp[i]));
								if ( ( i % 2 ) == 0 ){
									li.addClass('even');
								}
								li.injectInside('tweets');
                                max_tweet_id = rsp[i].id;
							}
				            var li = new Element('li');
							li.setHTML(Tweetbar.getMoreStatus(max_tweet_id));
				            li.injectInside($('tweets'));
						},
        			onFailure:
        				function (e) {
        					Tweetbar.hide_refresh_activity();
        					Tweetbar.set_updater();
    					    $('nav-label').setHTML('Request Failed.TwitterAPI may be down.');
        				},
					onRequest:
						function () {
							Tweetbar.show_refresh_activity();
							Tweetbar.clear_updater();
						}
				}).request();
			}
		},
	/**
	 * Update the current list of tweets (print it).
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	update_current_list_dm:
		function (screen_name,mode,maxid) {
			if(maxid==undefined){
				maxid = '';
			}
			if ( this.currentList == 'direct_messages' ) {
				var aj = new Ajax( Tweetbar.protocol + '://twitter.com/direct_messages.json' + maxid, {
					headers: Tweetbar.http_headers(),
					method: 'get',
					postBody: {},
					onComplete:
						function (raw_data) {
							Tweetbar.hide_refresh_activity();
							Tweetbar.set_updater();
						},
					onSuccess:
						function (raw_data) {
                			if(mode==undefined){
                				$('tweets').setHTML('');
                			}
							if (typeof JSON == "undefined"){ 
								Components.utils.import("resource://gre/modules/JSON.jsm");
							}
							if (typeof JSON.parse == "undefined"){ 
								rsp = JSON.fromString(raw_data);
							}else{
								rsp = JSON.parse(raw_data);
							}
							var max_tweet_id = 0;
            				for ( var i=0; i < rsp.length; i++ ) {
            					if(mode=='add' && i==0){
            						i++;
            					}
								var li = new Element('li');
								rsp[i].text = Tweetbar.expand_status(rsp[i].text);
								li.setHTML(Tweetbar.render_direct_message(rsp[i],li));
								if ( ( i % 2 ) == 0 ){
									li.addClass('even');
								}
								li.injectInside('tweets');
                                max_tweet_id = rsp[i].id;
							}
				            var li = new Element('li');
							li.setHTML(Tweetbar.getMoreStatus(max_tweet_id));
				            li.injectInside($('tweets'));
						},
        			onFailure:
        				function (e) {
        					Tweetbar.hide_refresh_activity();
        					Tweetbar.set_updater();
    					    $('nav-label').setHTML('Request Failed.TwitterAPI may be down.');
        				},
					onRequest:
						function () {
							Tweetbar.show_refresh_activity();
							Tweetbar.clear_updater();
						}
				}).request();
			}
		},
	/**
	 * Update the current list of tweets (print it).
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	update_current_list_me:
		function (screen_name,mode,maxid) {
			if ( this.currentList == 'me' ) {
			    if(!screen_name){
			        screen_name = this.username;
			    }
				var temp_inner = '';

				var aj = new Ajax( Tweetbar.protocol + '://twitter.com/users/show/' + screen_name + '.json', {
					headers: Tweetbar.http_headers(),
					method: 'get',
					postBody: {},
					onSuccess:
						function (raw_data) {
                			if(mode==undefined){
                				$('tweets').setHTML('');
                			}
							var tweets = $('tweets');
							if (typeof JSON == "undefined"){ 
								Components.utils.import("resource://gre/modules/JSON.jsm");
							}
							if (typeof JSON.parse == "undefined"){ 
								user = JSON.fromString(raw_data);
							}else{
								user = JSON.parse(raw_data);
							}

			            	link_follow = '<a class="re" href="javascript: Tweetbar.follow_user(\'' + screen_name + '\'); void 0;" onmouseover="$(\'nav-label\').innerHTML = \'follow\';" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';"><img class="re" src="chrome://twitkitplus/skin/images/follow.png" /></a>';
				            link_unfollow = '<a class="re" href="javascript: Tweetbar.unfollow_user(\'' + screen_name + '\'); void 0;" onmouseover="$(\'nav-label\').innerHTML = \'unfollow\';" onmouseout="$(\'nav-label\').innerHTML = \'&nbsp;\';"><img class="re" src="chrome://twitkitplus/skin/images/unfollow.png" alt="" /></a>';

							var inner = '<div style="padding-bottom: 10px;">' +
								'<img src="' + user.profile_image_url + '" alt="' + screen_name + '" style="float: right; width: 48px; height: 48px;" />' +
								'<div style="font-size: 110%;"><a href="' + Tweetbar.protocol + '://twitter.com/' + screen_name + '" target="_blank">'+ screen_name +'</a>&nbsp;' + link_follow + '&nbsp;' + link_unfollow +'</div>' +
								'<div style="font-size: 0.8em;">' +
								'<strong>' + Tweetbar._('tabs.me.location') + '</strong>: ' + user.location + '<br/>' +
								'<strong>' + Tweetbar._('tabs.me.bio') + '</strong>: ' + Tweetbar.expand_status(user.description) + '<br/>' +
								'<strong>' + Tweetbar._('tabs.me.friends') + '</strong>: ' + user.friends_count + '<br/>' +
								'<strong>' + Tweetbar._('tabs.me.followers') + '</strong>: ' + user.followers_count + '<br/>' +
								'<strong>' + Tweetbar._('tabs.me.favorites') + '</strong>: ' + user.favourites_count + '<br/>' +
								'<strong>' + Tweetbar._('tabs.me.updates') + '</strong>: ' + user.statuses_count + '</div>' +
								'</div>';
							tweets.setHTML(inner);
							var aj2 = new Ajax( Tweetbar.protocol + '://twitter.com/statuses/user_timeline.json?screen_name=' + screen_name , {
								headers: Tweetbar.http_headers(),
								method: 'get',
								postBody: {},
								onComplete:
									function (raw_data) {
										Tweetbar.hide_refresh_activity();
										Tweetbar.set_updater();
									},
								onSuccess:
									function (raw_data) {
										var tweets = $('tweets');
										if (typeof JSON == "undefined"){ 
											Components.utils.import("resource://gre/modules/JSON.jsm");
										}
										if (typeof JSON.parse == "undefined"){ 
											rsp = JSON.fromString(raw_data);
										}else{
											rsp = JSON.parse(raw_data);
										}
										var max_tweet_id = 0;
						    			for ( var i=0; i < rsp.length; i++ ) {
											var li = new Element('li');
											rsp[i].text = Tweetbar.expand_status(rsp[i].text);
											li.setHTML(Tweetbar.render_tweet(rsp[i]));
											//temp_inner += '<li>' + Tweetbar.render_tweet(rsp[i]) + '</li>';
											if ( ( i % 2 ) == 0 ){
												li.addClass('even');
											}
											li.injectInside($('tweets'));
						                    max_tweet_id = rsp[i].id;
										}
									},
        						onFailure:
        							function (e) {
        								Tweetbar.hide_refresh_activity();
        								Tweetbar.set_updater();
                					    $('nav-label').setHTML('Request Failed.TwitterAPI may be down.');
        							},
								onRequest:
									function () {
										Tweetbar.show_refresh_activity();
										Tweetbar.clear_updater();
									}
							}).request();

						}
				}).request();


			}
		},
	/**
	 * Retrieve tweets from Twitter.
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	get_tweets:
		function (screen_name) {
			var panel = Tweetbar.currentList;
			var url = Tweetbar.api_url_for_statuses(panel,'');
			switch (panel){
				case 'direct_messages':
					Tweetbar.update_current_list_dm(screen_name);
					break;
//					url = Tweetbar.api_url_for_nonstatuses(panel,'');
				case 'me':
					Tweetbar.update_current_list_me(screen_name);
					break;
				case 'friends':
				case 'followers':
					Tweetbar.update_current_list_friends(screen_name);
					break;
				case 'replies':
					Tweetbar.update_current_list_replies(screen_name);
					break;
				case 'public_timeline':
				case 'home_timeline':
				default:
					var aj = new Ajax( url, {
						headers: Tweetbar.http_headers(),
						method: 'GET',
						postBody: {},
						onComplete:
							function (raw_data) {
								Tweetbar.hide_refresh_activity();
								Tweetbar.set_updater();
							},
						onSuccess:
							function (raw_data,xml) {
								//Tweetbar.save_tweets(panel, raw_data);
								Tweetbar.update_current_list_public(screen_name,'','',raw_data);
							},
						onFailure:
							function (e) {
								Tweetbar.hide_refresh_activity();
								Tweetbar.set_updater();
        					    $('nav-label').setHTML('Request Failed.TwitterAPI may be down.');
                                Tweetbar.showApiLimit();
							},
						onRequest:
							function () {
								Tweetbar.show_refresh_activity();
								Tweetbar.clear_updater();
							}
					}).request();

			} 
		},
	/**
	 * Retrieve tweets from Twitter.
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	get_more_tweets:
		function (maxid,count) {
			//alert(maxid);
			if(count == undefined){
				get_tweet_count = 20;
			}else{
				get_tweet_count = count;
			}
			var panel = Tweetbar.currentList;
			var url = Tweetbar.api_url_for_statuses(panel,'?max_id=' + maxid,get_tweet_count);
			switch (panel){
				case 'direct_messages':
					Tweetbar.update_current_list_dm('','add','?max_id=' + maxid);
					break;
//					url = Tweetbar.api_url_for_nonstatuses(panel,'');
				case 'me':
					Tweetbar.update_current_list_me('','add',maxid);
					break;
				case 'friends':
				case 'followers':
					Tweetbar.update_current_list_friends('','add',maxid);
					break;
				case 'replies':
					Tweetbar.update_current_list_replies('','add','?max_id=' + maxid);
					break;
				case 'public_timeline':
				case 'home_timeline':
				default:
					var aj = new Ajax( url, {
						headers: Tweetbar.http_headers(),
						method: 'get',
						postBody: {},
						onComplete:
							function (raw_data) {
								Tweetbar.hide_refresh_activity();
								Tweetbar.set_updater();
							},
						onSuccess:
							function (raw_data) {
								//Tweetbar.save_tweets(panel, raw_data);
								Tweetbar.update_current_list_public('','add',maxid,raw_data);
							},
						onFailure:
							function (e) {
								Tweetbar.hide_refresh_activity();
								Tweetbar.set_updater();
        					    $('nav-label').setHTML('Request Failed.TwitterAPI may be down..');
                                Tweetbar.showApiLimit();
							},
						onRequest:
							function () {
								Tweetbar.show_refresh_activity();
								Tweetbar.clear_updater();
							}
					}).request();
			} 
		},
	/**
	 * Retrieve tweets from Twitter.
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	get_list_tweets:
		function (maxid,count) {
			var listname = Tweetbar.prefService.getCharPref('list_lastname');
			//var search_page = Tweetbar.prefService.getCharPref('search_lastapage');
			var panel = Tweetbar.currentList;
			var temp_listname = listname.split("/");
			var url = '';
			var addparam = '';
			if(maxid == undefined){
				if(temp_listname[0]=='search'){
	            	addparam = '&rpp=50&page=1 ';
					$('tweetsheader').setHTML('');
	            	Tweetbar.get_list();
				}else{
					addparam = '';
				}
			}else{
				if(temp_listname[0]=='search'){
	            	addparam = '&rpp=50&page=1';
				}else{
	            	addparam = '?max_id=' + maxid + '&count='+ count;
				}
			}
			if(temp_listname[0]=='favorite'){
				url = Tweetbar.api_url_for_nonstatuses('favorites/'+Tweetbar.username ,addparam);
			}else if(temp_listname[0]=='search'){
				url = Tweetbar.api_url_for_search('search' ,'?q=' + temp_listname[1] + addparam);
			}else{
				url = Tweetbar.api2_url_for_statuses('statuses',addparam,temp_listname[1] + '/lists/' + temp_listname[2]);
			}
			var aj = new Ajax( url, {
				headers: Tweetbar.http_headers(),
				method: 'get',
				postBody: {},
				onComplete:
					function (raw_data) {
						Tweetbar.hide_refresh_activity();
						Tweetbar.set_updater('list');
					},
				onSuccess:
					function (raw_data) {
						//Tweetbar.save_tweets(panel, raw_data);
						switch (panel){
							case 'home_timeline':
							    if(maxid == undefined){
	    							Tweetbar.update_current_list_public('','list','',raw_data);
                                }else{
    								Tweetbar.update_current_list_public('','addlist',maxid,raw_data);
							    }
								break;
							case 'me':
								Tweetbar.update_current_list_me();
								break;
							default:
								Tweetbar.update_current_list_public('','','',raw_data);
						} 
//						Tweetbar.update_current_list();
					},
				onFailure:
					function (e) {
						Tweetbar.hide_refresh_activity();
						Tweetbar.set_updater('list');
					    $('nav-label').setHTML('Request Failed.TwitterAPI may be down...');
                        Tweetbar.showApiLimit();
					},
				onRequest:
					function () {
						Tweetbar.show_refresh_activity();
						Tweetbar.clear_updater();
					}
			}).request();
		},

	/**
	 * Save the fresh tweets to the current panel's registry.
	 * 
	 * @param {String} panel The name of the current panel.
	 * @param {Object} response_data Raw JSON response data from a Twitter API request.
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	save_tweets:
		function (panel, response_data) {
//			var new_tweets = JSON.parse(response_data);

			if (typeof JSON == "undefined"){ 
				Components.utils.import("resource://gre/modules/JSON.jsm");
			}
			if (typeof JSON.parse == "undefined"){ 
				new_tweets = JSON.fromString(response_data);
			}else{
				new_tweets = JSON.parse(response_data);
			}
			this.tweets[panel] = {};
			for ( var i = 0; i < new_tweets.length; i++ ) {
				if ( new_tweets[i].user) {
					var status = Tweetbar.create_status_object(new_tweets[i]);
					if ( !this.tweets[panel][status.id] ) {
						this.tweets[panel][status.id] = status;
						this.tweets[panel][status.id].user = Tweetbar.create_user_object(new_tweets[i].user);
					}
				} else {
					var user = Tweetbar.create_user_object(new_tweets[i]);
					if(user.screen_name != undefined){
						var name_key = user.screen_name.toLowerCase();
						if(new_tweets[i].statuses_count > 0 && new_tweets[i].status != undefined){
							var status = Tweetbar.create_status_object(new_tweets[i].status);
							if ( !this.tweets[panel][name_key] || ( this.tweets[panel][name_key].status.id != status.id ) ) {
								this.tweets[panel][name_key] = status;
								this.tweets[panel][name_key].user = user;
							}
						}
					}
				}
			}
		},
	
	// Refresh //
	/**
	 * Show the refresher label and icon.
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	show_refresh_activity:
		function () {
			$('refresh_activity').setStyle('display', 'block');
			//$('refreshing').setStyle('display', 'inline');
		},
	/**
	 * Hide the refresher label and icon.
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	hide_refresh_activity:
		function () {
			$('refresh_activity').setStyle('display', 'none');
			//$('refreshing').setStyle('display', 'none');
		},

	/**
	 * Hide the refresher label and icon.
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	hide_tr_topper:
		function () {
			if(window.getComputedStyle(document.getElementById('tr_topper'),'').display!='none'){
				$('tr_topper').setStyle('display', 'none');
				window.resizeTo(window.outerWidth,window.outerHeight+1);
				window.resizeTo(window.outerWidth,window.outerHeight-1);
			}
		},
	/**
	 * Hide the refresher label and icon.
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	show_tr_topper:
		function () {
			if(window.getComputedStyle(document.getElementById('tr_topper'),'').display=='none'){
				$('tr_topper').setStyle('display', '');
				window.resizeTo(window.outerWidth,window.outerHeight+1);
				window.resizeTo(window.outerWidth,window.outerHeight-1);
			}
		},
	/**
	 * Stop periodical updates.
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	clear_updater:
		function () {
			if ( this.updater )
				$clear(this.updater);
		},
	/**
	 * Reset (or start for the first time) periodical updates.
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	set_updater:
		function (mode) {
			this.clear_updater();
			var interval = Tweetbar.prefService.getIntPref('refreshInterval');
			var up_int = parseInt(interval);
			if(mode=='list'){
				this.updater = this.get_list_tweets.periodical(up_int);
			}else{
				this.updater = this.get_tweets.periodical(up_int);
			}
		},
	/**
	 * Refresh the current panel, regardless of the periodical updater. Used when user manually clicks 'refresh'.
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	manual_refresh:
		function (screen_name) {
			this.clear_updater();
			var listname = Tweetbar.prefService.getCharPref('list_lastname');
			if(listname !='default'){
			    this.get_list_tweets(screen_name);
				this.set_updater('list');
			}else{
			    this.get_tweets(screen_name);
			    this.set_updater();
			}

		},

	/**
	 * Refresh the current panel, regardless of the periodical updater. Used when user manually clicks 'refresh'.
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	select_list:
		function (listname) {
			this.clear_updater();
			Tweetbar.prefService.setCharPref('list_lastname',listname);
			if(listname=='default'){
				this.manual_refresh();
				this.set_updater();
			}else{
				this.get_list_tweets();
				this.set_updater('list');
			}

		},	
	// Tweet Actions //	

	/**
	 * Follow user.
	 * 
	 * @param {String} tweetid The ID of the tweet to add to favorites.
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	follow_user:
		function (username) {
			var aj = new Ajax( Tweetbar.protocol + '://twitter.com/friendships/create/' + username + '.json', {
				headers: Tweetbar.http_headers(),
				postBody: {},
				onSuccess:
					function () {
						alert('new follow Success:' + username);
					    //no action
					},
				onFailure:
					function (e) {
						alert(this._('errors.ajax') + e);
					}
			}).request();
		},
	/**
	 * unFollow user.
	 * 
	 * @param {String} tweetid The ID of the tweet to add to favorites.
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	unfollow_user:
		function (username) {
			if(confirm('wand to unfollow?')){
				var aj = new Ajax( Tweetbar.protocol + '://twitter.com/friendships/destroy/' + username + '.json', {
					headers: Tweetbar.http_headers(),
					postBody: {},
					onSuccess:
						function () {
							alert('unfollow Success:' + username);
						},
					onFailure:
						function (e) {
							alert(this._('errors.ajax') + e);
						}
				}).request();
			}
		},		
	/**
	 * Add a tweet to the user's favorites.
	 * 
	 * @param {String} tweetid The ID of the tweet to add to favorites.
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	fav_tweet:
		function (tweetid) {
			var aj = new Ajax( Tweetbar.protocol + '://twitter.com/favorites/create/' + tweetid + '.json', {
				headers: Tweetbar.http_headers(),
				postBody: {},
				onSuccess:
					function () {
						var x = document.getElementById('fav-' + tweetid);
						x.src = 'chrome://twitkitplus/skin/images/fav_remove.png';
					},
				onFailure:
					function (e) {
						alert(this._('errors.ajax') + e);
					}
			}).request();
		},
	/**
	 * Remove a tweet from the user's favorites.
	 * 
	 * @param {String} tweetid The ID of the tweet to remove from favorites.
	 * @methodOf Tweetbar
	 * @since 1.1
	 */
	unfav_tweet:
		function (tweetid) {
			var aj = new Ajax( Tweetbar.protocol + '://twitter.com/favorites/destroy/' + tweetid + '.json', {
				headers: Tweetbar.http_headers(),
				postBody: {},
				onSuccess:
					function () {
						var x = document.getElementById('fav-' + tweetid);
						x.src = 'chrome://twitkitplus/skin/images/fav_add.png';
					},
				onFailure:
					function (e) {
						alert(this._('errors.ajax') + e);
					}
			}).request();
		},
	/**
	 * Delete one of the user's tweets.
	 * 
	 * @param {String} tweetid The ID of the tweet to delete. The user MUST own this tweet.
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	delete_tweet:
		function (tweetid) {
			var aj = new Ajax( Tweetbar.protocol + '://twitter.com/statuses/destroy/' + tweetid + '.json', {
				headers: Tweetbar.http_headers(),
				postBody: {},
				onSuccess:
					function () {
						delete Tweetbar.tweets[Tweetbar.currentList][tweetid];
						var slider = new Fx.Slide(tweetid);
						slider.toggle();
					},
				onFailure:
					function (e) {
						alert(this._('errors.ajax') + e);
				}
			}).request();
		},
	/**
	 * Umbrella function for updating the user's status -
	 * does some authentication checking and then runs the
	 * actual update function, Tweetbar#send_tweet.
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	update_status:
		function (status,replyid, callback) {
			if ( this.isAuthenticated )
				this.send_tweet(status,replyid, callback);
			else {
				this.authenticate('update');
				this.pendingUpdate = {callback: callback, status: status};
			}
		},
	/**
	 * Send a status update to Twitter.
	 * 
	 * @param {String} status Status to send to Twitter
	 * @param {Function} [callback=""] Function to run after the tweet is successfully sent
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	send_tweet:
		function (status,replyid, callback) {
			var aj = new Ajax( Tweetbar.api_url_for_statuses('update'), {
				headers: Tweetbar.http_headers(),
				postBody: Object.toQueryString({status: status,in_reply_to_status_id: replyid,source: 'twitkit'}),
				onComplete:
					function () {
						callback();
					},
				onSuccess:
					function (raw_data) {
						Tweetbar.save_tweets(this.currentList, raw_data);
						if ( Tweetbar.currentList == 'home_timeline' )
							setTimeout('Tweetbar.manual_refresh();', 1000);
					},
				onFailure:
					function (e) {
						alert(this._('errors.ajax') + e);
					}
			}).request();
		},

	send_retweet:
		function (status,statusid, callback) {
			var aj = new Ajax( Tweetbar.api2_url_for_statuses(status + '/' + statusid ), {
				headers: Tweetbar.http_headers(),
//				postBody: Object.toQueryString({status: status,in_reply_to_status_id: replyid,source: 'twitkit'}),
				postBody: {},
				onComplete:
					function () {
						callback();
					},
				onSuccess:
					function (raw_data) {
					    $('nav-label').setHTML('finish retweet!');
					},
				onFailure:
					function (e) {
						alert(this._('errors.ajax') + e);
					}
			}).request();
		},
	
	// Panel Functions //
	/**
	 * Switch to a new panel.
	 * 
	 * @param {String} name The name of the panel to switch to.
	 * @param {Object} [caller=""] A DOM object from where the function was called.
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	activate_panel:
		function (name, caller,screen_name) {
			if ( name == '' ){
				name = 'public_timeline';
			}
			if ( !this.authorization_required_for(name) || this.isAuthenticated ) {
				this.currentList = name;
				//this.update_current_list(screen_name);
				this.clear_current_tweets();
				
				$('tab_for_public_timeline').removeClass('active');
				$('tab_for_home_timeline').removeClass('active');
				$('tab_for_friends').removeClass('active');
				$('tab_for_followers').removeClass('active');
				$('tab_for_replies').removeClass('active');
				$('tab_for_direct_messages').removeClass('active');
				$('tab_for_me').removeClass('active');
				
				$('tab_for_'+ name).addClass('active');
				
				if ( caller )
					caller.blur();
				
				Tweetbar.prefService.setCharPref('active_panel', name);
				
				this.clear_updater();
				$('tweetsheader').setHTML('');
//2010/02/17(水)				$('tweets').setHTML('');
//-------------------------------- 保留。
//				if(Tweetbar.prefService.getCharPref('list_lastname')=='default' || name != 'home_timeline' ){
//					this.get_tweets(screen_name);
//				}else{
//					this.get_list_tweets();
//				}
//--------------------------------
				Tweetbar.prefService.setCharPref('list_lastname','default')
				this.get_tweets(screen_name);
//--------------------------------


				if(name=='home_timeline'){
					Tweetbar.get_list();
				}
				this.set_updater();
			} else {
				alert(this._('misc.needAuth'));
				this.authenticate(action);
			}
		},
	
	// Styling //
	/**
	 * Adjust the list of tweets to fit Firefox's current window size.
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	setListSize:
		function () {
			var h = Window.getHeight() -
					( $('topper').getSize()['size']['y'] +
					  $('navigation').getSize()['size']['y'] +
					  $('refresher').getSize()['size']['y']
					);
			h -= 20;
			$('lists').setStyle('overflow', 'auto');
			$('lists').setStyle('height', h+'px');
			var w = Window.getWidth() + 15;
			$('tweets').setStyle('max-width', w+'px');
		},
	
	// Docking //
	/**
	 * Undock TwitKit+.
	 * 
	 * @methodOf Tweetbar
	 * @since 1.1
	 */
	undock:
		function () {
			window.open('chrome://twitkitplus/content/twitkitplus.html?undocked', 'TwitKit+', 'width=300,resizable=yes,scrollbars=no,toolbar=no,location=no,directories=no,status=no,menubar=no,copyhistory=no');
			Tweetbar.DOMWindow.toggleSidebar('viewTweetbar');
		},
	
	// Authorization //
	/**
	 * Toggle the display of the login window.
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	toggle_login:
		function () {
			this.loginSlider.toggle();
		},
	/**
	 * Close the login window.
	 * 
	 * @param {Object} [obj=""] A DOM object from where the function was called.
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	close_login:
		function (obj) {
			this.loginSlider.slideOut();
			
			$('whoami').setHTML('<a href="#" class="signin" onclick="Tweetbar.open_login(this); return false;">' + this._('login.signIn') + '</a>');
			if ( obj )
				obj.blur();
			
			var x = document.getElementById('username');
			x.value = '';
			
			x = document.getElementById('password');
			x.value = '';
		},
	/**
	 * Open the login window.
	 * 
	 * @param {Object} [obj=""] A DOM object from where the function was called.
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	open_login:
		function (obj) {
			this.loginSlider.slideIn();
			
			$('whoami').setHTML('<a href="#" class="signin" onclick="Tweetbar.close_login(this); return false;">' + this._('login.close') + '</a>');
			if ( obj )
				obj.blur();

			$('username').focus();
		},
	/**
	 * Check if authorization is required to make a certain
	 * API request.
	 * 
	 * @param {String} resource The name of the API request.
	 * @return {Boolean}
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	authorization_required_for:
		function (resource) {
			if ( resource == 'public_timeline' )
				return false;
			return true;
		},
	/**
	 * Have the user log in, and then perform an action.
	 * 
	 * @param {String} action An action (API request) to perform.
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	authenticate:
		function (action) {
			this.open_login();
			this.pendingAction = action;
		},
	/**
	 * Sign out of the current Twitter account.
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	sign_out:
		function () {
			var aj = new Ajax( Tweetbar.protocol + '://twitter.com/account/end_session.json', {
				headers: Tweetbar.http_headers(),
				postBody: {},
				onSuccess:
					function () {
						this.username = null;
						this.password = null;
						Tweetbar.prefService.setCharPref('tkp_username', '');
						Tweetbar.prefService.setCharPref('tkp_password', '');
						this.isAuthenticated = false;
						Tweetbar.clear_http_headers();
						Tweetbar.clear_cookies();
						
						$('whoami').setHTML('<a href="#" class="signin" onclick="Tweetbar.open_login(this); return false;">' + Tweetbar._('login.signIn') + '</a>');
						$('whoami').setStyle('backgroundColor', '#75b7ba');
						$('loginwrap').setStyle('display', 'block');
						Tweetbar.loginSlider.hide();
						if ( Tweetbar.authorization_required_for(this.currentList) )
							Tweetbar.activate_panel('public_timeline');
					},
				onFailure:
					function () {
						alert(Tweetbar._('errors.signOut'));
						if(confirm('Want to delete login info?')){
							this.username = null;
							this.password = null;
							Tweetbar.prefService.setCharPref('tkp_username', '');
							Tweetbar.prefService.setCharPref('tkp_password', '');
							this.isAuthenticated = false;
							Tweetbar.clear_http_headers();
							Tweetbar.clear_cookies();
							
							$('whoami').setHTML('<a href="#" class="signin" onclick="Tweetbar.open_login(this); return false;">' + Tweetbar._('login.signIn') + '</a>');
							$('whoami').setStyle('backgroundColor', '#75b7ba');
							$('loginwrap').setStyle('display', 'block');
							Tweetbar.loginSlider.hide();
							if ( Tweetbar.authorization_required_for(this.currentList) )
								Tweetbar.activate_panel('public_timeline');
							
						}
					},
			}).request();
		},
	/**
	 * Sign in to a Twitter account.
	 * 
	 * @param {String} un Twitter username
	 * @param {String} pw Twitter password
	 * @param {Function} [callback=""] A function to call once the action has completed successfully.
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	sign_in:
		function (un, pw, callback) {
			this.username = un;
			this.password = pw;
			this.clear_http_headers();
			
			var aj = new Ajax( Tweetbar.protocol + '://twitter.com/account/verify_credentials', {
				headers: this.http_headers(),
				method: 'get',
				postBody: {},
//				onComplete:
				onSuccess:
					function (raw_data) {
						if ( this.transport.status == 200 ) {
							Tweetbar.isAuthenticated = true;
							Tweetbar.prefService.setCharPref('tkp_username', Tweetbar.username);
							Tweetbar.prefService.setCharPref('tkp_password', Tweetbar.password);
							Tweetbar.close_login();
							if ( Tweetbar.pendingAction ) {
								if ( Tweetbar.pendingAction == 'update' ) {
									Tweetbar.send_tweet(Tweetbar.pendingUpdate['status'],Tweetbar.pendingUpdate['replyid'], Tweetbar.pendingUpdate['callback']);
									Tweetbar.pendingAction = null;
									Tweetbar.pendingUpdate = null;
								} else {
									Tweetbar.activate_panel(Tweetbar.pendingAction);
									Tweetbar.pendingAction = null;
								}
							}
							Tweetbar.set_username_on_page();
							} else
								alert(this._('errors.signOut'));
							if ( callback ) {
								try { callback(); } catch(e) { };
						}
					},
			}).request();
		},
	showApiLimit:
		function () {

//			try{
//				var oXMLHttpRequest = new XMLHttpRequest;
//			}
//			catch(e){
//				var oXMLHttpRequest = new ActiveXObject('Msxml2.XMLHTTP');
//			}
//			oXMLHttpRequest.open('head','http://twitter.com/account/rate_limit_status.json',true);
//			oXMLHttpRequest.onreadystatechange = function(){
//				if (oXMLHttpRequest.readyState == 4){
//					alert(oXMLHttpRequest.getAllResponseHeaders());
//				}
//			}
//			oXMLHttpRequest.send('');

			var url = Tweetbar.api_url_for_nonstatuses('account/rate_limit_status','');
			var aj = new Ajax( url, {
				headers: Tweetbar.http_headers(),
				method: 'get',
				postBody: {},
				onComplete:
					function (raw_data) {
						Tweetbar.hide_refresh_activity();
					},
				onSuccess:
					function (raw_data) {
						Tweetbar.hide_refresh_activity();
						if (typeof JSON == "undefined"){ 
							Components.utils.import("resource://gre/modules/JSON.jsm");
						}
						if (typeof JSON.parse == "undefined"){ 
							rsp = JSON.fromString(raw_data);
						}else{
							rsp = JSON.parse(raw_data);
						}
						var message = 'Twitter API limit \n'
						             + '\n Max API hourly limit : ' 
						             + rsp.hourly_limit 
						             + '\n Until API hourly limit : ' 
						             + rsp.remaining_hits
									 + '\n API limit reset time(england):\n    ' 
						             + rsp.reset_time ;
						alert(message);
					},
				onFailure:
					function (e) {
						Tweetbar.hide_refresh_activity();
        			    $('nav-label').setHTML('Request Failed.TwitterAPI may be down.');
					},
				onRequest:
					function () {
						Tweetbar.show_refresh_activity();
					}
			}).request();
		},
	/**
	 * Show the current user's name and a sign-out button
	 * after signing in.
	 * 
	 * @methodOf Tweetbar
	 * @since 1.0
	 */
	set_username_on_page:
		function () {
			$('whoami').setStyle('backgroundColor', 'transparent');
			$('whoami').setHTML('<p><a href="' + Tweetbar.protocol + '://twitter.com/' + Tweetbar.username + '" target="_blank">'+Tweetbar.username+'</a> [<a href="#" onclick="Tweetbar.sign_out(); return false;" alt="sign out" title="sign out">' + this._('login.signOut') + '</a>]</p>');
			$('loginwrap').setStyle('display', 'none');
		},
	getMoreStatus:
		function(max_tweet_id){
			return '<p class="what"><img class="re" src="chrome://twitkitplus/skin/images/more.png" alt="" /> more [ <a href="javascript: Tweetbar.get_more_tweets(\'' + max_tweet_id + '\',20);">20</a> <a href="javascript: Tweetbar.get_more_tweets(\'' + max_tweet_id + '\',100);">100</a> <a href="javascript: Tweetbar.get_more_tweets(\'' + max_tweet_id + '\',200);">200</a>] tweets</p>';
		},
	getMoreListStatus:
		function(max_tweet_id){

			var listname = Tweetbar.prefService.getCharPref('list_lastname');

			return '<p class="what"><img class="re" src="chrome://twitkitplus/skin/images/more.png" alt="" /> more [ <a href="javascript: Tweetbar.get_list_tweets(\'' + max_tweet_id + '\',20);">20</a> <a href="javascript: Tweetbar.get_list_tweets(\'' + max_tweet_id + '\',100);">100</a> <a href="javascript: Tweetbar.get_list_tweets(\'' + max_tweet_id + '\',200);">200</a>] tweets</p>';
		},
	htmlspecialchars_decode:
		function(ch){
		    ch = ch.replace(/&amp;/g,"&") ;
		    ch = ch.replace(/&quot;/g,"\"") ; 
		    ch = ch.replace(/&#039;/g,"'") ;
		    ch = ch.replace(/&lt;/g,"<") ;
		    ch = ch.replace(/&gt;/g,">") ;
		    return ch ;
		},
	OAuthLogin:
		function(){



alert('OAuthLogin1');
    var accessor = { consumerSecret: "C1OVXVsVD3pBuQ6rBMIVMDqx1ehW5yXZzFz9HmII"
                   , tokenSecret   : "selected_requestTokenSecret"};
    var message = { action: "http://twitter.com/oauth/request_token"
                  , method: "POST"
                  , parameters: []
                  };
alert('OAuthLogin21');
    var baseString = OAuth.SignatureMethod.getBaseString(message);
alert('OAuthLogin22');
//	var oauth = new OAuth.getSignature(baseString);
//    var signature  = OAuth.getSignature(baseString);
    var signature  = OAuth.setProperties.makeSubclass.getSignature(baseString);
alert('OAuthLogin3');


    message.parameters.push(["oauth_consumer_key", "ZVSTvUh41xj5AHNKwGxA"]);
    message.parameters.push(["oauth_signature_method", "HMAC-SHA1"]);
    message.parameters.push(["oauth_timestamp", "1267348462"]);
    message.parameters.push(["oauth_nonce", OAuth.nonce(6)]);
    message.parameters.push(["oauth_signature", signature]);
alert('OAuthLogin4');

//    for (var e = 0; e < form.elements.length; ++e) {
//        var input = form.elements[e];
//        if (input.name != null && input.name != "" && input.value != null
//            && (!(input.type == "checkbox" || input.type == "radio") || input.checked))
//        {
//            message.parameters.push([input.name, input.value]);
//        }
//    }
    OAuth.setTimestampAndNonce(message);
    OAuth.SignatureMethod.sign(message, accessor);
    //alert(outline("message", message));
    var parameterMap = OAuth.getParameterMap(message.parameters);
    for (var p in parameterMap) {
        if (p.substring(0, 6) == "oauth_"
         && form[p] != null && form[p].name != null && form[p].name != "")
        {
            form[p].value = parameterMap[p];
        }
    }
alert('OAuthLogin6');
    return true;

		}



};


window.onload = function () {
	Tweetbar.run();
};

window.onresize = function () {
	Tweetbar.setListSize();
};