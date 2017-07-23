/**
 * スクリーンルーターテスト
 *
 * @ignore
 */

import * as TTTS from '@motionpicture/ttts-domain';
import * as assert from 'assert';
import * as httpStatus from 'http-status';
import * as mongoose from 'mongoose';
import * as supertest from 'supertest';

import * as app from '../app/app';

describe('スクリーンルーター 座席html取得', () => {
    let connection: mongoose.Connection;

    before(async () => {
        connection = mongoose.createConnection(<string>process.env.MONGOLAB_URI);

        await supertest(app)
            .post('/oauth/token')
            .send({
                grant_type: 'password',
                username: 'motionpicture',
                password: 'motionpicture',
                client_id: 'ttts-frontend',
                scope: ['admin']
            })
            .then((response) => {
                process.env.TTTS_API_ACCESS_TOKEN = response.body.access_token;
            });
    });

    it('ok', async () => {
        // テストデータ作成
        const screenId = '00101';
        const screenModel = connection.model(TTTS.Models.Screen.modelName, TTTS.Models.Screen.schema);
        await screenModel.findByIdAndUpdate(screenId, {}, { upsert: true }).exec();

        await supertest(app)
            .get(`/screen/${screenId}/show`)
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
            })
            .expect(httpStatus.OK)
            .then(async (response) => {
                assert(typeof response.body.data === 'string');
            });

        await screenModel.findByIdAndRemove(screenId).exec();
    });

    it('存在しない', async () => {
        await supertest(app)
            .get('/screen/xxx/show')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(httpStatus.NOT_FOUND);
    });
});
