import BaseController from '../BaseController';
import {Models} from "@motionpicture/ttts-domain";
import fs = require('fs-extra');

export default class ScreenController extends BaseController {
    /**
     * スクリーンの座席マップを生成する
     */
    public show() {
        // スクリーンを取得
        Models.Screen.count(
            {
                _id: this.req.params.id
            },
            (err, count) => {
                if (err) {
                    this.res.send('false');
                    return;
                }
                if (count === 0) {
                    this.res.send('false');
                    return;
                }

                // スクリーン座席表HTMLを出力
                this.res.type('txt');
                fs.readFile(`${__dirname}/../../../common/views/screens/${this.req.params.id}.ejs`, 'utf8', (err, data) => {
                    if (err) return this.next(err);

                    this.res.send(data);
                });
            }
        );
    }
}
