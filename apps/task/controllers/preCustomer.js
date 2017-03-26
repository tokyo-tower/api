/**
 * 先行予約アカウントタスクコントローラー
 *
 * @namespace task/PreCustomerController
 */
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const Util = require("../../../common/Util/Util");
const crypto = require("crypto");
const fs = require("fs-extra");
const log4js = require("log4js");
const mongodb = require("mongodb");
const mongoose = require("mongoose");
const MONGOLAB_URI = process.env.MONGOLAB_URI;
// todo ログ出力方法考える
log4js.configure({
    appenders: [
        {
            category: 'system',
            type: 'console'
        }
    ],
    levels: {
        system: 'ALL'
    },
    replaceConsole: true
});
const logger = log4js.getLogger('system');
/**
 *
 *
 * @memberOf task/PreCustomerController
 */
function createCollection() {
    mongodb.MongoClient.connect(process.env.MONGOLAB_URI, (err, db) => __awaiter(this, void 0, void 0, function* () {
        if (err !== null)
            throw err;
        const collectionName = 'pre_customers';
        logger.debug('dropping collection...', collectionName);
        yield db.collection(collectionName).drop();
        logger.debug('collection dropped.', collectionName);
        logger.debug('creating collection.', collectionName);
        yield db.createCollection(collectionName, {});
        logger.debug('collection created.', collectionName);
        yield db.collection(collectionName).createIndex({ user_id: 1 }, { unique: true });
        logger.debug('index created.');
        yield db.close();
        process.exit(0);
    }));
}
exports.createCollection = createCollection;
/**
 *
 *
 * @memberOf task/PreCustomerController
 */
function createFromJson() {
    mongoose.connect(MONGOLAB_URI, {});
    fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/preCustomers.json`, 'utf8', (err, data) => __awaiter(this, void 0, void 0, function* () {
        if (err instanceof Error)
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
        yield chevre_domain_1.Models.PreCustomer.remove({}).exec();
        logger.debug('creating perCustomers...length:', docs.length);
        yield chevre_domain_1.Models.PreCustomer.insertMany(docs);
        logger.debug('perCustomers created.');
        mongoose.disconnect();
        process.exit(0);
    }));
}
exports.createFromJson = createFromJson;
