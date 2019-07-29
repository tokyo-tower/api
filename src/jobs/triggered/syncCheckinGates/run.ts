/**
 * 入場ゲート情報を、所有者リポジトリから同期する
 */
import * as ttts from '@tokyotower/domain';
import { CronJob } from 'cron';
import * as createDebug from 'debug';

import * as singletonProcess from '../../../singletonProcess';

const debug = createDebug('ttts-api:jobs');

export default async (params: {
    project?: ttts.factory.project.IProject;
}) => {
    let holdSingletonProcess = false;
    setInterval(
        async () => {
            holdSingletonProcess = await singletonProcess.lock({
                project: params.project,
                key: 'syncCheckinGates',
                ttl: 60
            });
        },
        // tslint:disable-next-line:no-magic-numbers
        10000
    );

    const redisClient = ttts.redis.createClient({
        port: Number(<string>process.env.REDIS_PORT),
        host: <string>process.env.REDIS_HOST,
        password: process.env.REDIS_KEY,
        tls: { servername: process.env.REDIS_HOST }
    });

    const job = new CronJob(
        '10 * * * *',
        async () => {
            if (!holdSingletonProcess) {
                return;
            }

            const checkinGateRepo = new ttts.repository.place.CheckinGate(redisClient);

            // Cognitoからグループリストを取得して、入場ゲートリポジトリーに保管する
            getCognitoGroups()
                .then(async (groups) => {
                    const checkinGates = groups.map((group) => {
                        return {
                            identifier: <string>group.GroupName,
                            name: <string>group.Description
                        };
                    });
                    debug('storing checkinGates...', checkinGates);

                    await Promise.all(checkinGates.map(async (checkinGate) => {
                        try {
                            await checkinGateRepo.store(checkinGate);
                        } catch (error) {
                            // tslint:disable-next-line:no-console
                            console.error(error);
                        }
                    }));
                })
                .catch((error) => {
                    // tslint:disable-next-line:no-console
                    console.error(error);
                });
        },
        undefined,
        true
    );
    debug('job started', job);
};

async function getCognitoGroups() {
    return new Promise<ttts.AWS.CognitoIdentityServiceProvider.GroupListType>((resolve, reject) => {
        const cognitoIdentityServiceProvider = new ttts.AWS.CognitoIdentityServiceProvider({
            apiVersion: 'latest',
            region: 'ap-northeast-1',
            accessKeyId: <string>process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: <string>process.env.AWS_SECRET_ACCESS_KEY
        });

        cognitoIdentityServiceProvider.listGroups(
            {
                UserPoolId: <string>process.env.ADMINS_USER_POOL_ID
            },
            (err, data) => {
                debug('listGroups result:', err, data);
                if (err instanceof Error) {
                    reject(err);
                } else {
                    if (data.Groups === undefined) {
                        reject(new Error('Unexpected.'));
                    } else {
                        resolve(data.Groups);
                    }
                }
            });
    });
}
