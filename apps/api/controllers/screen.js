"use strict";
/**
 * スクリーンコントローラー
 *
 * @namespace api/ScreenController
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
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const fs = require("fs-extra");
/**
 * スクリーンの座席マップを生成する
 *
 * @memberOf api/ScreenController
 */
function show(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // スクリーンを取得
            const count = yield chevre_domain_1.Models.Screen.count({
                _id: req.params.id
            }).exec();
            if (count === 0) {
                res.type('txt').send('false');
                return;
            }
            // スクリーン座席表HTMLを出力
            fs.readFile(`${__dirname}/../../../common/views/screens/${req.params.id}.ejs`, 'utf8', (readFileErr, data) => {
                if (readFileErr instanceof Error) {
                    next(readFileErr);
                    return;
                }
                res.type('txt').send(data);
            });
        }
        catch (error) {
            res.send('false');
        }
    });
}
exports.show = show;
