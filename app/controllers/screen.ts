/**
 * スクリーンコントローラー
 *
 * @namespace controllers/screen
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as fs from 'fs-extra';

/**
 * スクリーンの座席マップを生成する
 *
 * @param {string} screenId スクリーンID
 * @return {Promise<string | null>} スクリーンのHTML
 * @memberof controllers/screen
 */
export async function getHtml(screenId: string): Promise<string | null> {
    // スクリーンの存在確認
    const count = await ttts.Models.Screen.count({ _id: screenId }).exec();
    if (count === 0) {
        return null;
    }

    // スクリーン座席表HTMLを出力
    return fs.readFile(`${__dirname}/../views/_screens/${screenId}.ejs`, 'utf8');
}
