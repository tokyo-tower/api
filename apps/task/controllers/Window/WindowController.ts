import {Models} from '@motionpicture/ttts-domain';
import Util from '../../../common/Util/Util';
import BaseController from '../BaseController';
import * as conf from 'config';
import * as mongoose from 'mongoose';
import * as fs from 'fs-extra';
import * as crypto from 'crypto';

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
                const password_salt = crypto.randomBytes(64).toString('hex');
                window.password_salt = password_salt;
                window.password_hash = Util.createHash(window.password, password_salt);
                return window;
            });

            this.logger.info('removing all windows...');
            Models.Window.remove({}, (err) => {
                if (err) throw err;

                this.logger.debug('creating windows...');
                Models.Window.create(
                    windows,
                    (err) => {
                        this.logger.info('windows created.', err);
                        mongoose.disconnect();
                        process.exit(0);
                    }
                );
            });
        });
    }
}
