var dom = require('verydom'),
	make = dom.make;
var Events = require('./events.js');
var Viewer = require('./viewer.js');
var Workspace = require('./workspace.js');
var Controller = require('./controller.js');
var Composition = require('./composition.js');
var Toolbar = require('./toolbar.js');
var GMask = require('./gmask.js');

ImageEditor.prototype.toString = function() {return 'ImageEditor';};
ImageEditor.prototype.loadUrl = loadUrl;
ImageEditor.prototype.loadCompo = loadCompo;
ImageEditor.prototype.onload = onload;
ImageEditor.prototype.onchange = onchange;
ImageEditor.prototype.ontool = ontool;
Events.eventify(ImageEditor.prototype);
module.exports = ImageEditor;

function ImageEditor() {
	this.viewer = new Viewer();
	this.workspace = new Workspace();
	this.controller = new Controller();
	this.toolbar = new Toolbar()
		.add(new Toolbar.Tool('rgb'))
		.add(new Toolbar.Tool('xor'))
		.add(new Toolbar.Tool('flipV'))
		.add(new Toolbar.Tool('flipH'))
		.add(new Toolbar.Tool('neg'))
		.add(new Toolbar.Tool('glassV'))
		.add(new Toolbar.Tool('glassH'))
		.add(new Toolbar.Tool('win'))
		.add(new Toolbar.Tool('mekoM'))
		.add(new Toolbar.Tool('mekoP'))
		.add(new Toolbar.Tool('fl'));
	this.gmask = new GMask();
	this.workspace.setViewer(this.viewer);
	this.controller.setWorkspace(this.workspace);
	this.layerList = {};
	this.node = make('div', [
		this.toolbar.node,
		make(this.workspace.node, {
			style: {
				'cssFloat': 'left'
			}
		}),
		this.layerList.node = make('select', {
			size: 10,
			multiple: true
		})
	]);
	this.viewer.on('load', this);
	this.observe(this.layerList.node, 'change');
	this.toolbar.on('tool', this);
}

function loadUrl(url) {
	Composition.fromUrl(url, function(err, compo) {
		if (!err) {
			this.viewer.load(compo);
		}
	}.bind(this));
}

function loadCompo(compo) {
	this.viewer.load(compo);
}

function onload(e) {
	make(this.layerList.node, 'clear', e.compo && e.compo.layers.map(function(layer, i) {
		return make('option', {value: i}, [layer.name || ('Layer ' + i)]);
	}, this));
}

function onchange(e) {
	if (this.viewer.compo) {
		this.viewer.compo.layers.forEach(function(layer, i) {
			layer.invisible = (0 <= e.target.selectedIndex) && !e.target.options[i].selected;
		});
		this.viewer.applyLater();
	}
}

function ontool(e) {
	this.gmask[e.tool.name](this.viewer.compo.layers[0].buffer, this.viewer.selection);
	this.viewer.applyLater();
}