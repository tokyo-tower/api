/**
 * パフォーマンスルーターテスト
 *
 * @ignore
 */

import * as assert from 'assert';
import * as httpStatus from 'http-status';
import * as supertest from 'supertest';

import * as app from '../app/app';

describe('パフォーマンスルーターテスト 検索', () => {
    it('スコープ不足', async () => {
        await supertest(app)
            .get('/ja/performance/search')
            .set('authorization', 'Bearer ' + process.env.CHEVRE_API_ACCESS_TOKEN)
            .set('Accept', 'application/json')
            .send({
            })
            .expect('Content-Type', /json/)
            .expect(httpStatus.BAD_REQUEST)
            .then(async (response) => {
                assert(Array.isArray(response.body.errors));
                assert.equal((<any[]>response.body.errors)[0].title, 'invalid scopes');
            });
    });

    it('ok', async () => {
        await supertest(app)
            .post('/oauth/token')
            .send({
                // assertion: process.env.SSKTS_API_REFRESH_TOKEN,
                scopes: ['performances.readonly']
            })
            .then((response) => {
                process.env.CHEVRE_API_ACCESS_TOKEN = response.body.access_token;
            });

        await supertest(app)
            .get('/ja/performance/search')
            .set('authorization', 'Bearer ' + process.env.CHEVRE_API_ACCESS_TOKEN)
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
