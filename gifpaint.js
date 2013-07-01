var Gif = require('./gif.js');

Gif.Painter = Painter;
Gif.Painter.prototype.paint = paint;
module.exports = Painter;

function Painter(gif, ctx) {
    this.gif = gif;
    this.ctx = ctx;
    this.disposal = null;
}

function paint(i) {
    var gif = this.gif,
        frame = gif.frames[i],
        colors = frame.colors || gif.colors || this.colors,
        ctx = this.ctx,
        disp = this.disposal,
        left = frame.left,
        top = frame.top,
        width = frame.width,
        height = frame.height,
        data;
    if (disp) {
        if (disp.data) {
            ctx.putImageData(disp.data, disp.left, disp.top);
        } else {
            ctx.clearRect(disp.left, disp.top, disp.width, disp.height);
        }
    }
    if (frame.disposal === 3) {
        this.disp = {
            left: left,
            top: top,
            data: ctx.getImageData(left, top, width, height)
        };
    } else if (frame.disposal === 2) {
        this.disp = {
            left: left,
            top: top,
            width: width,
            height: height
        };
    }
    data = ctx.getImageData(left, top, width, height);
    draw(data.data);
    ctx.putImageData(data, left, top);

    function draw(rgba) {
        var transparent = frame.transparent;
        var indices = frame.data;
        var len = indices.length;
        var i = 0, p = 0, c;
        if (colors !== null) {
            while (i < len) {
                c = indices[i++];
                if (c !== transparent) {
                    c = colors[c];
                    rgba[p++] = c & 0xFF;
                    rgba[p++] = (c >> 8) & 0xFF;
                    rgba[p++] = (c >> 16) & 0xFF;
                    rgba[p++] = 0xFF;
                } else {
                    rgba[p+3] = 0x00;
                    p += 4;
                }
            }
        } else {
            // default color table
            while (i < len) {
                c = indices[i++];
                if (c !== transparent) {
                    rgba[p++] = c;
                    rgba[p++] = c;
                    rgba[p++] = c;
                    rgba[p++] = 0xFF;
                } else {
                    p += 4;
                }
            }
        }
    }
}