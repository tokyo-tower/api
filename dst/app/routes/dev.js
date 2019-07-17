"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * devルーター
 *
 * @ignore
 */
const express = require("express");
const devRouter = express.Router();
const ttts = require("@tokyotower/domain");
const createDebug = require("debug");
const http_status_1 = require("http-status");
const mongooseConnectionOptions_1 = require("../../mongooseConnectionOptions");
const debug = createDebug('ttts-api:routes:dev');
devRouter.get('/500', () => {
    throw new Error('500 manually');
});
devRouter.get('/environmentVariables', (req, res) => {
    debug('ip:', req.ip);
    res.json({
        data: {
            type: 'envs',
            attributes: process.env
        }
    });
});
devRouter.get('/mongoose/connect', (__, res, next) => {
    ttts.mongoose.connect(process.env.MONGOLAB_URI, mongooseConnectionOptions_1.default, (err) => {
        if (err instanceof Error) {
            next(err);
            return;
        }
        res.status(http_status_1.NO_CONTENT)
            .end();
    });
});
devRouter.get('/mongoose/disconnect', (__, res, next) => {
    ttts.mongoose.disconnect((err) => {
        if (err instanceof Error) {
            next(err);
            return;
        }
        res.status(http_status_1.NO_CONTENT)
            .end();
    });
});
exports.default = devRouter;
