"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.requestLogger = requestLogger;
var winston_1 = require("winston");
var uuid_1 = require("uuid");
var config_1 = require("../../config");
exports.logger = winston_1.default.createLogger({
    level: config_1.config.logLevel,
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: { service: "pulse-api", environment: config_1.config.nodeEnv },
    transports: [
        new winston_1.default.transports.Console({
            format: config_1.config.isDevelopment
                ? winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
                : undefined,
        }),
    ],
});
function requestLogger(req, res, next) {
    var requestId = (0, uuid_1.v4)();
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    var start = Date.now();
    res.on("finish", function () {
        exports.logger.info({
            requestId: requestId,
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration_ms: Date.now() - start,
            ip_hash: req.ip ? require("crypto").createHash("sha256").update(req.ip).digest("hex").substring(0, 16) : null,
            userAgent: req.headers["user-agent"],
        });
    });
    next();
}
