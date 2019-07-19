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
/**
 * 注文取引レポート作成
 */
const ttts = require("@tokyotower/domain");
const connectMongo_1 = require("../../../connectMongo");
exports.default = (_) => __awaiter(this, void 0, void 0, function* () {
    const connection = yield connectMongo_1.connectMongo({ defaultConnection: false });
    const redisClient = ttts.redis.createClient({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_KEY,
        tls: { servername: process.env.REDIS_HOST }
    });
    const taskRepo = new ttts.repository.Task(connection);
    let count = 0;
    const MAX_NUBMER_OF_PARALLEL_TASKS = 10;
    const INTERVAL_MILLISECONDS = 100;
    setInterval(() => __awaiter(this, void 0, void 0, function* () {
        if (count > MAX_NUBMER_OF_PARALLEL_TASKS) {
            return;
        }
        count += 1;
        try {
            yield ttts.service.task.executeByName(ttts.factory.taskName.CreatePlaceOrderReport)(taskRepo, connection, redisClient);
        }
        catch (error) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }
        count -= 1;
    }), INTERVAL_MILLISECONDS);
});
