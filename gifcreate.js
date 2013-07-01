var Canvas = require('canvas-browserify');
var Gif = require('./gif.js');

Gif.Frame.fromCanvas = fromCanvas;
Gif.Frame.fromImage = fromImage;
Gif.fromFrame = wrapFrame;
Gif.fromCanvas = chain(fromCanvas, wrapFrame);
Gif.fromImage = chain(fromImage, wrapFrame);
Gif.reduceColors = reduceColors;

function chain() {
    var f = Array.prototype.slice.call(arguments, 0), len = f.length;
    return function() {
        var i, r = f[0].apply(this, Array.prototype.slice.call(arguments, 0));
        for (i = 1; i < len; i++) {
            r = f[i].call(r, r);
        }
        return r;
    };
}

function fromCanvas(canvas, bits) {
    var result = Gif.reduceColors(canvas, bits || 8, false);
    var frame = new Gif.Frame();
    frame.width = canvas.width;
    frame.height = canvas.height;
    frame.data = result.indices;
    frame.colors = result.palette;
    if ('transparent' in result) {
        frame.transparent = result.transparent;
    }
    return frame;
}

function fromImage(image, bits) {
    var canvas = new Canvas();
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d').drawImage(image, 0, 0);
    return Gif.Frame.fromCanvas(canvas, bits);
}

function wrapFrame(frame) {
    var gif = new Gif();
    gif.frames[0] = frame;
    gif.width = frame.width;
    gif.height = frame.height;
    gif.colors = frame.colors;
    delete frame.colors;
    return gif;
}

function reduceColors(canvas, bits, apply) {
    var width = canvas.width,
        height = canvas.height,
        ctx = canvas.getContext('2d'),
        imageData = ctx.getImageData(0, 0, width, height),
        pixels = imageData.data,
        len = pixels.length,
        colors = [],
        map = {},
        hasTransparency = false,
        hasAlpha = false,
        maxColors = 1 << bits,
        palette = [],
        indices = [],
        result = {palette: palette, indices: indices},
        i, tree, transparent;
    if (width === 0 || height === 0) {
        return result;
    }
    findColors(pixels, colors, map);
    for (i = 3; i < len; i += 4) {
        if (pixels[i] !== 255) {
            hasTransparency = true;
            break;
        }
    }
    for (; i < len; i += 4) {
        if (pixels[i] !== 255 && pixels[i] !== 0) {
            hasAlpha = true;
            break;
        }
    }
    if (
        !hasTransparency && colors.length <= maxColors ||
        !hasAlpha && colors.length + 1 <= maxColors
    ) {
        colors.forEach(function(c, i) {
            palette[i] = c[0] | c[1] << 8 | c[2] << 16;
        });
        if (hasTransparency) {
            result.transparent = transparent = palette.length;
            palette[transparent] = 0;
            for (i = 0; i < len; i += 4) {
                if (pixels[i + 3] === 0) {
                    indices.push(transparent);
                } else {
                    indices.push(map[pixels[i] | pixels[i + 1] << 8 | pixels[i + 2] << 16]);
                }
            }
        } else {
            for (i = 0; i < len; i += 4) {
                indices.push(map[pixels[i] | pixels[i + 1] << 8 | pixels[i + 2] << 16]);
            }
        }
    } else {
        if (hasTransparency) {
            tree = medianCut(colors, maxColors - 1, palette);
            result.transparent = transparent = palette.length;
            palette[transparent] = 0;
        } else {
            tree = medianCut(colors, maxColors, palette);
        }
        dither(indices, pixels, apply, tree, width, transparent);
        if (apply) {
            ctx.putImageData(imageData, 0, 0);
        }
    }
    return result;

    function dither(indices, pixels, apply, tree, width, transparent) {
        var i, len, node, index = 0;
        var err1 = [], err2 = [], tmp, p = 0;
        var r, g, b, a, rgb = [];
        var errR, errG, errB, errA;
        width = width * 4;
        for (p = 0, len = width; p < len; p++) {
            err1[p] = 0;
            err2[p] = 0;
        }
        p = 0;
        for (i = 0, len = pixels.length; i < len; i += 4) {
            r = pixels[i];
            g = pixels[i + 1];
            b = pixels[i + 2];
            a = pixels[i + 3];
            errR = err1[p];
            errG = err1[p + 1];
            errB = err1[p + 2];
            errA = err1[p + 3];
            err1[p] = err1[p + 1] = err1[p + 2] = err1[p + 3] = 0;
            if (a + errA < 0x80) {
                indices[index++] = transparent;
                if (apply) {
                    pixels[i + 3] = 0x00;
                }
                errA = (a + errA) * 0.0625;
                err2[p - 1] += errA * 3;
                err2[p + 3] += errA * 5;
                if (p + 4 < width) {
                    err1[p + 8] += errA * 7;
                    err2[p + 7] += errA;
                    p += 4;
                } else {
                    tmp = err1;
                    err1 = err2;
                    err2 = tmp;
                    p = 0;
                }
            } else {
                rgb[0] = r + errR;
                rgb[1] = g + errG;
                rgb[2] = b + errB;
                node = tree;
                do {
                    node = rgb[node.dimension] < node.median ? node.lower : node.higher;
                } while (node.higher);
                errR = r - node.r;
                errG = g - node.g;
                errB = b - node.b;
                errA = a - 0xFF;
                indices[index++] = node.index;
                if (apply) {
                    pixels[i] = node.r;
                    pixels[i + 1] = node.g;
                    pixels[i + 2] = node.b;
                    pixels[i + 3] = 0xFF;
                }
                errR *= 0.0625;
                errG *= 0.0625;
                errB *= 0.0625;
                errA *= 0.0625;
                err2[p - 4] += errR * 3;
                err2[p - 3] += errG * 3;
                err2[p - 2] += errB * 3;
                err2[p - 1] += errA * 3;
                err2[p] += errR * 5;
                err2[p + 1] += errG * 5;
                err2[p + 2] += errB * 5;
                err2[p + 3] += errA * 5;
                if (p + 4 < width) {
                    err1[p + 4] += errR * 7;
                    err1[p + 5] += errG * 7;
                    err1[p + 6] += errB * 7;
                    err1[p + 7] += errA * 7;
                    err2[p + 4] += errR;
                    err2[p + 5] += errG;
                    err2[p + 6] += errB;
                    err2[p + 7] += errA;
                    p += 4;
                } else {
                    tmp = err1;
                    err1 = err2;
                    err2 = tmp;
                    p = 0;
                }
            }
        }
    }

    function findColors(pixels, array, map) {
        var i, len, r, g, b, a, hash, index = 0;
        for (i = 0, len = pixels.length; i < len; i += 4) {
            r = pixels[i];
            g = pixels[i + 1];
            b = pixels[i + 2];
            a = pixels[i + 3];
            if (0 < a) {
                hash = r | g << 8 | b << 16;
                if (!(hash in map)) {
                    array[index] = [r, g, b];
                    map[hash] = index++;
                }
            }
        }
    }

    function medianCut(colors, maxColors, palette) {
        var index = 0;
        return (function cut(colors, maxIndex, sort) {
            var i, len = colors.length,
                r, g, b,
                min, minr, ming, minb,
                max, maxr, maxg, maxb,
                dr, dg, db,
                dim, medianIndex, medianValue,
                from, to;
            if (len < 2) {
                r = colors[0][0];
                g = colors[0][1];
                b = colors[0][2];
                palette[index] = r | g << 8 | b << 16;
                return {index: index++, r: r, g: g, b: b};
            } else if (maxIndex - index < 2) {
                r = g = b = 0;
                for (i = 0; i < len; i++) {
                    r += colors[i][0];
                    g += colors[i][1];
                    b += colors[i][2];
                }
                r = Math.round(r / len);
                g = Math.round(g / len);
                b = Math.round(b / len);
                palette[index] = r | g << 8 | b << 16;
                return {index: index++, r: r, g: g, b: b};
            }
            minr = maxr = colors[0][0];
            ming = maxg = colors[0][1];
            minb = maxb = colors[0][2];
            for (i = 1; i < len; i++) {
                r = colors[i][0];
                g = colors[i][1];
                b = colors[i][2];
                if (r < minr) {
                    minr = r;
                    if (minr === 0 && maxr === 255) break;
                } else if (r > maxr) {
                    maxr = r;
                    if (maxr === 255 && minr === 0) break;
                }
                if (g < ming) {
                    ming = g;
                    if (ming === 0 && maxg === 255) break;
                } else if (g > maxg) {
                    maxg = g;
                    if (maxg === 255 && ming === 0) break;
                }
                if (b < minb) {
                    minb = b;
                    if (minb === 0 && maxb === 255) break;
                } else if (b > maxb) {
                    maxb = b;
                    if (maxb === 255 && minb === 0) break;
                }
            }
            dr = maxr - minr;
            dg = maxg - ming;
            db = maxb - minb;
            if (dr >= dg) {
                dim = (dr >= db) ? 0 : 2;
            } else if (dg >= db) {
                dim = 1;
            } else {
                dim = 2;
            }
            if (dim !== sort) {
                min = [minr, ming, minb][dim];
                max = [maxr, maxg, maxb][dim];
                bucketSort(colors, dim, min, max);
                sort = dim;
            }
            from = to = medianIndex = len >> 1;
            medianValue = colors[medianIndex][dim];
            while(--from >= 0 && colors[from][dim] === medianValue);
            from++;
            while(++to < len && colors[to][dim] === medianValue);
            if (to - from > 1) {
                if (from >= len - to) {
                    medianIndex = from;
                } else {
                    medianIndex = to;
                }
            }
            return {
                dimension: dim,
                median: (colors[medianIndex][dim] + colors[medianIndex - 1][dim]) * 0.5,
                lower: cut(colors.slice(0, medianIndex), (index + maxIndex) >> 1, sort),
                higher: cut(colors.slice(medianIndex), maxIndex, sort)
            };
        })(colors, maxColors);
    }

    function bucketSort(array, key, min, max) {
        var i, j, k, len = array.length,
            element, bucket,
            buckets = [];
        max++;
        for (i = max; min < i;) {
            buckets[--i] = [];
        }
        for (i = len; i;) {
            element = array[--i];
            buckets[element[key]].push(element);
        }
        for (i = max, k = len; min < i;) {
            bucket = buckets[--i];
            for (j = bucket.length; j;) {
                array[--k] = bucket[--j];
            }
        }
    }
}