var Events = require('./events.js');
var Composition = require('./composition.js');

Controller.prototype.toString = function() {return 'Controller';};
Controller.prototype.setWorkspace = setWorkspace;
Controller.prototype.transformPos = transformPos;
Controller.prototype.onfile = onfile;
Controller.prototype.onurl = onurl;
Controller.prototype.onstart = onstart;
Controller.prototype.onresume = onresume;
Controller.prototype.onfinish = onfinish;
Controller.prototype.onwheel = onwheel;
Controller.prototype.invertZoom = false;
Events.eventify(Controller.prototype);
module.exports = Controller;

function Controller() {

}

function setWorkspace(workspace) {
	if (this.workspace) {
		this.workspace.off('start', this);
		this.workspace.off('resume', this);
		this.workspace.off('finish', this);
		this.workspace.off('file', this);
		this.workspace.off('url', this);
		this.unobserve(this.workspace.node, 'wheel');
	}
	this.workspace = workspace;
	if (this.workspace) {
		this.workspace.on('start', this);
		this.workspace.on('resume', this);
		this.workspace.on('finish', this);
		this.workspace.on('file', this);
		this.workspace.on('url', this);
		this.observe(this.workspace.node, 'wheel');
	}
}

function transformPos(p) {
	var z = this.workspace.viewer.zoomFactor;
	p = {
		x: Math.floor(p.x / z),
		y: Math.floor(p.y / z)
	};
	console.log(p);
	return p;
}

function onfile(e) {
	Composition.fromFile(e.file, function(err, compo) {
		if (!err) {
			this.workspace.viewer.load(compo);
		}
	}.bind(this));
}

function onurl(e) {
	Composition.fromUrl(e.url, function(err, compo) {
		if (!err) {
			this.workspace.viewer.load(compo);
		} else {
			console.log(err);
		}
	}.bind(this));
}

function onstart(e) {
	if (this.workspace.viewer && this.workspace.viewer.compo) {
		var p = this.transformPos(e);
		behaviours.select.onstart.call(this, p);
	}
}

function onresume(e) {
	if (this.workspace.viewer && this.workspace.viewer.compo) {
		var p = this.transformPos(e);
		behaviours.select.onresume.call(this, p);
	}
}

function onfinish(e) {
	if (this.workspace.viewer && this.workspace.viewer.compo) {
		var p = this.transformPos(e);
		behaviours.select.onfinish.call(this, p);
	}
}

function onwheel(e) {
	if (!e.ctrlKey || !e.deltaY) {
		return;
	}
	e.preventDefault();
	var z = this.workspace.viewer.zoomFactor;
	if (0 < e.deltaY || this.invertZoom) {
		if (0.1 < z) {
			z -= 0.1;
			if (z < 0.1) {
				z = 0.1;
			}
		}
	} else {
		if (z < 2) {
			z += 0.1;
			if (2 < z) {
				z = 2;
			}
		}
	}
	this.workspace.viewer.zoom(z);
}

var behaviours = {
	select: {
		onstart: function(p) {
			var viewer = this.workspace.viewer;
			this.from = {
				x: p.x - (p.x % viewer.gridSize),
				y: p.y - (p.y % viewer.gridSize)
			};
			viewer.unselect();
		},
		onresume: function(p) {
			var from = this.from;
			if (from) {
				var viewer = this.workspace.viewer;
				var compo = viewer.compo;
				this.mousemoved = true;
				var to = {
					x: p.x - (p.x % viewer.gridSize),
					y: p.y - (p.y % viewer.gridSize)
				};
				if (from.x <= to.x) {
					to.x += viewer.gridSize;
				}
				if (to.x < 0) {
					to.x = 0;
				} else if (compo.width < to.x) {
					to.x = compo.width - compo.width % viewer.gridSize;
				}
				if (from.y <= to.y) {
					to.y += viewer.gridSize;
				}
				if (to.y < 0) {
					to.y = 0;
				} else if (compo.height < to.y) {
					to.y = compo.height - compo.height % viewer.gridSize;
				}
				viewer.select(from.x, from.y, to.x, to.y);
			}
		},
		onfinish: function(p) {
			var from = this.from;
			if (from) {
				var viewer = this.workspace.viewer;
				if (this.mousemoved) {
					var compo = viewer.compo;
					var to = {
						x: p.x - (p.x % viewer.gridSize),
						y: p.y - (p.y % viewer.gridSize)
					};
					if (from.x <= to.x) {
						to.x += viewer.gridSize;
					}
					if (to.x < 0) {
						to.x = 0;
					} else if (compo.width < to.x) {
						to.x = compo.width - compo.width % viewer.gridSize;
					}
					if (from.y <= to.y) {
						to.y += viewer.gridSize;
					}
					if (to.y < 0) {
						to.y = 0;
					} else if (compo.height < to.y) {
						to.y = compo.height - compo.height % viewer.gridSize;
					}
					viewer.select(from.x, from.y, to.x, to.y);
				} else {
					viewer.unselect();
				}
				delete this.mousemoved;
				delete this.from;
			}
		}
	}
};