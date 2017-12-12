"use strict";
/**
 * スクリーンコントローラー
 *
 * @namespace controllers/screen
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
const ttts = require("@motionpicture/ttts-domain");
const fs = require("fs-extra");
/**
 * スクリーンの座席マップを生成する
 *
 * @param {string} screenId スクリーンID
 * @return {Promise<string | null>} スクリーンのHTML
 * @memberof controllers/screen
 */
function getHtml(screenId) {
    return __awaiter(this, void 0, void 0, function* () {
        // スクリーンの存在確認
        const count = yield ttts.Models.Screen.count({ _id: screenId }).exec();
        if (count === 0) {
            return null;
        }
        // スクリーン座席表HTMLを出力
        return fs.readFile(`${__dirname}/../views/_screens/${screenId}.ejs`, 'utf8');
    });
}
exports.getHtml = getHtml;
