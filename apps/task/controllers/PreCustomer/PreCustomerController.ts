import BaseController from '../BaseController';
import Util from '../../../common/Util/Util';
import {Models} from "@motionpicture/ttts-domain";
import conf = require('config');
import mongodb = require('mongodb');
import mongoose = require('mongoose');
import fs = require('fs-extra');
import crypto = require('crypto');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class PreCustomerController extends BaseController {
    public createCollection() {
        mongodb.MongoClient.connect(conf.get<string>('mongolab_uri'), (err, db) => {
            if (err) throw err;

            let collectionName = 'pre_customers';
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
            let preCustomers: Array<any> = JSON.parse(data);

            // あれば更新、なければ追加
            let docs = preCustomers.map((preCustomer) => {
                // パスワードハッシュ化
                let password_salt = crypto.randomBytes(64).toString('hex');
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
            })
        });
    }
}
