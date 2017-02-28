/**
 * 電話窓口タスクコントローラー
 *
 * @namespace task/TelController
 */

import { Models } from '@motionpicture/chevre-domain';
import * as Util from '../../../common/Util/Util';

import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as log4js from 'log4js';
import * as mongoose from 'mongoose';

const MONGOLAB_URI = process.env.MONGOLAB_URI;

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
 * @memberOf task/TelController
 */
export function createFromJson(): void {
    mongoose.connect(MONGOLAB_URI, {});

    fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/telStaffs.json`, 'utf8', (err, data) => {
        if (err) throw err;
        let telStaffs: any[] = JSON.parse(data);

        // パスワードハッシュ化
        telStaffs = telStaffs.map((telStaff) => {
            const SIZE = 64;
            const passwordSalt = crypto.randomBytes(SIZE).toString('hex');
            telStaff.password_salt = passwordSalt;
            telStaff.password_hash = Util.createHash(telStaff.password, passwordSalt);
            return telStaff;
        });

        logger.info('removing all telStaffs...');
        Models.TelStaff.remove({}, (removeErr) => {
            if (removeErr) {
                logger.info('telStaffs removed.', err);
                mongoose.disconnect();
                process.exit(0);
                return;
            }

            logger.debug('creating telStaffs...');
            Models.TelStaff.create(
                telStaffs,
                (createErr) => {
                    logger.info('telStaffs created.', createErr);
                    mongoose.disconnect();
                    process.exit(0);
                }
            );
        });
    });
}
