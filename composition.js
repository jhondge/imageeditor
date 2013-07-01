var Image = require('./image.js');
var Layer = require('./layer.js');
var Net = require('./net.js');
var Gif = require('./gif.js');
require('./gifpaint.js');
require('./gifread.js');

Composition.fromImage = fromImage;
Composition.fromFile = fromFile;
Composition.fromUrl = fromUrl;
Composition.fromDataUrl = fromDataUrl;
Composition.fromBuffer = fromBuffer;
Composition.fromGif = fromGif;
module.exports = Composition;

function Composition(width, height, layers) {
    this.width = width;
    this.height = height;
    this.layers = layers || [];
}

function fromImage(img, callback) {
    var layer = new Layer(img.width, img.height);
    layer.buffer.drawImage(img, 0, 0);
    setTimeout(function() {
        callback(null, new Composition(layer.buffer.canvas.width, layer.buffer.canvas.height, [layer]));
    }, 0);
}

function fromFile(file, callback) {
    var reader = new FileReader();
    var filetype = file.type;
    var filename, index;
    if (file.name) {
        filename = String(file.name);
        index = filename.lastIndexOf('.');
        if (1 <= index) {
            filename = filename.substring(0, index);
        }
    }
    if (filetype === 'image/gif' && reader.readAsArrayBuffer) {
        reader.onload = function() {
            Composition.fromBuffer(reader.result, filetype, function(err, compo) {
                if (err) {
                    callback(err);
                    return;
                }
                if (filename) {
                    compo.filename = filename;
                }
                callback(null, compo);
            });
        };
        reader.readAsArrayBuffer(file);
    } else {
        reader.onload = function() {
            Composition.fromDataUrl(reader.result, function(err, compo) {
                if (err) {
                    callback(err);
                    return;
                }
                if (filename) {
                    compo.filename = filename;
                }
                compo.filetype = filetype;
                callback(null, compo);
            });
        };
        reader.readAsDataURL(file);
    }
}

function fromUrl(url, callback) {
    if (url.substring(0, 5) === 'data:') {
        Composition.fromDataUrl(url, callback);
    } else {
        Net.xhr({
            method: 'GET',
            url: url,
            responseType: 'arraybuffer',
            onload: function(xhr) {
                var filename, filetype, m, index;
                m = /^https?:\/.*\/([^\/?#]+)(?:$|[?#])/.exec(url);
                if (m) {
                    filename = m[1];
                    index = filename.lastIndexOf('.');
                    if (1 <= index) {
                        filename = filename.substring(0, index);
                    }
                }
                m = /(?:^|\r|\n)Content-Type:[ ]*([^\/;,\s]+\/[^\/;,\s]+(?:;[ ]*charset=[^,;\s]*)?)(?:$|\r|\n)/im.exec(xhr.responseHeaders);
                if (m) {
                    filetype = m[1];
                }
                Composition.fromBuffer(xhr.response, filetype, function(err, compo) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    if (filename) {
                        compo.filename = filename;
                    }
                    callback(null, compo);
                });
            },
            onerror: function() {
                callback(new Error('Error downloading url: ' + url));
            }
        });
    }
}

function fromDataUrl(url, callback) {
    if (url.substring(0, 15) === 'data:image/gif;') {
        var data;
        if (url.substring(15, 22) === 'base64,') {
            data = url.substring(22);
            data = atob(data);
        } else {
            data = url.substring(15);
        }
        data = [].map.call(data, function(c) {
            return c.charCodeAt(0);
        });
        var gif = new Gif().readHeader(new Gif.Reader(data));
        Composition.fromGif(gif, function(err, compo) {
            callback(null, compo);
        });
    } else {
        var img = new Image();
        img.onload = function() {
            Composition.fromImage(img, function(err, compo) {
                compo.filetype = /^data:([^;]*);/.exec(url)[1];
                callback(err, compo);
            });
        };
        img.src = url;
    }
}

function fromBuffer(buffer, filetype, callback) {
    if (filetype === 'image/gif') {
        Composition.fromGif(Gif.fromBuffer(buffer), callback);
    } else {
        var blob = new Blob([buffer], {type: filetype});
        var reader = new FileReader();
        reader.onload = function() {
           Composition.fromDataUrl(reader.result, callback);
        };
        reader.readAsDataURL(blob);
    }
}

function fromGif(gif, callback) {
    var compo = new Composition(gif.width, gif.height);
    var layer = new Layer(gif.width, gif.height);
    var painter = new Gif.Painter(gif, layer.buffer);
    for (var i = 0; i < gif.frames.length; i++) {
        painter.paint(i);
        compo.layers.push(layer.clone());
    }
    for (; gif.readNextFrame(); i++) {
        painter.paint(i);
        compo.layers.push(layer.clone());
    }
    compo.filetype = 'image/gif';
    setTimeout(function() {
        callback(null, compo);
    }, 0);
}