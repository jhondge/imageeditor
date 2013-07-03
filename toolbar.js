var dom = require('verydom');
var Events = require('./events.js');

Toolbar.prototype.toString = function() {return 'Toolbar'};
Toolbar.prototype.add = add;
Toolbar.prototype.insert = insert;
Toolbar.prototype.remove = remove;
//Toolbar.prototype.update = update;
Toolbar.prototype.ontool = ontool;
Events.eventify(Toolbar.prototype);
//Tool.prototype.toString = function() {return 'Tool[' + this.name + ']'};
Tool.prototype.onclick = Tool_onclick;
Events.eventify(Tool.prototype);
Toolbar.Tool = Tool;
module.exports = Toolbar;

function Toolbar() {
	this.node = dom.make('div');
	this.items = [];
}

function add(item) {
	if (item.on) {
		item.on('tool', this);
	}
	this.node.appendChild(item.node);
	this.items.push(item);
	return this;
}

function insert(item, i) {
	if (item.on) {
		item.on('tool', this);
	}
	if (i < this.items.length) {
		item.node.insertBefore(item.node, this.items[i].node);
		this.items.splice(i, 0, item);
	} else {
		this.add(item);
	}
	return this;
}

function remove(item) {
	if (item.off) {
		item.off('tool', this);
	}
	if (typeof item === 'number') {
		this.node.removeChild(this.items[item].node);
		this.items.splice(item, 1);
	} else {
		this.node.removeChild(item.node);
		this.items.splice(this.items.indexOf(item), 1);
	}
	return this;
}

function update() {
	var child = this.node.firstChild;
	for (var i = 0; i < this.items.length; i++) {
		if (!child || child !== this.items[i].node) {
			if (this.items[i].node.parentNode) {
				this.items[i].node.parentNode.removeChild(this.items[i].node);
			}
			this.node.insertBefore(this.items[i].node, child);
		} else {
			child = child.nextSibling;
		}
	}
	if (child) {
		do {
			var removed = this.node.removeChild(this.node.lastChild);
		} while (child !== removed);
	}
	return this;
}

function ontool(e) {
	this.fire(e);
}

function Tool(name, icon) {
	this.name = name;
	this.icon = icon;
	this.node = dom.make('button', {
		title: name
	}, [
		icon || name
	]);
	this.observe(this.node, 'click');
}

function Tool_onclick(e) {
	if (!this.disabled) {
		this.fire('tool', {tool: this});
	}
}