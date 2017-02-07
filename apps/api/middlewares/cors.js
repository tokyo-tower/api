"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    next();
};
