/**
 * 当日窓口アカウントタスクコントローラー
 *
 * @namespace task/WindowController
 */

import { Models } from '@motionpicture/chevre-domain';
import * as Util from '../../../common/Util/Util';

import * as conf from 'config';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as log4js from 'log4js';
import * as mongoose from 'mongoose';

const MONGOLAB_URI = conf.get<string>('mongolab_uri');

// todo ログ出力方法考える
log4js.configure({
    appenders: [
        {
            category: 'system',
            type: 'console'
        }
    ],
    levels: {
        system: 'ALL'
    },
    replaceConsole: true
});
const logger = log4js.getLogger('system');

/**
 *
 * @memberOf task/WindowController
 */
export function createFromJson() {
    mongoose.connect(MONGOLAB_URI, {});

    fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/windows.json`, 'utf8', (err, data) => {
        if (err) throw err;
        let windows: any[] = JSON.parse(data);

        // パスワードハッシュ化
        windows = windows.map((window) => {
            const SIZE = 64;
            const passwordSalt = crypto.randomBytes(SIZE).toString('hex');
            window.password_salt = passwordSalt;
            window.password_hash = Util.createHash(window.password, passwordSalt);
            return window;
        });

        logger.info('removing all windows...');
        Models.Window.remove({}, (removeErr) => {
            if (removeErr) throw removeErr;

            logger.debug('creating windows...');
            Models.Window.create(
                windows,
                (createErr) => {
                    logger.info('windows created.', createErr);
                    mongoose.disconnect();
                    process.exit(0);
                }
            );
        });
    });
}
