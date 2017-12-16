"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * mongoose接続オプション
 * @types/mongooseが古くて、新しいMongoDBクライアントの接続オプションに適合していない
 * @see http://mongoosejs.com/docs/api.html#index_Mongoose-connect
 * @see　http://mongodb.github.io/node-mongodb-native/2.2/api/MongoClient.html
 * 型定義の更新待ち
 *
 * @ignore
 */
const mongooseConnectionOptions = {
    useMongoClient: true,
    autoReconnect: true,
    keepAlive: 120000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 0,
    reconnectTries: 30,
    reconnectInterval: 1000
};
exports.default = mongooseConnectionOptions;
