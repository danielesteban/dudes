/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from "protobufjs/minimal";

const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const protocol = $root.protocol = (() => {

    const protocol = {};

    protocol.Brush = (function() {

        function Brush(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        Brush.prototype.color = 0;
        Brush.prototype.noise = 0;
        Brush.prototype.type = 0;
        Brush.prototype.shape = 0;
        Brush.prototype.size = 0;

        Brush.create = function create(properties) {
            return new Brush(properties);
        };

        Brush.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.color != null && Object.hasOwnProperty.call(message, "color"))
                writer.uint32(8).uint32(message.color);
            if (message.noise != null && Object.hasOwnProperty.call(message, "noise"))
                writer.uint32(21).float(message.noise);
            if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                writer.uint32(24).int32(message.type);
            if (message.shape != null && Object.hasOwnProperty.call(message, "shape"))
                writer.uint32(32).int32(message.shape);
            if (message.size != null && Object.hasOwnProperty.call(message, "size"))
                writer.uint32(40).uint32(message.size);
            return writer;
        };

        Brush.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        Brush.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.protocol.Brush();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    message.color = reader.uint32();
                    break;
                case 2:
                    message.noise = reader.float();
                    break;
                case 3:
                    message.type = reader.int32();
                    break;
                case 4:
                    message.shape = reader.int32();
                    break;
                case 5:
                    message.size = reader.uint32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        Brush.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        Brush.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.color != null && message.hasOwnProperty("color"))
                if (!$util.isInteger(message.color))
                    return "color: integer expected";
            if (message.noise != null && message.hasOwnProperty("noise"))
                if (typeof message.noise !== "number")
                    return "noise: number expected";
            if (message.type != null && message.hasOwnProperty("type"))
                switch (message.type) {
                default:
                    return "type: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                    break;
                }
            if (message.shape != null && message.hasOwnProperty("shape"))
                switch (message.shape) {
                default:
                    return "shape: enum value expected";
                case 0:
                case 1:
                    break;
                }
            if (message.size != null && message.hasOwnProperty("size"))
                if (!$util.isInteger(message.size))
                    return "size: integer expected";
            return null;
        };

        Brush.fromObject = function fromObject(object) {
            if (object instanceof $root.protocol.Brush)
                return object;
            let message = new $root.protocol.Brush();
            if (object.color != null)
                message.color = object.color >>> 0;
            if (object.noise != null)
                message.noise = Number(object.noise);
            switch (object.type) {
            case "AIR":
            case 0:
                message.type = 0;
                break;
            case "DIRT":
            case 1:
                message.type = 1;
                break;
            case "LIGHT":
            case 2:
                message.type = 2;
                break;
            case "STONE":
            case 3:
                message.type = 3;
                break;
            }
            switch (object.shape) {
            case "BOX":
            case 0:
                message.shape = 0;
                break;
            case "SPHERE":
            case 1:
                message.shape = 1;
                break;
            }
            if (object.size != null)
                message.size = object.size >>> 0;
            return message;
        };

        Brush.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.color = 0;
                object.noise = 0;
                object.type = options.enums === String ? "AIR" : 0;
                object.shape = options.enums === String ? "BOX" : 0;
                object.size = 0;
            }
            if (message.color != null && message.hasOwnProperty("color"))
                object.color = message.color;
            if (message.noise != null && message.hasOwnProperty("noise"))
                object.noise = options.json && !isFinite(message.noise) ? String(message.noise) : message.noise;
            if (message.type != null && message.hasOwnProperty("type"))
                object.type = options.enums === String ? $root.protocol.Brush.Type[message.type] : message.type;
            if (message.shape != null && message.hasOwnProperty("shape"))
                object.shape = options.enums === String ? $root.protocol.Brush.Shape[message.shape] : message.shape;
            if (message.size != null && message.hasOwnProperty("size"))
                object.size = message.size;
            return object;
        };

        Brush.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        Brush.Shape = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "BOX"] = 0;
            values[valuesById[1] = "SPHERE"] = 1;
            return values;
        })();

        Brush.Type = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "AIR"] = 0;
            values[valuesById[1] = "DIRT"] = 1;
            values[valuesById[2] = "LIGHT"] = 2;
            values[valuesById[3] = "STONE"] = 3;
            return values;
        })();

        return Brush;
    })();

    protocol.Voxel = (function() {

        function Voxel(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        Voxel.prototype.x = 0;
        Voxel.prototype.y = 0;
        Voxel.prototype.z = 0;

        Voxel.create = function create(properties) {
            return new Voxel(properties);
        };

        Voxel.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.x != null && Object.hasOwnProperty.call(message, "x"))
                writer.uint32(8).uint32(message.x);
            if (message.y != null && Object.hasOwnProperty.call(message, "y"))
                writer.uint32(16).uint32(message.y);
            if (message.z != null && Object.hasOwnProperty.call(message, "z"))
                writer.uint32(24).uint32(message.z);
            return writer;
        };

        Voxel.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        Voxel.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.protocol.Voxel();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    message.x = reader.uint32();
                    break;
                case 2:
                    message.y = reader.uint32();
                    break;
                case 3:
                    message.z = reader.uint32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        Voxel.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        Voxel.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.x != null && message.hasOwnProperty("x"))
                if (!$util.isInteger(message.x))
                    return "x: integer expected";
            if (message.y != null && message.hasOwnProperty("y"))
                if (!$util.isInteger(message.y))
                    return "y: integer expected";
            if (message.z != null && message.hasOwnProperty("z"))
                if (!$util.isInteger(message.z))
                    return "z: integer expected";
            return null;
        };

        Voxel.fromObject = function fromObject(object) {
            if (object instanceof $root.protocol.Voxel)
                return object;
            let message = new $root.protocol.Voxel();
            if (object.x != null)
                message.x = object.x >>> 0;
            if (object.y != null)
                message.y = object.y >>> 0;
            if (object.z != null)
                message.z = object.z >>> 0;
            return message;
        };

        Voxel.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.x = 0;
                object.y = 0;
                object.z = 0;
            }
            if (message.x != null && message.hasOwnProperty("x"))
                object.x = message.x;
            if (message.y != null && message.hasOwnProperty("y"))
                object.y = message.y;
            if (message.z != null && message.hasOwnProperty("z"))
                object.z = message.z;
            return object;
        };

        Voxel.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return Voxel;
    })();

    protocol.Dude = (function() {

        function Dude(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        Dude.prototype.id = "";
        Dude.prototype.position = null;
        Dude.prototype.target = null;
        Dude.prototype.primary = 0;
        Dude.prototype.secondary = 0;
        Dude.prototype.skin = 0;
        Dude.prototype.stamina = 0;
        Dude.prototype.height = 0;
        Dude.prototype.waist = 0;
        Dude.prototype.torsoWidth = 0;
        Dude.prototype.torsoHeight = 0;
        Dude.prototype.torsoDepth = 0;
        Dude.prototype.headShape = 0;
        Dude.prototype.headWidth = 0;
        Dude.prototype.headHeight = 0;
        Dude.prototype.headDepth = 0;
        Dude.prototype.legsHeight = 0;
        Dude.prototype.armsHeight = 0;
        Dude.prototype.hat = 0;

        Dude.create = function create(properties) {
            return new Dude(properties);
        };

        Dude.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(10).string(message.id);
            if (message.position != null && Object.hasOwnProperty.call(message, "position"))
                $root.protocol.Voxel.encode(message.position, writer.uint32(18).fork()).ldelim();
            if (message.target != null && Object.hasOwnProperty.call(message, "target"))
                $root.protocol.Voxel.encode(message.target, writer.uint32(26).fork()).ldelim();
            if (message.primary != null && Object.hasOwnProperty.call(message, "primary"))
                writer.uint32(32).uint32(message.primary);
            if (message.secondary != null && Object.hasOwnProperty.call(message, "secondary"))
                writer.uint32(40).uint32(message.secondary);
            if (message.skin != null && Object.hasOwnProperty.call(message, "skin"))
                writer.uint32(48).uint32(message.skin);
            if (message.stamina != null && Object.hasOwnProperty.call(message, "stamina"))
                writer.uint32(61).float(message.stamina);
            if (message.height != null && Object.hasOwnProperty.call(message, "height"))
                writer.uint32(69).float(message.height);
            if (message.waist != null && Object.hasOwnProperty.call(message, "waist"))
                writer.uint32(77).float(message.waist);
            if (message.torsoWidth != null && Object.hasOwnProperty.call(message, "torsoWidth"))
                writer.uint32(85).float(message.torsoWidth);
            if (message.torsoHeight != null && Object.hasOwnProperty.call(message, "torsoHeight"))
                writer.uint32(93).float(message.torsoHeight);
            if (message.torsoDepth != null && Object.hasOwnProperty.call(message, "torsoDepth"))
                writer.uint32(101).float(message.torsoDepth);
            if (message.headShape != null && Object.hasOwnProperty.call(message, "headShape"))
                writer.uint32(104).int32(message.headShape);
            if (message.headWidth != null && Object.hasOwnProperty.call(message, "headWidth"))
                writer.uint32(117).float(message.headWidth);
            if (message.headHeight != null && Object.hasOwnProperty.call(message, "headHeight"))
                writer.uint32(125).float(message.headHeight);
            if (message.headDepth != null && Object.hasOwnProperty.call(message, "headDepth"))
                writer.uint32(133).float(message.headDepth);
            if (message.legsHeight != null && Object.hasOwnProperty.call(message, "legsHeight"))
                writer.uint32(141).float(message.legsHeight);
            if (message.armsHeight != null && Object.hasOwnProperty.call(message, "armsHeight"))
                writer.uint32(149).float(message.armsHeight);
            if (message.hat != null && Object.hasOwnProperty.call(message, "hat"))
                writer.uint32(157).float(message.hat);
            return writer;
        };

        Dude.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        Dude.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.protocol.Dude();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    message.id = reader.string();
                    break;
                case 2:
                    message.position = $root.protocol.Voxel.decode(reader, reader.uint32());
                    break;
                case 3:
                    message.target = $root.protocol.Voxel.decode(reader, reader.uint32());
                    break;
                case 4:
                    message.primary = reader.uint32();
                    break;
                case 5:
                    message.secondary = reader.uint32();
                    break;
                case 6:
                    message.skin = reader.uint32();
                    break;
                case 7:
                    message.stamina = reader.float();
                    break;
                case 8:
                    message.height = reader.float();
                    break;
                case 9:
                    message.waist = reader.float();
                    break;
                case 10:
                    message.torsoWidth = reader.float();
                    break;
                case 11:
                    message.torsoHeight = reader.float();
                    break;
                case 12:
                    message.torsoDepth = reader.float();
                    break;
                case 13:
                    message.headShape = reader.int32();
                    break;
                case 14:
                    message.headWidth = reader.float();
                    break;
                case 15:
                    message.headHeight = reader.float();
                    break;
                case 16:
                    message.headDepth = reader.float();
                    break;
                case 17:
                    message.legsHeight = reader.float();
                    break;
                case 18:
                    message.armsHeight = reader.float();
                    break;
                case 19:
                    message.hat = reader.float();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        Dude.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        Dude.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isString(message.id))
                    return "id: string expected";
            if (message.position != null && message.hasOwnProperty("position")) {
                let error = $root.protocol.Voxel.verify(message.position);
                if (error)
                    return "position." + error;
            }
            if (message.target != null && message.hasOwnProperty("target")) {
                let error = $root.protocol.Voxel.verify(message.target);
                if (error)
                    return "target." + error;
            }
            if (message.primary != null && message.hasOwnProperty("primary"))
                if (!$util.isInteger(message.primary))
                    return "primary: integer expected";
            if (message.secondary != null && message.hasOwnProperty("secondary"))
                if (!$util.isInteger(message.secondary))
                    return "secondary: integer expected";
            if (message.skin != null && message.hasOwnProperty("skin"))
                if (!$util.isInteger(message.skin))
                    return "skin: integer expected";
            if (message.stamina != null && message.hasOwnProperty("stamina"))
                if (typeof message.stamina !== "number")
                    return "stamina: number expected";
            if (message.height != null && message.hasOwnProperty("height"))
                if (typeof message.height !== "number")
                    return "height: number expected";
            if (message.waist != null && message.hasOwnProperty("waist"))
                if (typeof message.waist !== "number")
                    return "waist: number expected";
            if (message.torsoWidth != null && message.hasOwnProperty("torsoWidth"))
                if (typeof message.torsoWidth !== "number")
                    return "torsoWidth: number expected";
            if (message.torsoHeight != null && message.hasOwnProperty("torsoHeight"))
                if (typeof message.torsoHeight !== "number")
                    return "torsoHeight: number expected";
            if (message.torsoDepth != null && message.hasOwnProperty("torsoDepth"))
                if (typeof message.torsoDepth !== "number")
                    return "torsoDepth: number expected";
            if (message.headShape != null && message.hasOwnProperty("headShape"))
                switch (message.headShape) {
                default:
                    return "headShape: enum value expected";
                case 0:
                case 1:
                    break;
                }
            if (message.headWidth != null && message.hasOwnProperty("headWidth"))
                if (typeof message.headWidth !== "number")
                    return "headWidth: number expected";
            if (message.headHeight != null && message.hasOwnProperty("headHeight"))
                if (typeof message.headHeight !== "number")
                    return "headHeight: number expected";
            if (message.headDepth != null && message.hasOwnProperty("headDepth"))
                if (typeof message.headDepth !== "number")
                    return "headDepth: number expected";
            if (message.legsHeight != null && message.hasOwnProperty("legsHeight"))
                if (typeof message.legsHeight !== "number")
                    return "legsHeight: number expected";
            if (message.armsHeight != null && message.hasOwnProperty("armsHeight"))
                if (typeof message.armsHeight !== "number")
                    return "armsHeight: number expected";
            if (message.hat != null && message.hasOwnProperty("hat"))
                if (typeof message.hat !== "number")
                    return "hat: number expected";
            return null;
        };

        Dude.fromObject = function fromObject(object) {
            if (object instanceof $root.protocol.Dude)
                return object;
            let message = new $root.protocol.Dude();
            if (object.id != null)
                message.id = String(object.id);
            if (object.position != null) {
                if (typeof object.position !== "object")
                    throw TypeError(".protocol.Dude.position: object expected");
                message.position = $root.protocol.Voxel.fromObject(object.position);
            }
            if (object.target != null) {
                if (typeof object.target !== "object")
                    throw TypeError(".protocol.Dude.target: object expected");
                message.target = $root.protocol.Voxel.fromObject(object.target);
            }
            if (object.primary != null)
                message.primary = object.primary >>> 0;
            if (object.secondary != null)
                message.secondary = object.secondary >>> 0;
            if (object.skin != null)
                message.skin = object.skin >>> 0;
            if (object.stamina != null)
                message.stamina = Number(object.stamina);
            if (object.height != null)
                message.height = Number(object.height);
            if (object.waist != null)
                message.waist = Number(object.waist);
            if (object.torsoWidth != null)
                message.torsoWidth = Number(object.torsoWidth);
            if (object.torsoHeight != null)
                message.torsoHeight = Number(object.torsoHeight);
            if (object.torsoDepth != null)
                message.torsoDepth = Number(object.torsoDepth);
            switch (object.headShape) {
            case "BOX":
            case 0:
                message.headShape = 0;
                break;
            case "CONE":
            case 1:
                message.headShape = 1;
                break;
            }
            if (object.headWidth != null)
                message.headWidth = Number(object.headWidth);
            if (object.headHeight != null)
                message.headHeight = Number(object.headHeight);
            if (object.headDepth != null)
                message.headDepth = Number(object.headDepth);
            if (object.legsHeight != null)
                message.legsHeight = Number(object.legsHeight);
            if (object.armsHeight != null)
                message.armsHeight = Number(object.armsHeight);
            if (object.hat != null)
                message.hat = Number(object.hat);
            return message;
        };

        Dude.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.id = "";
                object.position = null;
                object.target = null;
                object.primary = 0;
                object.secondary = 0;
                object.skin = 0;
                object.stamina = 0;
                object.height = 0;
                object.waist = 0;
                object.torsoWidth = 0;
                object.torsoHeight = 0;
                object.torsoDepth = 0;
                object.headShape = options.enums === String ? "BOX" : 0;
                object.headWidth = 0;
                object.headHeight = 0;
                object.headDepth = 0;
                object.legsHeight = 0;
                object.armsHeight = 0;
                object.hat = 0;
            }
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            if (message.position != null && message.hasOwnProperty("position"))
                object.position = $root.protocol.Voxel.toObject(message.position, options);
            if (message.target != null && message.hasOwnProperty("target"))
                object.target = $root.protocol.Voxel.toObject(message.target, options);
            if (message.primary != null && message.hasOwnProperty("primary"))
                object.primary = message.primary;
            if (message.secondary != null && message.hasOwnProperty("secondary"))
                object.secondary = message.secondary;
            if (message.skin != null && message.hasOwnProperty("skin"))
                object.skin = message.skin;
            if (message.stamina != null && message.hasOwnProperty("stamina"))
                object.stamina = options.json && !isFinite(message.stamina) ? String(message.stamina) : message.stamina;
            if (message.height != null && message.hasOwnProperty("height"))
                object.height = options.json && !isFinite(message.height) ? String(message.height) : message.height;
            if (message.waist != null && message.hasOwnProperty("waist"))
                object.waist = options.json && !isFinite(message.waist) ? String(message.waist) : message.waist;
            if (message.torsoWidth != null && message.hasOwnProperty("torsoWidth"))
                object.torsoWidth = options.json && !isFinite(message.torsoWidth) ? String(message.torsoWidth) : message.torsoWidth;
            if (message.torsoHeight != null && message.hasOwnProperty("torsoHeight"))
                object.torsoHeight = options.json && !isFinite(message.torsoHeight) ? String(message.torsoHeight) : message.torsoHeight;
            if (message.torsoDepth != null && message.hasOwnProperty("torsoDepth"))
                object.torsoDepth = options.json && !isFinite(message.torsoDepth) ? String(message.torsoDepth) : message.torsoDepth;
            if (message.headShape != null && message.hasOwnProperty("headShape"))
                object.headShape = options.enums === String ? $root.protocol.Dude.Shape[message.headShape] : message.headShape;
            if (message.headWidth != null && message.hasOwnProperty("headWidth"))
                object.headWidth = options.json && !isFinite(message.headWidth) ? String(message.headWidth) : message.headWidth;
            if (message.headHeight != null && message.hasOwnProperty("headHeight"))
                object.headHeight = options.json && !isFinite(message.headHeight) ? String(message.headHeight) : message.headHeight;
            if (message.headDepth != null && message.hasOwnProperty("headDepth"))
                object.headDepth = options.json && !isFinite(message.headDepth) ? String(message.headDepth) : message.headDepth;
            if (message.legsHeight != null && message.hasOwnProperty("legsHeight"))
                object.legsHeight = options.json && !isFinite(message.legsHeight) ? String(message.legsHeight) : message.legsHeight;
            if (message.armsHeight != null && message.hasOwnProperty("armsHeight"))
                object.armsHeight = options.json && !isFinite(message.armsHeight) ? String(message.armsHeight) : message.armsHeight;
            if (message.hat != null && message.hasOwnProperty("hat"))
                object.hat = options.json && !isFinite(message.hat) ? String(message.hat) : message.hat;
            return object;
        };

        Dude.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        Dude.Shape = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "BOX"] = 0;
            values[valuesById[1] = "CONE"] = 1;
            return values;
        })();

        return Dude;
    })();

    protocol.World = (function() {

        function World(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        World.prototype.width = 0;
        World.prototype.height = 0;
        World.prototype.depth = 0;
        World.prototype.voxels = $util.newBuffer([]);

        World.create = function create(properties) {
            return new World(properties);
        };

        World.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.width != null && Object.hasOwnProperty.call(message, "width"))
                writer.uint32(8).uint32(message.width);
            if (message.height != null && Object.hasOwnProperty.call(message, "height"))
                writer.uint32(16).uint32(message.height);
            if (message.depth != null && Object.hasOwnProperty.call(message, "depth"))
                writer.uint32(24).uint32(message.depth);
            if (message.voxels != null && Object.hasOwnProperty.call(message, "voxels"))
                writer.uint32(34).bytes(message.voxels);
            return writer;
        };

        World.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        World.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.protocol.World();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    message.width = reader.uint32();
                    break;
                case 2:
                    message.height = reader.uint32();
                    break;
                case 3:
                    message.depth = reader.uint32();
                    break;
                case 4:
                    message.voxels = reader.bytes();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        World.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        World.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.width != null && message.hasOwnProperty("width"))
                if (!$util.isInteger(message.width))
                    return "width: integer expected";
            if (message.height != null && message.hasOwnProperty("height"))
                if (!$util.isInteger(message.height))
                    return "height: integer expected";
            if (message.depth != null && message.hasOwnProperty("depth"))
                if (!$util.isInteger(message.depth))
                    return "depth: integer expected";
            if (message.voxels != null && message.hasOwnProperty("voxels"))
                if (!(message.voxels && typeof message.voxels.length === "number" || $util.isString(message.voxels)))
                    return "voxels: buffer expected";
            return null;
        };

        World.fromObject = function fromObject(object) {
            if (object instanceof $root.protocol.World)
                return object;
            let message = new $root.protocol.World();
            if (object.width != null)
                message.width = object.width >>> 0;
            if (object.height != null)
                message.height = object.height >>> 0;
            if (object.depth != null)
                message.depth = object.depth >>> 0;
            if (object.voxels != null)
                if (typeof object.voxels === "string")
                    $util.base64.decode(object.voxels, message.voxels = $util.newBuffer($util.base64.length(object.voxels)), 0);
                else if (object.voxels.length)
                    message.voxels = object.voxels;
            return message;
        };

        World.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.width = 0;
                object.height = 0;
                object.depth = 0;
                if (options.bytes === String)
                    object.voxels = "";
                else {
                    object.voxels = [];
                    if (options.bytes !== Array)
                        object.voxels = $util.newBuffer(object.voxels);
                }
            }
            if (message.width != null && message.hasOwnProperty("width"))
                object.width = message.width;
            if (message.height != null && message.hasOwnProperty("height"))
                object.height = message.height;
            if (message.depth != null && message.hasOwnProperty("depth"))
                object.depth = message.depth;
            if (message.voxels != null && message.hasOwnProperty("voxels"))
                object.voxels = options.bytes === String ? $util.base64.encode(message.voxels, 0, message.voxels.length) : options.bytes === Array ? Array.prototype.slice.call(message.voxels) : message.voxels;
            return object;
        };

        World.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return World;
    })();

    protocol.Message = (function() {

        function Message(properties) {
            this.dudes = [];
            this.peers = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        Message.prototype.type = 1;
        Message.prototype.brush = null;
        Message.prototype.voxel = null;
        Message.prototype.id = "";
        Message.prototype.signal = "";
        Message.prototype.dudes = $util.emptyArray;
        Message.prototype.peers = $util.emptyArray;
        Message.prototype.world = null;

        Message.create = function create(properties) {
            return new Message(properties);
        };

        Message.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                writer.uint32(8).int32(message.type);
            if (message.brush != null && Object.hasOwnProperty.call(message, "brush"))
                $root.protocol.Brush.encode(message.brush, writer.uint32(18).fork()).ldelim();
            if (message.voxel != null && Object.hasOwnProperty.call(message, "voxel"))
                $root.protocol.Voxel.encode(message.voxel, writer.uint32(26).fork()).ldelim();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(34).string(message.id);
            if (message.signal != null && Object.hasOwnProperty.call(message, "signal"))
                writer.uint32(42).string(message.signal);
            if (message.dudes != null && message.dudes.length)
                for (let i = 0; i < message.dudes.length; ++i)
                    $root.protocol.Dude.encode(message.dudes[i], writer.uint32(50).fork()).ldelim();
            if (message.peers != null && message.peers.length)
                for (let i = 0; i < message.peers.length; ++i)
                    writer.uint32(58).string(message.peers[i]);
            if (message.world != null && Object.hasOwnProperty.call(message, "world"))
                $root.protocol.World.encode(message.world, writer.uint32(66).fork()).ldelim();
            return writer;
        };

        Message.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        Message.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.protocol.Message();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    message.type = reader.int32();
                    break;
                case 2:
                    message.brush = $root.protocol.Brush.decode(reader, reader.uint32());
                    break;
                case 3:
                    message.voxel = $root.protocol.Voxel.decode(reader, reader.uint32());
                    break;
                case 4:
                    message.id = reader.string();
                    break;
                case 5:
                    message.signal = reader.string();
                    break;
                case 6:
                    if (!(message.dudes && message.dudes.length))
                        message.dudes = [];
                    message.dudes.push($root.protocol.Dude.decode(reader, reader.uint32()));
                    break;
                case 7:
                    if (!(message.peers && message.peers.length))
                        message.peers = [];
                    message.peers.push(reader.string());
                    break;
                case 8:
                    message.world = $root.protocol.World.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        Message.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        Message.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.type != null && message.hasOwnProperty("type"))
                switch (message.type) {
                default:
                    return "type: enum value expected";
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                case 8:
                case 9:
                    break;
                }
            if (message.brush != null && message.hasOwnProperty("brush")) {
                let error = $root.protocol.Brush.verify(message.brush);
                if (error)
                    return "brush." + error;
            }
            if (message.voxel != null && message.hasOwnProperty("voxel")) {
                let error = $root.protocol.Voxel.verify(message.voxel);
                if (error)
                    return "voxel." + error;
            }
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isString(message.id))
                    return "id: string expected";
            if (message.signal != null && message.hasOwnProperty("signal"))
                if (!$util.isString(message.signal))
                    return "signal: string expected";
            if (message.dudes != null && message.hasOwnProperty("dudes")) {
                if (!Array.isArray(message.dudes))
                    return "dudes: array expected";
                for (let i = 0; i < message.dudes.length; ++i) {
                    let error = $root.protocol.Dude.verify(message.dudes[i]);
                    if (error)
                        return "dudes." + error;
                }
            }
            if (message.peers != null && message.hasOwnProperty("peers")) {
                if (!Array.isArray(message.peers))
                    return "peers: array expected";
                for (let i = 0; i < message.peers.length; ++i)
                    if (!$util.isString(message.peers[i]))
                        return "peers: string[] expected";
            }
            if (message.world != null && message.hasOwnProperty("world")) {
                let error = $root.protocol.World.verify(message.world);
                if (error)
                    return "world." + error;
            }
            return null;
        };

        Message.fromObject = function fromObject(object) {
            if (object instanceof $root.protocol.Message)
                return object;
            let message = new $root.protocol.Message();
            switch (object.type) {
            case "LOAD":
            case 1:
                message.type = 1;
                break;
            case "UPDATE":
            case 2:
                message.type = 2;
                break;
            case "JOIN":
            case 3:
                message.type = 3;
                break;
            case "LEAVE":
            case 4:
                message.type = 4;
                break;
            case "SIGNAL":
            case 5:
                message.type = 5;
                break;
            case "HIT":
            case 6:
                message.type = 6;
                break;
            case "SELECT":
            case 7:
                message.type = 7;
                break;
            case "SPAWN":
            case 8:
                message.type = 8;
                break;
            case "TARGET":
            case 9:
                message.type = 9;
                break;
            }
            if (object.brush != null) {
                if (typeof object.brush !== "object")
                    throw TypeError(".protocol.Message.brush: object expected");
                message.brush = $root.protocol.Brush.fromObject(object.brush);
            }
            if (object.voxel != null) {
                if (typeof object.voxel !== "object")
                    throw TypeError(".protocol.Message.voxel: object expected");
                message.voxel = $root.protocol.Voxel.fromObject(object.voxel);
            }
            if (object.id != null)
                message.id = String(object.id);
            if (object.signal != null)
                message.signal = String(object.signal);
            if (object.dudes) {
                if (!Array.isArray(object.dudes))
                    throw TypeError(".protocol.Message.dudes: array expected");
                message.dudes = [];
                for (let i = 0; i < object.dudes.length; ++i) {
                    if (typeof object.dudes[i] !== "object")
                        throw TypeError(".protocol.Message.dudes: object expected");
                    message.dudes[i] = $root.protocol.Dude.fromObject(object.dudes[i]);
                }
            }
            if (object.peers) {
                if (!Array.isArray(object.peers))
                    throw TypeError(".protocol.Message.peers: array expected");
                message.peers = [];
                for (let i = 0; i < object.peers.length; ++i)
                    message.peers[i] = String(object.peers[i]);
            }
            if (object.world != null) {
                if (typeof object.world !== "object")
                    throw TypeError(".protocol.Message.world: object expected");
                message.world = $root.protocol.World.fromObject(object.world);
            }
            return message;
        };

        Message.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults) {
                object.dudes = [];
                object.peers = [];
            }
            if (options.defaults) {
                object.type = options.enums === String ? "LOAD" : 1;
                object.brush = null;
                object.voxel = null;
                object.id = "";
                object.signal = "";
                object.world = null;
            }
            if (message.type != null && message.hasOwnProperty("type"))
                object.type = options.enums === String ? $root.protocol.Message.Type[message.type] : message.type;
            if (message.brush != null && message.hasOwnProperty("brush"))
                object.brush = $root.protocol.Brush.toObject(message.brush, options);
            if (message.voxel != null && message.hasOwnProperty("voxel"))
                object.voxel = $root.protocol.Voxel.toObject(message.voxel, options);
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            if (message.signal != null && message.hasOwnProperty("signal"))
                object.signal = message.signal;
            if (message.dudes && message.dudes.length) {
                object.dudes = [];
                for (let j = 0; j < message.dudes.length; ++j)
                    object.dudes[j] = $root.protocol.Dude.toObject(message.dudes[j], options);
            }
            if (message.peers && message.peers.length) {
                object.peers = [];
                for (let j = 0; j < message.peers.length; ++j)
                    object.peers[j] = message.peers[j];
            }
            if (message.world != null && message.hasOwnProperty("world"))
                object.world = $root.protocol.World.toObject(message.world, options);
            return object;
        };

        Message.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        Message.Type = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "LOAD"] = 1;
            values[valuesById[2] = "UPDATE"] = 2;
            values[valuesById[3] = "JOIN"] = 3;
            values[valuesById[4] = "LEAVE"] = 4;
            values[valuesById[5] = "SIGNAL"] = 5;
            values[valuesById[6] = "HIT"] = 6;
            values[valuesById[7] = "SELECT"] = 7;
            values[valuesById[8] = "SPAWN"] = 8;
            values[valuesById[9] = "TARGET"] = 9;
            return values;
        })();

        return Message;
    })();

    return protocol;
})();

export { $root as default };
