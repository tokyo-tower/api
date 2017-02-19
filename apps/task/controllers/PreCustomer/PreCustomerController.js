"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const Util = require("../../../../common/Util/Util");
const BaseController_1 = require("../BaseController");
const conf = require("config");
const crypto = require("crypto");
const fs = require("fs-extra");
const mongodb = require("mongodb");
const mongoose = require("mongoose");
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
            db.collection(collectionName).drop((dropErr) => {
                this.logger.debug('collection dropped.', collectionName, dropErr);
                this.logger.debug('creating collection.', collectionName);
                db.createCollection(collectionName, {}, (createCollectionErr) => {
                    this.logger.debug('collection created.', collectionName, createCollectionErr);
                    db.collection(collectionName).createIndex({ user_id: 1 }, { unique: true }, (createIndexErr) => {
                        this.logger.debug('index created.', createIndexErr);
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
                const SIZE = 64;
                const passwordSalt = crypto.randomBytes(SIZE).toString('hex');
                preCustomer.password_salt = passwordSalt;
                preCustomer.password_hash = Util.createHash(preCustomer.password, passwordSalt);
                return preCustomer;
            });
            ttts_domain_1.Models.PreCustomer.remove((removeErr) => {
                if (removeErr)
                    throw removeErr;
                this.logger.debug('creating perCustomers...length:', docs.length);
                ttts_domain_1.Models.PreCustomer.insertMany(docs, (insertErr) => {
                    this.logger.debug('perCustomers created.', insertErr);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PreCustomerController;
