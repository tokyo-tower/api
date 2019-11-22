"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 不要なイベント予約集計を削除する
 */
const ttts = require("@tokyotower/domain");
const cron_1 = require("cron");
const createDebug = require("debug");
const moment = require("moment");
const connectMongo_1 = require("../../../connectMongo");
const singletonProcess = require("../../../singletonProcess");
const debug = createDebug('ttts-api:jobs');
exports.default = (params) => __awaiter(void 0, void 0, void 0, function* () {
    let holdSingletonProcess = false;
    setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
        holdSingletonProcess = yield singletonProcess.lock({
            project: params.project,
            key: 'makeAggregationsExpired',
            ttl: 60
        });
    }), 
    // tslint:disable-next-line:no-magic-numbers
    10000);
    const connection = yield connectMongo_1.connectMongo({ defaultConnection: false });
    const redisClient = ttts.redis.createClient({
        port: Number(process.env.REDIS_PORT),
        host: process.env.REDIS_HOST,
        password: process.env.REDIS_KEY,
        tls: { servername: process.env.REDIS_HOST }
    });
    const job = new cron_1.CronJob('0 * * * *', () => __awaiter(void 0, void 0, void 0, function* () {
        if (!holdSingletonProcess) {
            return;
        }
        const performanceRepo = new ttts.repository.Performance(connection);
        const eventWithAggregationRepo = new ttts.repository.EventWithAggregation(redisClient);
        // 過去のイベントを検索
        const startThrough = moment()
            .add(-1, 'week')
            .toDate();
        const startFrom = moment(startThrough)
            .add(-1, 'week')
            .toDate();
        const eventIds = yield performanceRepo.distinct('_id', {
            startFrom: startFrom,
            startThrough: startThrough
        });
        if (eventIds.length > 0) {
            yield eventWithAggregationRepo.deleteByIds({ ids: eventIds });
        }
    }), undefined, true);
    debug('job started', job);
});
