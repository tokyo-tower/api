"use strict";
/**
 * 取引コントローラー
 *
 * @namespace controllers/transaction
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// import * as ttts from '@motionpicture/ttts-domain';
const createDebug = require("debug");
const httpStatus = require("http-status");
const debug = createDebug('ttts-api:controllers:transaction');
function createAuthorization(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        debug(req.body);
        try {
            res.status(httpStatus.OK).json({
                data: {}
            });
        }
        catch (error) {
            next(error);
        }
    });
}
exports.createAuthorization = createAuthorization;
function deleteAuthorization(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        debug(req.body);
        try {
            res.status(httpStatus.OK).json({
                data: {}
            });
        }
        catch (error) {
            next(error);
        }
    });
}
exports.deleteAuthorization = deleteAuthorization;
function confirm(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        debug(req.body);
        try {
            res.status(httpStatus.OK).json({
                data: {}
            });
        }
        catch (error) {
            next(error);
        }
    });
}
exports.confirm = confirm;
function cancel(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        debug(req.body);
        try {
            res.status(httpStatus.OK).json({
                data: {}
            });
        }
        catch (error) {
            next(error);
        }
    });
}
exports.cancel = cancel;
