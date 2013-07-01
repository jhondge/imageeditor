var Gif = require('./gif.js');

Gif.prototype.toDataURL = toDataURL;
Gif.prototype.write = write;
Gif.Writer = Writer;
module.exports = Writer;

function toDataURL() {
    return 'data:image/gif;base64,' + btoa(fromCharCodes(this.write().result));
}

function fromCharCodes(array) {
    var len = array.length, string, i, chunkSize;
    var fromCharCode = String.fromCharCode;
    for (chunkSize = 0x10000; 0x100 <= chunkSize; chunkSize = chunkSize >> 1) {
        try {
            string = fromCharCode.apply(String, array.slice(0, chunkSize));
        } catch (e) {
            continue;
        }
        i = chunkSize;
        while (i < len) {
            string += fromCharCode.apply(String, array.slice(i, i += chunkSize));
        }
        return string;
    }
    string = '';
    for (i = 0; i < len; i++) {
        string += String.fromCharCode(array[i]);
    }
    return string;
}

function write(writer) {
    var version, i, len, globalDepth,
        frames = this.frames || [],
        comments = this.comments || [];

    if (!writer) {
        writer = new Gif.Writer();
    }

    if (0 < comments.length ||
        0 < this.loop || 
        frames.some(function(frame) {
            return frame.disposal || frame.delay || 0 <= frame.transparent;
        })) {
        version = '89a';
    } else {
        version = '87a';
    }

    /* HEADER */
    writer.write('GIF', version);

    /* LOGICAL SCREEN DESCRIPTOR */
    writer.write(
        16, this.width,
        16, this.height,
         3, this.colors ? bitLength(this.colors.length) - 1: 0,
         1, !!(this.colors && this.sorted),
         3, this.resolution,
         1, !!this.colors,
         8, this.background,
         8, this.aspect
    );
    if (this.colors) {
        /* GLOBAL COLOR TABLE */
        globalDepth = bitLength(this.colors.length)
        for (i = 0, len = 1 << globalDepth; i < len; i++) {
            writer.u24(this.colors[i]);
        }
    }
    if (0 < this.loop) {
        writer.write(
            8, 0x21,
            8, 0xFF
        ).startBlocks().write(
            'NETSCAPE',
            '2.0'
        ).endBlocks(false).startBlocks().write(
             8, 1,
            16, this.loop
        ).endBlocks();
    }
    frames.forEach(function(frame) {
        var i, len, depth;
        if (frame.disposal || frame.delay || 0 <= frame.transparent) {
            writer.write(
                 8, 0x21,
                 8, 0xF9
            ).startBlocks().write(
                 1, 0 <= frame.transparent,
                 1, 0,
                 3, frame.disposal,
                 3, 0,
                16, frame.delay / 10,
                 8, 0 <= frame.transparent ? frame.transparent : 0
            ).endBlocks();
        }
        writer.write(
             8, 0x2C,
            16, frame.left,
            16, frame.top,
            16, frame.width,
            16, frame.height,
             3, frame.colors ? bitLength(frame.colors.length) - 1 : 0,
             2, 0,
             1, !!(frame.colors && frame.sorted),
             1, frame.interlaced,
             1, !!frame.colors
        );
        if (frame.colors) {
            depth = bitLength(frame.colors.length);
            /* LOCAL COLOR TABLE */
            for (i = 0, len = 1 << depth; i < len; i++) {
                writer.u24(frame.colors[i]);
            }
        }
        /* TABLE BASED IMAGE DATA */
        compress(writer, frame.data, undefined && (depth || globalDepth));
    });
    comments.forEach(function(comment) {
        writer.write(
             8, 0x21,
             8, 0xFE
        ).startBlocks().write(
            comment
        ).endBlocks();
    });
    writer.write(8, 0x3B);
    return writer;

    function bitLength(n) {
        var l;
        if (0x10 < n) {
            if (0x40 < n) {
                if (0x80 < n) {
                    l = 8;
                } else {
                    l = 7;
                }
            } else {
                if (0x20 <= n) {
                    l = 6;
                } else {
                    l = 5;
                }
            }
        } else {
            if (0x04 <= n) {
                if (0x08 <= n) {
                    l = 4;
                } else {
                    l = 3;
                }
            } else {
                if (0x02 <= n) {
                    l = 2;
                } else {
                    l = 1;
                }
            }
        }
        //console.log(n+'=>'+l);
        return l;
    }

    function compress(writer, data, depth) {
        var i = 0, len = data.length,
            symbolSize = 2, clear = 4,
            size, end,
            code, codes = [], clearAt = 0x1000,
            next, limit;
        if (depth) {
            symbolSize = Math.max(2, depth);
            clear = 1 << symbolSize;
        } else {
            findSymbolSize: while (i < len) {
                while (clear <= data[i++]) {
                    symbolSize++;
                    clear <<= 1;
                    if (symbolSize === 8) {
                        break findSymbolSize;
                    }
                }
            }
        }
        size = symbolSize + 1;
        end = clear + 1;
        next = clear + 2;
        limit = clear + clear;
        writer.u8(symbolSize).startBlocks().bits(size, clear);
        code = data[0];
        for (i = 1; i < len; i++) {
            var symbol = data[i];
            var hash = code << symbolSize | symbol;
            if (hash in codes) {
                code = codes[hash];
            } else {
                writer.bits(size, code);
                if (next === limit) {
                    if (next === clearAt) {
                        codes = [];
                        writer.bits(12, clear);
                        size = symbolSize + 1;
                        next = clear + 2;
                        limit = clear + clear;
                    } else {
                        size++;
                        limit <<= 1;
                        codes[hash] = next++;
                    }
                } else {
                    codes[hash] = next++;
                }
                code = symbol;
            }
        }
        if (0 < len) {
            writer.bits(size, code);
            if (next === clearAt) {
                writer.bits(12, clear);
                size = symbolSize + 1;
                next = clear + 2;
                limit = clear + clear;
            } else {
                if (next === limit) {
                    size++;
                    limit = next + next;
                }
                codes[hash] = next++;
            }
        }
        writer.bits(size, end).endBlocks();
    }
}

function Writer(maxBlockSize) {
    if (!(0 < maxBlockSize && maxBlockSize < 256)) {
        maxBlockSize = 255;
    }
    var blocks = false, blockStart, buffer = 0, bufferSize = 0,
        writer = {}, result = writer.result = [], index = 0,
        store = function(value) {
            if (blocks && index - blockStart > maxBlockSize) {
                result[blockStart] = index - blockStart - 1;
                blockStart = index++;
            }
            result[index++] = value & 0xFF;
        }, write = writer.write = function() {
            var i = 0, len = arguments.length;
            while (i < len) {
                if (typeof arguments[i] === 'string') {
                    byteString(arguments[i++]);
                } else {
                    bits(arguments[i++], arguments[i++]);
                }
            }
            return writer;
        }, u8 = writer.u8 = function(value) {
            if (bufferSize === 0) {
                store(value);
            } else {
                bits(8, value);
            }
            return writer;
        }, u16 = writer.u16 = function(value) {
            if (bufferSize === 0) {
                store(value);
                store(value >> 8);
            } else {
                bits(16, value);
            }
            return writer;
        }, u24 = writer.u24 = function(value) {
            if (bufferSize === 0) {
                store(value);
                store(value >> 8);
                store(value >> 16);
            } else {
                bits(24, value);
            }
            return writer;
        }, u32 = writer.u32 = function(value) {
            if (bufferSize === 0) {
                store(value);
                store(value >> 8);
                store(value >> 16);
                store(value >> 24);
            } else {
                bits(32, value);
            }
            return writer;
        }, bits = writer.bits = function(size, value) {
            var sizeSum = bufferSize + size;
            if (sizeSum <= 32) {
                buffer = (value << bufferSize | buffer) & ~(-1 << sizeSum);
                bufferSize = sizeSum;
            } else {
                store(value << bufferSize | buffer);
                buffer = value >>> bufferSize;
                bufferSize = sizeSum - 8;
            }
            while (8 <= bufferSize) {
                store(buffer);
                buffer >>>= 8;
                bufferSize -= 8;
            }
            return writer;
        }, align = writer.align = function() {
            if (bufferSize > 0) {
                store(buffer);
                buffer = 0;
                bufferSize = 0;
            }
            return writer;
        }, bytes = writer.bytes = function(value) {
            for (var i = 0, len = value.length; i < len; i++) {
                u8(value[i]);
            }
            return writer;
        }, byteString = writer.byteString = function(value) {
            for (var i = 0, len = value.length; i < len; i++) {
                writer.u8(value.charCodeAt(i));
            }
            return writer;
        }, startBlocks = writer.startBlocks = function() {
            align();
            blocks = true;
            blockStart = index++;
            return writer;
        }, endBlocks = writer.endBlocks = function(terminate) {
            align();
            blocks = false;
            var len = result[blockStart] = index - blockStart - 1;
            if (terminate !== false && len > 0) {
                u8(0);
            }
            return writer;
        };
    return writer;
}