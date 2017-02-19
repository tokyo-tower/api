import { Models } from '@motionpicture/ttts-domain';
import * as Util from '../../../../common/Util/Util';
import BaseController from '../BaseController';

import * as conf from 'config';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as mongoose from 'mongoose';

const MONGOLAB_URI = conf.get<string>('mongolab_uri');

/**
 * 当日窓口アカウントタスクコントローラー
 *
 * @export
 * @class WindowController
 * @extends {BaseController}
 */
export default class WindowController extends BaseController {
    public createFromJson(): void {
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

            this.logger.info('removing all windows...');
            Models.Window.remove({}, (removeErr) => {
                if (removeErr) throw removeErr;

                this.logger.debug('creating windows...');
                Models.Window.create(
                    windows,
                    (createErr) => {
                        this.logger.info('windows created.', createErr);
                        mongoose.disconnect();
                        process.exit(0);
                    }
                );
            });
        });
    }
}
