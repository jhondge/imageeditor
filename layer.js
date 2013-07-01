var Canvas = require('canvas-browserify');

Layer.prototype.clone = clone;
module.exports = Layer;

function Layer(width, height, r, g, b, a) {
	this.x = 0;
	this.y = 0;
	this.buffer = new Canvas(width, height).getContext('2d');
	if (a) {
		this.buffer.fillStyle = 'rgba(' + [r, g, b, a].join(',') + ')';
		this.buffer.fillRect(0, 0, width, height);
	}
}

function clone() {
	var layer = new Layer(this.buffer.canvas.width, this.buffer.canvas.height);
	layer.buffer.drawImage(this.buffer.canvas, 0, 0);
	return layer;
}