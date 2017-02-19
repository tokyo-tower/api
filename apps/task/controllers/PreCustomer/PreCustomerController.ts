import {Models} from '@motionpicture/ttts-domain';
import Util from '../../../common/Util/Util';
import BaseController from '../BaseController';
import * as conf from 'config';
import * as mongodb from 'mongodb';
import * as mongoose from 'mongoose';
import * as fs from 'fs-extra';
import * as crypto from 'crypto';

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
            db.collection(collectionName).drop((err) => {
                this.logger.debug('collection dropped.', collectionName, err);
                this.logger.debug('creating collection.', collectionName);
                db.createCollection(collectionName, {}, (err) => {
                    this.logger.debug('collection created.', collectionName, err);

                    db.collection(collectionName).createIndex(
                        {user_id: 1},
                        {unique: true},
                        (err) => {
                            this.logger.debug('index created.', err);

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
                const password_salt = crypto.randomBytes(64).toString('hex');
                preCustomer['password_salt'] = password_salt;
                preCustomer['password_hash'] = Util.createHash(preCustomer.password, password_salt);
                return preCustomer;
            });

            Models.PreCustomer.remove((err: any) => {
                if (err) throw err;

                this.logger.debug('creating perCustomers...length:', docs.length);
                Models.PreCustomer.insertMany(docs, (err) => {
                    this.logger.debug('perCustomers created.', err);

                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
}
