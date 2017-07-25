"use strict";
/**
 * スクリーンルーター
 *
 * @module routes/screens
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
const express = require("express");
const httpStatus = require("http-status");
const screenRouter = express.Router();
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const ScreenController = require("../controllers/screen");
screenRouter.use(authentication_1.default);
/**
 * スクリーンHTMLを取得する
 */
screenRouter.get('/:id/show', permitScopes_1.default(['screens', 'screens.read-only']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield ScreenController.getHtml(req.params.id).then((option) => {
            option.match({
                Some: (html) => {
                    res.status(httpStatus.OK).json({
                        data: html
                    });
                },
                None: () => {
                    res.status(httpStatus.NOT_FOUND).json({
                        data: null
                    });
                }
            });
        });
    }
    catch (error) {
        next(error);
    }
}));
exports.default = screenRouter;
