"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const Util_1 = require("../../../common/Util/Util");
const BaseController_1 = require("../BaseController");
const conf = require("config");
const mongodb = require("mongodb");
const mongoose = require("mongoose");
const fs = require("fs-extra");
const crypto = require("crypto");
const MONGOLAB_URI = conf.get('mongolab_uri');
/**
 * 先行予約アカウントタスクコントローラー
 *
 * @export
 * @class PreCustomerController
 * @extends {BaseController}
 */
class PreCustomerController extends BaseController_1.default {
    createCollection() {
        mongodb.MongoClient.connect(conf.get('mongolab_uri'), (err, db) => {
            if (err)
                throw err;
            const collectionName = 'pre_customers';
            this.logger.debug('dropping collection...', collectionName);
            db.collection(collectionName).drop((err) => {
                this.logger.debug('collection dropped.', collectionName, err);
                this.logger.debug('creating collection.', collectionName);
                db.createCollection(collectionName, {}, (err) => {
                    this.logger.debug('collection created.', collectionName, err);
                    db.collection(collectionName).createIndex({ user_id: 1 }, { unique: true }, (err) => {
                        this.logger.debug('index created.', err);
                        db.close();
                        process.exit(0);
                    });
                });
            });
        });
    }
    createFromJson() {
        mongoose.connect(MONGOLAB_URI, {});
        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/preCustomers.json`, 'utf8', (err, data) => {
            if (err)
                throw err;
            const preCustomers = JSON.parse(data);
            // あれば更新、なければ追加
            const docs = preCustomers.map((preCustomer) => {
                // パスワードハッシュ化
                const password_salt = crypto.randomBytes(64).toString('hex');
                preCustomer['password_salt'] = password_salt;
                preCustomer['password_hash'] = Util_1.default.createHash(preCustomer.password, password_salt);
                return preCustomer;
            });
            ttts_domain_1.Models.PreCustomer.remove((err) => {
                if (err)
                    throw err;
                this.logger.debug('creating perCustomers...length:', docs.length);
                ttts_domain_1.Models.PreCustomer.insertMany(docs, (err) => {
                    this.logger.debug('perCustomers created.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PreCustomerController;
