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
 * GMO実売上
 */
const ttts = require("@tokyotower/domain");
const os = require("os");
const util = require("util");
const connectMongo_1 = require("../../../connectMongo");
const singletonProcess = require("../../../singletonProcess");
exports.default = (params) => __awaiter(this, void 0, void 0, function* () {
    let holdSingletonProcess = false;
    setInterval(() => __awaiter(this, void 0, void 0, function* () {
        holdSingletonProcess = yield singletonProcess.lock({
            project: params.project,
            key: 'settleCreditCard',
            ttl: 60
        });
    }), 
    // tslint:disable-next-line:no-magic-numbers
    10000);
    // デバッグ
    setInterval(() => __awaiter(this, void 0, void 0, function* () {
        if (process.env.DEBUG_SINGLETON_PROCESS === '1') {
            yield ttts.service.notification.report2developers(`[${process.env.PROJECT_ID}] api:singletonProcess`, util.format('%s\n%s\n%s\n%s\n%s', `key: 'settleCreditCard'`, `holdSingletonProcess: ${holdSingletonProcess}`, `os.hostname: ${os.hostname}`, `pid: ${process.pid}`))();
        }
    }), 
    // tslint:disable-next-line:no-magic-numbers
    900000);
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
    const INTERVAL_MILLISECONDS = 1000;
    setInterval(() => __awaiter(this, void 0, void 0, function* () {
        if (!holdSingletonProcess) {
            return;
        }
        if (count > MAX_NUBMER_OF_PARALLEL_TASKS) {
            return;
        }
        count += 1;
        try {
            yield ttts.service.task.executeByName(ttts.factory.taskName.SettleCreditCard)(taskRepo, connection, redisClient);
        }
        catch (error) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }
        count -= 1;
    }), INTERVAL_MILLISECONDS);
});
