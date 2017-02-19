import { Models } from '@motionpicture/ttts-domain';
import * as Util from '../../../../common/Util/Util';
import BaseController from '../BaseController';

import * as conf from 'config';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as mongodb from 'mongodb';
import * as mongoose from 'mongoose';

const MONGOLAB_URI = conf.get<string>('mongolab_uri');

/**
 * 先行予約アカウントタスクコントローラー
 *
 * @export
 * @class PreCustomerController
 * @extends {BaseController}
 */
export default class PreCustomerController extends BaseController {
    public createCollection() {
        mongodb.MongoClient.connect(conf.get<string>('mongolab_uri'), (err, db) => {
            if (err) throw err;

            const collectionName = 'pre_customers';
            this.logger.debug('dropping collection...', collectionName);
            db.collection(collectionName).drop((dropErr) => {
                this.logger.debug('collection dropped.', collectionName, dropErr);
                this.logger.debug('creating collection.', collectionName);
                db.createCollection(collectionName, {}, (createCollectionErr) => {
                    this.logger.debug('collection created.', collectionName, createCollectionErr);

                    db.collection(collectionName).createIndex(
                        { user_id: 1 },
                        { unique: true },
                        (createIndexErr) => {
                            this.logger.debug('index created.', createIndexErr);

                            db.close();
                            process.exit(0);
                        }
                    );
                });
            });

        });
    }

    public createFromJson(): void {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/preCustomers.json`, 'utf8', (err, data) => {
            if (err) throw err;
            const preCustomers: any[] = JSON.parse(data);

            // あれば更新、なければ追加
            const docs = preCustomers.map((preCustomer) => {
                // パスワードハッシュ化
                const SIZE = 64;
                const passwordSalt = crypto.randomBytes(SIZE).toString('hex');
                preCustomer.password_salt = passwordSalt;
                preCustomer.password_hash = Util.createHash(preCustomer.password, passwordSalt);
                return preCustomer;
            });

            Models.PreCustomer.remove((removeErr: any) => {
                if (removeErr) throw removeErr;

                this.logger.debug('creating perCustomers...length:', docs.length);
                Models.PreCustomer.insertMany(docs, (insertErr) => {
                    this.logger.debug('perCustomers created.', insertErr);

                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
}
