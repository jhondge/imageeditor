var Canvas = require('canvas-browserify');
var Events = require('./events.js');

Viewer.prototype.toString = function() {return 'Viewer';};
var applyList = [];
Viewer.prototype.apply = apply;
Viewer.prototype.applyLater = function() {
	return applyLater(this);
};
Viewer.prototype.load = load;
Viewer.prototype.zoom = zoom;
Viewer.prototype.unselect = unselect;
Viewer.prototype.select = select;
Events.eventify(Viewer.prototype);
module.exports = Viewer;

function imageSmoothingDisableble() {
	var canvas = new Canvas(2, 1);
	var ctx = canvas.getContext('2d');
	ctx.mozImageSmoothingEnabled = false;
	ctx.webkitImageSmoothingEnabled = false;
	ctx.imageSmoothingEnabled = false;
	var id = ctx.getImageData(1, 0, 1, 1);
	var data = id.data;
	data[3] = 255;
	ctx.putImageData(id, 1, 0);
	ctx.drawImage(canvas, 0, 0, 2, 1, -1, 0, 4, 1);
	id = ctx.getImageData(0, 0, 1, 1);
	data = id.data;
	return data[3] === 0;
}

function Viewer() {
	this.node = new Canvas();
	this.ctx = this.node.getContext('2d');
	this.ctx.mozImageSmoothingEnabled = false;
	this.ctx.webkitImageSmoothingEnabled = false;
	this.ctx.imageSmoothingEnabled = false;
	this.selection = null;
	this.autoApply = true;
	this.gridSize = 8;
	this.zoomFactor = 1;
	this.compo = null;
	this.apply();
}

function apply() {
	var old_width = this.node.width;
	var old_height = this.node.height;
	if (!this.compo) {
		/*this.node.width = 1;
		this.node.height = 1;*/
	} else if (this.zoomFactor !== 1) {
		var zoom = this.zoomFactor;
		var w = this.compo.width * zoom;
		var h = this.compo.height * zoom;
		this.node.width = Math.ceil(w);
		this.node.height = Math.ceil(h);
		for (var i = 0; i < this.compo.layers.length; i++) {
			if (!this.compo.layers[i].invisible) {
				this.ctx.drawImage(
					this.compo.layers[i].buffer.canvas,
					this.compo.layers[i].x * zoom,
					this.compo.layers[i].y * zoom,
					this.compo.layers[i].buffer.canvas.width * zoom,
					this.compo.layers[i].buffer.canvas.height * zoom
				);
			}
		}
		if (this.selection) {
			drawSelection(
				this.ctx,
				this.selection.x * zoom,
				this.selection.y * zoom,
				this.selection.w * zoom,
				this.selection.h * zoom
			);
		}
	} else {
		this.node.width = this.compo.width;
		this.node.height = this.compo.height;
		for (var i = 0; i < this.compo.layers.length; i++) {
			if (!this.compo.layers[i].invisible) {
				this.ctx.drawImage(
					this.compo.layers[i].buffer.canvas,
					this.compo.layers[i].x,
					this.compo.layers[i].y
				);
			}
		}
		if (this.selection) {
			drawSelection(
				this.ctx,
				this.selection.x,
				this.selection.y,
				this.selection.w,
				this.selection.h
			);
		}
	}
	if (this.node.width !== old_width || this.node.height !== old_height) {
		this.fire('resize', {x: this.node.width, y: this.node.height});
	}
}

function load(compo) {
	this.compo = compo;
	if (this.autoApply) {
		applyLater(this);
	}
	this.fire('load', {compo: compo});
}

function zoom(factor) {
	if (this.zoomFactor !== factor) {
		this.zoomFactor = factor;
		if (this.autoApply) {
			applyLater(this);
		}
	}
}

function unselect() {
	if (this.selection) {
		this.selection = null;
		if (this.autoApply) {
			applyLater(this);
		}
		this.fire('unselect');
	}
}

function select(x1, y1, x2, y2) {
	var x, y, w, h;
	if (!this.compo) {
		return this.unselect();
	}
	if (x2 < x1) {
		var t = x2;
		x2 = x1;
		x1 = t;
	}
	if (y2 < y1) {
		var t = y2;
		y2 = y1;
		y1 = t;
	}
	if (x1 < 0) {
		x1 = 0;
	}
	if (y1 < 0) {
		y1 = 0;
	}
	if (this.compo.width < x2) {
		x2 = this.compo.width;
	}
	if (this.compo.height < y2) {
		y2 = this.compo.height;
	}
	x = x1;
	y = y1;
	w = x2 - x1;
	h = y2 - y1;
	if (!this.selection ||
		this.selection.x !== x ||
		this.selection.y !== y ||
		this.selection.w !== w ||
		this.selection.h !== h) {
		this.selection = {
			x: x1,
			y: y1,
			w: w,
			h: h
		};
		if (this.autoApply) {
			applyLater(this);
		}
		this.fire('select')
	}
}

function applyLater(editor) {
	if (!applyList.length) {
		doLater(function() {
			var list = applyList.slice();
			applyList.length = 0;
			list.forEach(function(editor) {
				editor.apply();
			});
		});
		applyList.push(editor);
	} else if (applyList.indexOf(editor) < 0) {
		applyList.push(editor);
	}
}

var doLater =
	(typeof window === 'object') && (
		window.requestAnimationFrame ||
		window.mozRequestAnimationFrame
	);
if (doLater) {
	doLater = doLater.bind(window);
} else {
	doLater = function(f) {
		setTimeout(f, 0);
	};
}

function drawSelection(ctx, x, y, w, h) {
	if (x % 1) {
		w += x % 1;
		x = Math.floor(x);
	}
	if (y % 1) {
		h += y % 1;
		y = Math.floor(y);
	}
	if (w % 1) {
		w = Math.ceil(w);
	}
	if (h % 1) {
		h = Math.ceil(h);
	}
	ctx.save();
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(x + w, y);
	ctx.lineTo(x + w, y + h);
	ctx.lineTo(x, y + h);
	ctx.lineTo(x, 0);
	ctx.lineTo(0, 0);
	ctx.lineTo(0, ctx.canvas.height);
	ctx.lineTo(ctx.canvas.width, ctx.canvas.height);
	ctx.lineTo(ctx.canvas.width, 0);
	ctx.lineTo(x, 0);
	ctx.closePath();
	ctx.clip();
	ctx.fillStyle = 'black';
	ctx.shadowColor = 'black';
	ctx.shadowBlur = 7;
	ctx.shadowOffsetX = 3;
	ctx.shadowOffsetY = 3;
	ctx.fillRect(x, y, w, h);
	ctx.strokeStyle = 'rgba(255,255,255,0.9)';
	ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
	ctx.restore();
}