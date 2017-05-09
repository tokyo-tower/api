/**
 * グローバルヘルパー
 *
 * @ignore
 */

import * as httpStatus from 'http-status';
import * as supertest from 'supertest';
import * as app from '../app/app';

before(async () => {
    // todo テスト用のオーナーとクライアントを生成

    await supertest(app)
        .post('/oauth/token')
        .send({
            grant_type: 'password',
            username: 'motionpicture',
            password: 'motionpicture',
            client_id: 'ttts-frontend',
            scope: ['admin']
        })
        .expect(httpStatus.OK)
        .then((response) => {
            process.env.TTTS_API_ACCESS_TOKEN = response.body.access_token;
        });
});
