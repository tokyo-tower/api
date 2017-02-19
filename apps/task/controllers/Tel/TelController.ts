import {Models} from '@motionpicture/ttts-domain';
import Util from '../../../common/Util/Util';
import BaseController from '../BaseController';
import * as conf from 'config';
import * as mongoose from 'mongoose';
import * as fs from 'fs-extra';
import * as crypto from 'crypto';

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
                const password_salt = crypto.randomBytes(64).toString('hex');
                telStaff.password_salt = password_salt;
                telStaff.password_hash = Util.createHash(telStaff.password, password_salt);
                return telStaff;
            });

            this.logger.info('removing all telStaffs...');
            Models.TelStaff.remove({}, (err) => {
                if (err) {
                    this.logger.info('telStaffs removed.', err);
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }

                this.logger.debug('creating telStaffs...');
                Models.TelStaff.create(
                    telStaffs,
                    (err) => {
                        this.logger.info('telStaffs created.', err);
                        mongoose.disconnect();
                        process.exit(0);
                    }
                );
            });
        });
    }
}
