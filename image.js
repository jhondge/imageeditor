var Image = require('canvas-browserify').Image;
if (!Image) {
	var make = require('./dom.js').make;
	Image = function Image() {
		return make('img');
	};
}
module.exports = Image;