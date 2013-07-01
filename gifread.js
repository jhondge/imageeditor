var Gif = require('./gif.js');

Gif.prototype.read = read;
Gif.prototype.readHeader = readHeader;
Gif.prototype.readNextFrame = readNextFrame;
Gif.fromBuffer = fromBuffer;
Gif.Reader = Reader;
module.exports = Reader;

function fromBuffer(buffer) {
    var gif = new Gif().readHeader(new Gif.Reader(new Uint8Array(buffer)));
    return gif;
}

function read(reader) {
    reader = this.reader = reader || this.reader;
    this.readHeader();
    while (this.readNextFrame());
    return this;
}

function readHeader(reader) {
    reader = this.reader = reader || this.reader;
    var v87a = '87a', v89a = '89a';
    var i, len, pack;
    /* HEADER */
    var signature = reader.string(3);
    if ('GIF' !== signature) {
        throw 'Not a GIF. (' + signature + ')';
    }
    var version = reader.string(3);
    if (v87a !== version && v89a !== version) {
        throw 'Unknown GIF version: ' + version;
    }
    /* LOGICAL SCREEN DESCRIPTOR */
    this.width = reader.u16();
    this.height = reader.u16();
    pack = reader.packed(3, 1, 3, 1);
    this.resolution = pack[2];
    this.background = reader.u8();
    this.aspect = reader.u8();
    if (pack[3]) {
        /* GLOBAL COLOR TABLE */
        this.sorted = !!pack[1];
        this.colors = [];
        for (i = 0, len = 2 << pack[0]; i < len; i++) {
            this.colors[i] = reader.u24();
        }
    } else {
        delete this.sorted;
        delete this.colors;
    }
    this.frames = [];
    this.comments = [];
    this.loop = 0;
    this.complete = false;
    return this;
}

function readNextFrame(reader) {
    if (this.complete) {
        return false;
    }
    reader = this.reader = reader || this.reader;
    var id, image, pack, i, len, size, gce, app;
    while (true) {
        id = reader.u8();
        if (0x2C === id) {
            /* IMAGE DESCRIPTOR */
            image = new Gif.Frame();
            image.left = reader.u16();
            image.top = reader.u16();
            image.width = reader.u16();
            image.height = reader.u16();
            pack = reader.packed(3, 2, 1, 1, 1);
            image.interlaced = !!pack[3];
            if (pack[4]) {
                /* LOCAL COLOR TABLE */
                image.sorted = !!pack[2];
                image.colors = [];
                for (i = 0, len = 2 << pack[0]; i < len; i++) {
                    image.colors[i] = reader.u24();
                }
            }
            /* TABLE BASED IMAGE DATA */
            image.data = decompress(reader);
            image.deinterlace();
            if (gce) {
                image.disposal = gce.disposal;
                image.delay = gce.delay;
                if (0 <= gce.transparent) {
                    image.transparent = gce.transparent;
                }
                gce = null;
            }
            this.frames.push(image);
            if (this.fire) {
                this.fire('progress');
            }
            break;
        } else if (0x3B === id) {
            /* TRAILER */
            this.complete = true;
            delete this.reader;
            if (this.fire) {
                this.fire('ready');
            }
            break;
        } else if (0x21 === id) {
            /* EXTENSION */
            id = reader.u8();
            if (0xF9 === id) {
                /* GRAPHIC CONTROL EXTENSION */
                gce = {};
                size = reader.u8();
                if (4 !== size) {
                    throw 'Graphic control extension with unknown block size: ' + size;
                }
                pack = reader.packed(1, 1, 3, 3);
                gce.disposal = pack[2];
                gce.delay = 10 * reader.u16();
                gce.transparent = reader.u8();
                if (!(1 === pack[0])) {
                    delete gce.transparent;
                }
                if (0 !== reader.u8()) {
                    throw 'Graphic control extension terminator missing.';
                }
            } else if (0xFE === id) {
                /* COMMENT EXTENSION */
                this.comments.push(String.fromCharCode.apply(String, reader.blocks().fully()));
            } else if (0xFF === id) {
                /* APPLICATION EXTENSION */
                app = {};
                size = reader.u8();
                if (11 !== size) {
                    throw 'Application extension with unknown block size: ' + size;
                }
                app.identifier = reader.string(8); // reader(8)
                app.authCode = reader.string(3); // reader(3)
                app.data = reader.blocks().fully();
                if ('NETSCAPE' === app.identifier && '2.0' === app.authCode && 1 === app.data[0] ||
                     'ANIMEXTS' === app.identifier && '1.0' === app.authCode && 1 === app.data[0]) {
                    this.loop = app.data[1] | app.data[2] << 8;
                    if (0 === this.loop) {
                        this.loop = Infinity;
                    }
                }
            } else {
                reader.blocks().endBlocks();
            }
        } else {
            throw 'Unknown block type: 0x' + ('0' + id.toString(16).toUpperCase()).slice(-2);
        }
    }
    return !this.complete;

    function decompress(reader) {
        var symbolSize = reader.u8();
        if (symbolSize < 2 || 8 < symbolSize) {
            throw 'Invalid code size ' + symbolSize;
        }
        reader.blocks();
        var maxSize = 12, clear = 1 << symbolSize, end = clear + 1,
            symbolMask = clear - 1, size, limit, previous, current, hashes, codes, next,
            symbolStack = [], lenStack = 0, dataOut = [], lenOut = 0, symbol;
        clearLoop: do {
            hashes = [];
            codes = [];
            size = symbolSize + 1;
            next = clear + 2;
            limit = clear << 1;
            do {
                current = reader.bits(size);
            } while (current === clear);
            if (current < clear) {
                previous = symbol = current;
                dataOut[lenOut++] = symbol;
                current = reader.bits(size);
            }
            while (current !== end) {
                if (end < current || current < clear) {
                    var code, hash;
                    if (current < next) {
                        code = current;
                    } else if (current === next) {
                        code = previous;
                    } else {
                        throw 'Encountered unexpected code ' + current;
                    }
                    while (code > end) {
                        hash = hashes[code];
                        symbolStack[lenStack++] = hash & symbolMask;
                        code = hash >>> symbolSize;
                    }
                    dataOut[lenOut++] = symbol = code;
                    while (0 < lenStack) {
                        dataOut[lenOut++] = symbolStack[--lenStack];
                    }
                    if (current === next) {
                        dataOut[lenOut++] = code;
                    }
                    hash = (previous << symbolSize) | symbol;
                    hashes[next++] = hash;
                    previous = current;
                    if (next === limit && size < maxSize) {
                        size++;
                        limit = limit << 1;
                    }
                    current = reader.bits(size);
                } else if (current === clear) {
                    continue clearLoop;
                } else if (current !== end) {
                    throw 'Internal error (code: ' + current + ')';
                }
            }
        } while (current !== end);
        reader.endBlocks();
        return dataOut;
    }
}

function Reader(data) {
    var index = 0, len = data.length, inBlock = false, blockSize = 0,
        lenBitBuffer = 0, dataBitBuffer = 0, reader = {},
        fetch = function() {
            var result;
            if (len <= index) {
                throw 'Input truncated';
            }
            result = data[index++];
            if (inBlock) {
                if (blockSize < 1) {
                    blockSize = result;
                    if (blockSize < 1) {
                        throw 'Block truncated';
                    }
                    if (len <= index) {
                        throw 'Input truncated';
                    }
                    result = data[index++];
                }
                blockSize--;
            }
            return result;
        }, u8 = reader.u8 = function() {
            if (lenBitBuffer === 0) {
                return fetch();
            } else {
                return bits(8);
            }
        }, u16 = reader.u16 = function() {
            if (lenBitBuffer === 0) {
                return fetch() | fetch() << 8;
            } else {
                return bits(16);
            }
        }, u24 = reader.u24 = function() {
            if (lenBitBuffer === 0) {
                return fetch() | fetch() << 8 | fetch() << 16;
            } else {
                return bits(24);
            }
        }, bits = reader.bits = function(len) {
            var bits;
            while (lenBitBuffer < len) {
                dataBitBuffer |= (fetch() & 0xFF) << lenBitBuffer;
                lenBitBuffer += 8;
            }
            bits = dataBitBuffer & ~(-1 << len);
            dataBitBuffer >>>= len;
            lenBitBuffer -= len;
            return bits;
        }, bytes = reader.bytes = function(len) {
            var result = [];
            if (lenBitBuffer === 0) {
                while (len--) {
                    result.push(fetch());
                }
            } else {
                while (len--) {
                    result.push(bits(8));
                }         
            }
            return result;
        }, string = reader.string = function(len) {
            return String.fromCharCode.apply(String, bytes(len));
        }, packed = reader.packed = function() {
            var i, result = [];
            for (i = 0; i < arguments.length; i++) {
                result.push(bits(arguments[i]));
            }
            return result;
        }, blocks = reader.blocks = function() {
            if (!inBlock) {
                inBlock = true;
                blockSize = 0;
                lenBitBuffer = 0;
                dataBitBuffer = 0;
            }
            return reader;
        }, fully = reader.fully = function() {
            var result;
            if (inBlock) {
                inBlock = false;
                result = [];
                if (lenBitBuffer === 0) {
                    do {
                        while (0 < blockSize--) {
                            result.push(fetch());
                        }
                        blockSize = fetch();
                    } while (0 < blockSize);
                } else {
                    do {
                        while (0 < blockSize--) {
                            result.push(bits(8));
                        }
                        blockSize = fetch();
                    } while (0 < blockSize);
                    result.push(dataBitBuffer);
                    lenBitBuffer = 0;
                    dataBitBuffer = 0;
                }
            } else {
                result = bytes(len - index);
                if (0 < lenBitBuffer) {
                    result.push(dataBitBuffer);
                    lenBitBuffer = 0;
                    dataBitBuffer = 0;
                }
            }
            return result;
        }, endBlocks = reader.endBlocks = function() {
            if (inBlock) {
                inBlock = false;
                if (0 < lenBitBuffer) {
                    lenBitBuffer = 0;
                    dataBitBuffer = 0;
                }
                do {
                    index += blockSize;
                    blockSize = fetch();
                } while (0 < blockSize);
            }
            return reader;
        };
    return reader;
}