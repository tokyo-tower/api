/**
 * スクリーンコントローラー
 *
 * @namespace controllers/screen
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as fs from 'fs-extra';
import * as monapt from 'monapt';

/**
 * スクリーンの座席マップを生成する
 *
 * @param {string} screenId スクリーンID
 * @return {Promise<monapt.Option<string>>} スクリーンのHTML
 * @memberof controllers/screen
 */
export async function getHtml(screenId: string): Promise<monapt.Option<string>> {
    // スクリーンの存在確認
    const count = await ttts.Models.Screen.count({ _id: screenId }).exec();
    if (count === 0) {
        return monapt.None;
    }

    // スクリーン座席表HTMLを出力
    return monapt.Option(await fs.readFile(`${__dirname}/../views/_screens/${screenId}.ejs`, 'utf8'));
}
