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
 * 入場ゲート情報を、所有者リポジトリから同期する
 */
const ttts = require("@tokyotower/domain");
const cron_1 = require("cron");
const createDebug = require("debug");
const singletonProcess = require("../../../singletonProcess");
const debug = createDebug('ttts-api:jobs');
exports.default = (params) => __awaiter(this, void 0, void 0, function* () {
    let holdSingletonProcess = false;
    setInterval(() => __awaiter(this, void 0, void 0, function* () {
        holdSingletonProcess = yield singletonProcess.lock({
            project: params.project,
            key: 'syncCheckinGates',
            ttl: 60
        });
    }), 
    // tslint:disable-next-line:no-magic-numbers
    10000);
    const redisClient = ttts.redis.createClient({
        port: Number(process.env.REDIS_PORT),
        host: process.env.REDIS_HOST,
        password: process.env.REDIS_KEY,
        tls: { servername: process.env.REDIS_HOST }
    });
    const job = new cron_1.CronJob('10 * * * *', () => __awaiter(this, void 0, void 0, function* () {
        if (!holdSingletonProcess) {
            return;
        }
        const checkinGateRepo = new ttts.repository.place.CheckinGate(redisClient);
        // Cognitoからグループリストを取得して、入場ゲートリポジトリーに保管する
        getCognitoGroups()
            .then((groups) => __awaiter(this, void 0, void 0, function* () {
            const checkinGates = groups.map((group) => {
                return {
                    identifier: group.GroupName,
                    name: group.Description
                };
            });
            debug('storing checkinGates...', checkinGates);
            yield Promise.all(checkinGates.map((checkinGate) => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield checkinGateRepo.store(checkinGate);
                }
                catch (error) {
                    // tslint:disable-next-line:no-console
                    console.error(error);
                }
            })));
        }))
            .catch((error) => {
            // tslint:disable-next-line:no-console
            console.error(error);
        });
    }), undefined, true);
    debug('job started', job);
});
function getCognitoGroups() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const cognitoIdentityServiceProvider = new ttts.AWS.CognitoIdentityServiceProvider({
                apiVersion: 'latest',
                region: 'ap-northeast-1',
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            });
            cognitoIdentityServiceProvider.listGroups({
                UserPoolId: process.env.ADMINS_USER_POOL_ID
            }, (err, data) => {
                debug('listGroups result:', err, data);
                if (err instanceof Error) {
                    reject(err);
                }
                else {
                    if (data.Groups === undefined) {
                        reject(new Error('Unexpected.'));
                    }
                    else {
                        resolve(data.Groups);
                    }
                }
            });
        });
    });
}
