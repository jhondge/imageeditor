var dom = require('verydom');
var Canvas = require('canvas-browserify');
var Events = require('./events.js');

Workspace.prototype.toString = function() {return 'Workspace';};
Workspace.prototype.setViewer = setViewer;
Workspace.prototype.onresize = onresize;
Workspace.prototype.onmousedown = onmousedown;
Workspace.prototype.onmousemove = onmousemove;
Workspace.prototype.onmouseup = onmouseup;
Workspace.prototype.ondragenter = ondrag;
Workspace.prototype.ondragexit = ondrag;
Workspace.prototype.ondragover = ondrag;
Workspace.prototype.ondrop = ondrop;
Workspace.prototype.oninput = oninput;
Workspace.prototype.onpaste = onpaste;
Events.eventify(Workspace.prototype);
module.exports = Workspace;

var backPattern = paintDataURL(16, 16, function(ctx) {
   ctx.fillStyle = 'rgb(153,153,153)';
   ctx.fillRect(0, 0, 16, 16);
   ctx.fillStyle = 'rgb(102,102,102)';
   ctx.fillRect(0, 0, 8, 8);
   ctx.fillRect(8, 8, 8, 8);
});
var urlRegExp = /https?:\/\/[^\s"'>]+|data:[^\s=]+=/;

function Workspace() {
   this.node = dom.make('div');
   this.node.tabIndex = -1;
   this.node.style.position = 'relative';
   this.node.style.width = '300px';
   this.node.style.height = '50px';
   this.node.style.backgroundColor = 'rgb(200,200,200)';
   this.node.style.border = '1px solid black';
   this.node.style.overflow = 'scroll';
   this.node.style.resize = 'both';

   this.back = {};
   this.back.node = dom.make('div');
   this.back.node.style.width = '250px';
   this.back.node.style.height = '250px';
   this.back.node.style.position = 'absolute';
   this.back.node.style.left = '0px';
   this.back.node.style.top = '0px';
   this.back.node.style.backgroundImage = 'url(' + backPattern + ')';

   this.glass = {};
   this.glass.node = dom.make('div');
   this.glass.node.contentEditable = true;
   this.glass.node.style.width = '250px';
   this.glass.node.style.height = '250px';
   this.glass.node.style.position = 'absolute';
   this.glass.node.style.left = '0px';
   this.glass.node.style.top = '0px';
   this.glass.node.style.cursor = 'crosshair';
   this.observe(this.glass.node, 'mousedown', 'dragenter', 'dragexit', 'dragover', 'drop', 'input', 'paste');

   this.node.appendChild(this.back.node);
   this.node.appendChild(this.glass.node);
}

function setViewer(viewer) {
   if (this.viewer) {
      this.node.removeChild(this.viewer.node);
      this.viewer.off('resize', this);
   }
   this.viewer = viewer;
   if (this.viewer) {
      this.node.insertBefore(this.viewer.node, this.glass.node);
      this.viewer.node.style.position = 'absolute';
      this.viewer.node.style.left = '0px';
      this.viewer.node.style.top = '0px';
      this.viewer.on('resize', this);
      this.glass.node.style.width = this.back.node.style.width = this.viewer.node.width + 'px';
      this.glass.node.style.height = this.back.node.style.height = this.viewer.node.width + 'px';
   } else {
      this.glass.node.style.width = this.back.node.style.width = '250px';
      this.glass.node.style.height = this.back.node.style.height = '250px';
   }
}

function onresize(e) {
   console.log(e);
   this.glass.node.style.width = this.back.node.style.width = e.x + 'px';
   this.glass.node.style.height = this.back.node.style.height = e.y + 'px';
}

function onmousedown(e) {
   if (e.button === 0) {
      this.glass.node.setCapture(true);
      this.observe(this.glass.node, 'mousemove', 'mouseup');
      this.fire('start', {x: e.layerX, y: e.layerY});
   }
}

function onmousemove(e) {
   this.fire('resume', {x: e.layerX, y: e.layerY});
}

function onmouseup(e) {
   if (e.button === 0) {
      this.unobserve(this.glass.node, 'mousemove', 'mouseup');
      this.fire('finish', {x: e.layerX, y: e.layerY});
   }
}

function ondrag(e) {
   e.stopPropagation();
   e.preventDefault();
   e.dataTransfer.dropEffect = 'copy';
}

function ondrop(e) {
   e.stopPropagation();
   e.preventDefault();
   var m, url, dt = e.dataTransfer;
   if (dt.files.length > 0) {
      this.fire('file', {file: dt.files[0]});
   } else if (url = dt.getData('text/x-moz-url-data')) {
      this.fire('url', {url: url});
   } else if (url = dt.getData('text/uri-list')) {
      this.fire('url', {url: url});
   } else if (m = dt.getData('text/html') || dt.getData('text/plain') || dt.getData('text')) {
      if (m = urlRegExp.exec(m)) {
         url = m[0];
         this.fire('url', {url: url});
      }
   }
}

function oninput(e) {
   this.glass.node.blur();
   if (this.glass.node.firstChild) {
      var img = this.glass.node.querySelector('img');
      if (img) {
         this.fire('url', {url: img.src});
      } else {
         var m = urlRegExp.exec(this.glass.node.textContent);
         if (m) {
            this.fire('url', {url: m[0]});
         }
      }
      do {
         this.glass.node.removeChild(this.glass.node.lastChild);
      } while (this.glass.node.lastChild);
   }
}

function onpaste(e) {
   try {
      if (e.clipboardData) {
         var items = e.clipboardData.items;
         for (var i = 0; i < items.length; i++) {
            if (items[i].type.lastIndexOf('image/', 0) === 0) {
               this.fire('file', {file: items[i].getAsFile()});
               e.preventDefault();
               return;
            }
         }
      }
   } catch (ex) {
      console.log(ex);
   }
}

function paintDataURL(width, height, painter) {
   var canvas = new Canvas(width, height);
   var ctx = canvas.getContext('2d');
   painter(ctx);
   return canvas.toDataURL();
}