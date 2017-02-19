import { Models } from '@motionpicture/ttts-domain';
import * as Util from '../../../../common/Util/Util';
import BaseController from '../BaseController';

import * as conf from 'config';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as mongoose from 'mongoose';

const MONGOLAB_URI = conf.get<string>('mongolab_uri');

/**
 * 電話窓口タスクコントローラー
 *
 * @export
 * @class TelController
 * @extends {BaseController}
 */
export default class TelController extends BaseController {
    public createFromJson(): void {
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

            this.logger.info('removing all telStaffs...');
            Models.TelStaff.remove({}, (removeErr) => {
                if (removeErr) {
                    this.logger.info('telStaffs removed.', err);
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }

                this.logger.debug('creating telStaffs...');
                Models.TelStaff.create(
                    telStaffs,
                    (createErr) => {
                        this.logger.info('telStaffs created.', createErr);
                        mongoose.disconnect();
                        process.exit(0);
                    }
                );
            });
        });
    }
}
