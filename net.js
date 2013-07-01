var Image = require('./image.js');
var GMXHR = require('./gm.js').GM_xmlhttpRequest;

module.exports.downloadImage = downloadImage;
module.exports.xhr = xhr;

console.log('GM_xmlhttpRequest is ' + (GMXHR ? '' : 'not ') + 'available.');

function downloadImage(url, onload, onprogress) {
	var config = {
		method: 'GET',
		url: url,
		responseType: 'arraybuffer',
		onload: function(xhr) {
			var contentType = 'image/*';
			var m = /(?:^|\r|\n)Content-Type:[ ]*([^\/;,\s]+\/[^\/;,\s]+(?:;[ ]*charset=[^,;\s]*)?)(?:$|\r|\n)/im.exec(xhr.responseHeaders);
			if (m) {
				contentType = m[1];
			}
			var reader = new FileReader();
			reader.onload = function() {
				var img = new Image();
				img.onload = function() {
					onload(null, img);
				};
				img.onerror = function() {
					onload(new Error('Image has errors.'));
				};
				img.src = reader.result;
			};
			reader.onerror = function() {
				onload(new Error('Error while creating data url.'));
			};
			reader.readAsDataURL(new Blob([xhr.response], {type: contentType}));
		},
		onerror: function() {
			onload(new Error('Error while downloading image.'));
		}
	};
	if (typeof onprogress === 'function') {
		config.onprogress = function(e) {
			if (e.lengthComputable) {
				onprogress(e.loaded, e.total);
			} else {
				onprogress(null);
			}
		};
	}
	xhr(config);
}

function xhr(options) {
	var asBuffer = (String(options.responseType).toLowerCase() === 'arraybuffer');
	var async = options.async = ('async' in options) ? !!options.async : true;
	var method = options.method || 'GET';
	var url = (options.url || location.pathname).split('#')[0];
	var data = options.data;
	if (data && method.toUpperCase() === 'GET') {
		var keys = Object.keys(data);
		if (keys.length) {
			if (url.indexOf('?') < 0) {
				url += '?'
			} else if (url.slice(-1) !== '&') {
				url += '&';
			}
			url += keys.map(function(key) {
				return encode(key) + '=' + encode(data[key]);
			}).join('&');
		}
		data = null;
	} else if (typeof data === 'undefined') {
		data = null;
	}
	if (GMXHR && !asBuffer) {
		options.method = method;
		options.url = url;
		if (data == null) {
			delete options.data;
		} else {
			options.data = data;
		}
		GMXHR(options);
		return;
	}
	var xhr = new XMLHttpRequest();
	xhr.open(method, url, async);
	if (options.onprogress) {
		xhr.addEventListener('progress', options.onprogress.bind(xhr), false);
	}
	if (options.onerror) {
		if (GMXHR && asBuffer) {
			xhr.addEventListener('error', function() {
				var oldOnload = options.onload;
				options.onload = function(e) {
					if (!e.response) {
						e = {
							response: string2Array(e.responseText),
							finalUrl: e.finalUrl,
							readyState: e.readyState,
							responseHeaders: e.responseHeaders,
							status: e.status,
							statusText: e.statusText
						};
					}
					oldOnload.call(this, e);
				};
				GMXHR(options);
			}, false);
		} else {
			xhr.addEventListener('error', options.onerror.bind(xhr), false);
		}
	}
	if (options.onload) {
		xhr.addEventListener('load', function(e) {
			xhr.responseHeaders = xhr.getAllResponseHeaders();
			if (asBuffer) {
				if (!xhr.response) {
					if (xhr.mozResponseArrayBuffer) {
						xhr.response = xhr.mozResponseArrayBuffer;
					} else {
						xhr.response = string2Array(e.responseText);
					}
				}
			}
			options.onload.call(xhr, xhr);
		}, false);
	}
	if (asBuffer) {
		xhr.responseType = 'arraybuffer';
		options.overrideMimeType = 'text/plain;charset=x-user-defined';
	}
	if (options.overrideMimeType) {
		xhr.overrideMimeType(options.overrideMimeType);
	}
	if (data != null) {
		xhr.send(data);
	} else {
		xhr.send();
	}
}

function encode(c) {
	return encodeURIComponent(c).replace(/%20/g, '+');
}

function string2Array(string) {
	var array = new Uint8Array(string.length);
	for (var i = 0, len = string.length; i < len; i++) {
		array[i] = string.charCodeAt(i) & 0xFF;
	}
	return array;
}