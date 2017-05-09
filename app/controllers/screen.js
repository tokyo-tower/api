"use strict";
/**
 * スクリーンコントローラー
 *
 * @namespace controller/screen
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
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const fs = require("fs-extra");
const http_status_1 = require("http-status");
/**
 * スクリーンの座席マップを生成する
 *
 * @memberOf controller/screen
 */
function show(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // スクリーンの存在確認
            const count = yield ttts_domain_1.Models.Screen.count({ _id: req.params.id }).exec();
            if (count === 0) {
                res.status(http_status_1.NOT_FOUND);
                res.json({
                    data: null
                });
                return;
            }
            // スクリーン座席表HTMLを出力
            fs.readFile(`${__dirname}/../views/_screens/${req.params.id}.ejs`, 'utf8', (readFileErr, data) => {
                if (readFileErr instanceof Error) {
                    next(readFileErr);
                    return;
                }
                res.status(http_status_1.OK).json({
                    data: data
                });
            });
        }
        catch (error) {
            next(error);
        }
    });
}
exports.show = show;
