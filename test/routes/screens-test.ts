/**
 * スクリーンルーターテスト
 *
 * @ignore
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as assert from 'assert';
import * as httpStatus from 'http-status';
// import * as mongoose from 'mongoose';
import * as supertest from 'supertest';

import * as app from '../../app/app';

describe('スクリーンルーター 座席html取得', () => {
    it('ok', async () => {
        // テストデータ作成
        const screenId = '00101';
        await ttts.Models.Screen.findByIdAndUpdate(screenId, {}, { upsert: true }).exec();

        await supertest(app)
            .get(`/screens/${screenId}/show`)
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
            })
            .expect(httpStatus.OK)
            .then(async (response) => {
                assert(typeof response.body.data === 'string');
            });

        await ttts.Models.Screen.findByIdAndRemove(screenId).exec();
    });

    it('存在しない', async () => {
        await supertest(app)
            .get('/screens/xxx/show')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(httpStatus.NOT_FOUND);
    });
});
