var Canvas = require('canvas-browserify');

var mekoKeys;
GMask.prototype.rgb = rgb;
GMask.prototype.xor = xor;
GMask.prototype.flipV = flipV;
GMask.prototype.flipH = flipH;
GMask.prototype.neg = neg;
GMask.prototype.glassV = glassV;
GMask.prototype.glassH = glassH;
GMask.prototype.win = win;
GMask.prototype.meko = meko;
GMask.prototype.mekoM = function(buffer, s) {
   return this.meko(buffer, s, -1);
};
GMask.prototype.mekoP = function(buffer, s) {
   return this.meko(buffer, s, 1);
};
GMask.prototype.fl = fl;
module.exports = GMask;

function GMask() {
   this.config = {
      fl: {
         neg: true,
         size: 8
      },
      glass: {
         size: 8
      },
      neg: {
         red: true,
         green: true,
         blue: true
      },
      xor: {
         red: true,
         green: true,
         blue: true
      },
      rgb: {
         red: true,
         green: true,
         blue: true
      },
      meko: {
   		neg: true,
   		size: 16
      },
      fl: {
         negative: false,
         size: 8
      }
   };
   this.cache = {};
}

function win(buffer, s) {
   s = getSelection(buffer, s, 1);
   s.w -= s.w % 16;
   var id = buffer.getImageData(s.x, s.y, s.w, s.h);
   var data = id.data;
   swap(0, 48);
   swap(4, 32);
   swap(8, 24);
   swap(12, 60);
   swap(16, 36);
   swap(20, 52);
   swap(28, 44);
   swap(40, 56);
   buffer.putImageData(id, s.x, s.y);
   function swap(x, y) {
      for (var i = 0, t; i < data.length; i += 60) {
         t = data[i + x];
         data[i + x] = data[i + y];
         data[i + y] = t;
         i++;
         t = data[i + x];
         data[i + x] = data[i + y];
         data[i + y] = t;
         i++;
         t = data[i + x];
         data[i + x] = data[i + y];
         data[i + y] = t;
         i++;
         t = data[i + x];
         data[i + x] = data[i + y];
         data[i + y] = t;
         i++;
      }
   }
}

function neg(buffer, s) {
   var cfg = this.config.neg;
   s = getSelection(buffer, s, 1);
   var id = buffer.getImageData(s.x, s.y, s.w, s.h);
   var data = id.data;
   if (cfg.red) {
      for (var i = 0; i < data.length; i += 4) {
         data[i] = 255 - data[i];
      }
   }
   if (cfg.green) {
      for (var i = 1; i < data.length; i += 4) {
         data[i] = 255 - data[i];
      }
   }
   if (cfg.blue) {
      for (var i = 2; i < data.length; i += 4) {
         data[i] = 255 - data[i];
      }
   }
   buffer.putImageData(id, s.x, s.y);
}

function rgb(buffer, s) {
   var cfg = this.config.rgb;
   s = getSelection(buffer, s, 1);
   var id = buffer.getImageData(s.x, s.y, s.w, s.h);
   var data = id.data;
   if (cfg.red) {
      if (cfg.green) {
         if (cfg.blue) {
            for (var i = 0; i < data.length; i += 4) {
               var red = data[i];
               data[i] = data[i + 2];
               data[i + 2] = data[i + 1];
               data[i + 1] = red;
            }
         } else {
            for (var i = 0; i < data.length; i += 4) {
               var red = data[i];
               data[i] = data[i + 1];
               data[i + 1] = red;
            }
         }
      } else if (cfg.blue) {
         for (var i = 0; i < data.length; i += 4) {
            var red = data[i];
            data[i] = data[i + 2];
            data[i + 2] = red;
         }
      }
   } else if (cfg.green && cfg.blue) {
      for (var i = 0; i < data.length; i += 4) {
         var green = data[i + 1];
         data[i + 1] = data[i + 2];
         data[i + 2] = green;
      }
   }
   buffer.putImageData(id, s.x, s.y);
}

function xor(buffer, s) {
   var cfg = this.config.xor;
   s = getSelection(buffer, s, 1);
   var id = buffer.getImageData(s.x, s.y, s.w, s.h);
   var data = id.data;
   if (cfg.red) {
      for (var i = 0; i < data.length; i += 4) {
         data[i] = 0x80 ^ data[i];
      }
   }
   if (cfg.green) {
      for (var i = 1; i < data.length; i += 4) {
         data[i] = 0x80 ^ data[i];
      }
   }
   if (cfg.blue) {
      for (var i = 2; i < data.length; i += 4) {
         data[i] = 0x80 ^ data[i];
      }
   }
   buffer.putImageData(id, s.x, s.y);
}

function flipH(buffer, s) {
   s = getSelection(buffer, s, 1);
   var canvas = new Canvas();
   canvas.width = s.w;
   canvas.height = s.h;
   var ctx = canvas.getContext('2d');
   ctx.scale(-1, 1);
   ctx.drawImage(
      buffer.canvas,
      s.x, s.y, s.w, s.h,
      -s.w, 0, s.w, s.h
   );
   buffer.clearRect(s.x, s.y, s.w, s.h);
   buffer.drawImage(canvas, s.x, s.y);
}

function flipV(buffer, s) {
   s = getSelection(buffer, s, 1);
   var canvas = new Canvas();
   canvas.width = s.w;
   canvas.height = s.h;
   var ctx = canvas.getContext('2d');
   ctx.scale(1, -1);
   ctx.drawImage(
      buffer.canvas,
      s.x, s.y, s.w, s.h,
      0, -s.h, s.w, s.h
   );
   buffer.clearRect(s.x, s.y, s.w, s.h);
   buffer.drawImage(canvas, s.x, s.y);
}

function glassV(buffer, s) {
   var cfg = this.config.glass;
   var size = cfg.size;
   s = getSelection(buffer, s, 1);
   var canvas = new Canvas();
   canvas.width = s.w;
   canvas.height = s.h;
   var ctx = canvas.getContext('2d');
   var rm = s.w % size;
   var n = (s.w - rm) / size;
   ctx.scale(-1, 1);
   for (var i = 0; i < n; i++) {
      ctx.drawImage(
         buffer.canvas,
         s.x + i * size, s.y, size, s.h,
         -(i + 1) * size, 0, size, s.h
      );
   }
   if (rm > 1) {
      ctx.drawImage(
         buffer.canvas,
         s.x + i * size, s.y, rm, s.h,
         -(i + 1) * size, 0, rm, s.h
      );
   }
   buffer.clearRect(s.x, s.y, s.w, s.h);
   buffer.drawImage(canvas, s.x, s.y);
}

function glassH(buffer, s) {
   var cfg = this.config.glass;
   var size = cfg.size;
   s = getSelection(buffer, s, 1);
   var canvas = new Canvas();
   canvas.width = s.w;
   canvas.height = s.h;
   var ctx = canvas.getContext('2d');
   var rm = s.h % size;
   var n = (s.h - rm) / size;
   ctx.scale(1, -1);
   for (var i = 0; i < n; i++) {
      ctx.drawImage(
         buffer.canvas,
         s.x, s.y + i * size, s.w, size,
         0, -(i + 1) * size, s.w, size
      );
   }
   if (rm > 1) {
      ctx.drawImage(
         buffer.canvas,
         s.x, s.y + i * size, s.w, rm,
         0, -(i + 1) * size, s.w, rm
      );
   }
   buffer.clearRect(s.x, s.y, s.w, s.h);
   buffer.drawImage(canvas, s.x, s.y);
}

function meko(buffer, s, amount) {
	var cfg = this.config.meko, cache = this.cache.meko;
   var map;
	s = getSelection(buffer, s, cfg.size);
	if (s.w > 0 && s.h > 0) {
		if (cache && 
			cache.amount === amount &&
			cache.nx === s.nx &&
			cache.ny === s.ny
		) {
			map = cache.map;
		} else {
			map = createMekoMap(s.n, amount);
			if (!cache) {
				cache = this.cache.meko = {};
			}
			cache.amount = amount;
         cache.nx = s.nx;
         cache.ny = s.ny;
         cache.map = map;
		}
		applyMap(buffer, s, map, cfg.neg && (amount % 2 !== 0));
	}
}

function fl(buffer, s) {
   var cfg = this.config.fl, cache = this.cache.fl;
   var map;
   s = getSelection(buffer, s, cfg.size);
   if (s.w > 0 && s.h > 0) {
      if (cache &&
         cache.nx === s.nx &&
         cache.ny === s.ny
      ) {
         map = cache.map;
      } else {
         map = createFLMap(s.nx, s.ny);
         if (!cache) {
            cache = this.cache.fl = {};
         }
         cache.nx = s.nx;
         cache.ny = s.ny;
         cache.map = map;
      }
      applyMap(buffer, s, map, cfg.neg);
   }
}

function getSelection(buffer, s, blocksize) {
	var x, y, w, h, nx, ny, n;
   var canvas = buffer.canvas;
   var width = canvas.width;
   var height = canvas.height;
	if (s) {
		x = s.x;
		y = s.y;
		w = s.w;
		h = s.h;
		if (w < 0) {
			x = x + w;
			w = -w;
		}
		if (h < 0) {
			y = y + h;
			h = -h;
		}
      if (x < 0) {
         x = 0;
      }
      if (y < 0) {
         y = 0;
      }
      if (width < x + w) {
         w = width - x;
      }
      if (height < y + h) {
         h = height - y;
      }
	} else {
		x = 0;
		y = 0;
		w = width;
		h = height;
	}
	w -= w % blocksize;
	h -= h % blocksize;
	nx = w / blocksize;
	ny = h / blocksize;
	n = nx * ny;
	return {
		size: blocksize,
		x: x,	y: y,
		w: w,	h: h,
		nx: nx, ny: ny,
		n: n
	};
}

function applyMap(buffer, s, map, negative) {
	var canvas = new Canvas();
	canvas.width = s.w;
	canvas.height = s.h;
	var ctx = canvas.getContext('2d');
	for (var i = 0; i < s.n; i++) {
		ctx.drawImage(
			buffer.canvas,
			s.x + (map[i] % s.nx) * s.size,
			s.y + Math.floor(map[i] / s.nx) * s.size,
			s.size, s.size,
			(i % s.nx) * s.size,
			Math.floor(i / s.nx) * s.size,
			s.size, s.size
		);
	}
	if (negative) {
      var id = ctx.getImageData(0, 0, s.w, s.h);
		var data = id.data;
      for (var i = 0; i < data.length; i++) {
         data[i] = 255 - data[i++];
         data[i] = 255 - data[i++];
         data[i] = 255 - data[i++];
      }
      map.forEach(function(value, index) {
         if (value === index) {
            var i = value * s.size * s.size * 4;
            for (var j = 0; j < s.size; j++) {
               for (var k = 0; k < s.size; k++) {
                  data[i] = 255 - data[i++];
                  data[i] = 255 - data[i++];
                  data[i] = 255 - data[i++];
                  i++;
               }
               i += (s.nx - 1) * s.size * 4;
            }
         }
      });
      buffer.putImageData(id, s.x, s.y);
	} else {
      buffer.clearRect(s.x, s.y, s.w, s.h);
      buffer.drawImage(canvas, s.x, s.y);
   }
}

function createFLMap(nx, ny) {
   var n = nx * ny, m1 = [], m2 = [];
   var x0 = 0, x1 = nx - 1, y0 = 0, y1 = ny - 1;
   var x = x0 - 1, y, i = 0;
   for (;;) {
      if (n <= i) break;
      for (y = y1--, x++; x <= x1; x++) {
         m2[m1[i++] = x + y * nx] = n - i;
      }
      if (n <= i) break;
      for (x = x1--, y--; y >= y0; y--) {
         m2[m1[i++] = x + y * nx] = n - i;
      }
      if (n <= i) break;
      for (y = y0++, x--; x >= x0; x--) {
         m2[m1[i++] = x + y * nx] = n - i;
      }
      if (n <= i) break;
      for (x = x0++, y++; y <= y1; y++) {
         m2[m1[i++] = x + y * nx] = n - i;
      }
   }
   return m2.map(function(e) {
      return m1[e];
   });
}

function createMekoMap(n, amount) {
	var inverse = amount < 0;
	if (inverse) {
		amount = -amount;
	}
   if (!mekoKeys) {
      mekoKeys = getMekoKeys();
   }
	var map, m = invert(mekoKeys.slice(0, n));
	for (;;) {
		if (amount & 1) {
			if (map) {
				map = add(map, m);
			} else {
				map = m;
			}
		}
		amount >>>= 1;
		if (!amount) {
			break;
		}
		m = add(m, m);
	}
	return inverse ? invert(map) : map;
	function invert(m) {
		return m.map(function(i, j) {
			return {i: i, j: j};
		}).sort(function(a, b) {
			return a.i - b.i;
		}).map(function(e) {
			return e.j;
		});
	}
	function add(m1, m2) {
		return m2.map(function(v) {
			return m1[v];
		});
	}
}

function getMekoKeys() {
	var a = [], b = [], from = 0, len = 0x2400;
	for (var i = from; i < len; i++) {
		a[i] = i;
	}
	a.forEach.call(atob(
'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'
	), function(bits) {
		bits = bits.charCodeAt(0);
		for (var i = 1; i < 0x100; i <<= 1) {
			var half = len >> 1;
			if (bits & i) {
				from += half;
				len -= half;
			} else {
				len = half;
			}
			if (len === 1) {
				b.push(a[from]);
				a.splice(from, 1);
				from = 0;
				len = a.length;
			}
		}
	});
	b.push.apply(b, a);
	return b;
}