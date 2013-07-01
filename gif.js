Gif.Frame = Frame;
Gif.Frame.prototype.deinterlace = deinterlace;
module.exports = Gif;

function Gif(data) {
    this.width = 0;
    this.height = 0;
    this.resolution = 3;
    this.background = 0;
    this.aspect = 0;
    this.frames = [];
    this.comments = [];
    this.loop = 0;
    this.complete = true;
    if (data) {
        this.read(new Gif.Reader(data));
    }
}

function Frame() {
    this.disposal = 0;
    this.delay = 0;
    this.left = this.top = this.width = this.height = 0;
    this.data = [];
    this.interlaced = false;
}

function deinterlace() {
    if (this.interlaced) {
        var data = this.data, width = this.width, height = this.height;
        var lines = [], i, p = 0;
        for (i = 0; i < height; i += 8) {
            lines[i] = data.slice(p, p += width);
        }
        for (i = 4; i < height; i += 8) {
            lines[i] = data.slice(p, p += width);
        }
        for (i = 2; i < height; i += 4) {
            lines[i] = data.slice(p, p += width);
        }
        for (i = 1; i < height; i += 2) {
            lines[i] = data.slice(p, p += width);
        }
        this.data = Array.prototype.concat.apply([], lines);
        this.interlaced = false;
    }
}