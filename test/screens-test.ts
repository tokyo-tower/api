/**
 * スクリーンルーターテスト
 *
 * @ignore
 */

import * as assert from 'assert';
import * as httpStatus from 'http-status';
import * as supertest from 'supertest';

import * as app from '../app/app';

describe('スクリーンルーター 座席html取得', () => {
    before(async () => {
        await supertest(app)
            .post('/oauth/token')
            .send({
                grant_type: 'password',
                username: 'motionpicture',
                password: 'motionpicture',
                client_id: 'chevre-frontend',
                scope: ['admin']
            })
            .then((response) => {
                process.env.CHEVRE_API_ACCESS_TOKEN = response.body.access_token;
            });
    });

    it('ok', async () => {
        await supertest(app)
            .get('/screen/00101/show')
            .set('authorization', 'Bearer ' + process.env.CHEVRE_API_ACCESS_TOKEN)
            .set('Accept', 'application/json')
            .send({
            })
            .expect(httpStatus.OK)
            .then(async (response) => {
                assert(typeof response.body.data === 'string')
            });
    });

    it('存在しない', async () => {
        await supertest(app)
            .get('/screen/xxx/show')
            .set('authorization', 'Bearer ' + process.env.CHEVRE_API_ACCESS_TOKEN)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(httpStatus.NOT_FOUND);
    });
});
