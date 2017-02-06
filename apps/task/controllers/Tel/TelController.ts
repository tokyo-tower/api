import BaseController from '../BaseController';
import Util from '../../../common/Util/Util';
import {Models} from "@motionpicture/ttts-domain";
import conf = require('config');
import mongoose = require('mongoose');
import fs = require('fs-extra');
import crypto = require('crypto');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class TelController extends BaseController {
    public createFromJson(): void {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/telStaffs.json`, 'utf8', (err, data) => {
            if (err) throw err;
            let telStaffs: Array<any> = JSON.parse(data);

            // パスワードハッシュ化
            telStaffs = telStaffs.map((telStaff) => {
                let password_salt = crypto.randomBytes(64).toString('hex');
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
