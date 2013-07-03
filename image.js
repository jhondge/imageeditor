var Image = require('canvas-browserify').Image;
if (!Image) {
	var make = require('verydom').make;
	Image = function Image() {
		return make('img');
	};
}
module.exports = Image;