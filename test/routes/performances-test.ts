/**
 * パフォーマンスルーターテスト
 *
 * @ignore
 */

import * as assert from 'assert';
import * as httpStatus from 'http-status';
import * as supertest from 'supertest';

import * as app from '../../app/app';

describe('パフォーマンスルーターテスト 検索', () => {
    // it('スコープ不足', async () => {
    //     await supertest(app)
    //         .post('/oauth/token')
    //         .send({
    //             grant_type: 'password',
    //             username: 'motionpicture',
    //             password: 'motionpicture',
    //             client_id: 'ttts-frontend',
    //             scope: []
    //         })
    //         .then((response) => {
    //             process.env.TTTS_API_ACCESS_TOKEN = response.body.access_token;
    //         });

    //     await supertest(app)
    //         .get('/ja/performance/search')
    //         .set('authorization', 'Bearer ' + process.env.TTTS_API_ACCESS_TOKEN)
    //         .set('Accept', 'application/json')
    //         .send({
    //         })
    //         .expect(httpStatus.FORBIDDEN)
    //         .then(async (response) => {
    //             assert.equal(response.text, 'Forbidden');
    //         });
    // });

    it('ok', async () => {
        await supertest(app)
            .get('/performances')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
            })
            .expect('Content-Type', /json/)
            .expect(httpStatus.OK)
            .then((response) => {
                assert(Array.isArray(response.body.data));
            });
    });
});
