/**
 * oauthルーターテスト
 *
 * @ignore
 */

import * as assert from 'assert';
import * as httpStatus from 'http-status';
import * as supertest from 'supertest';

import * as app from '../app/app';

describe('oauthルーターテスト アクセストークン発行', () => {
    // it('存在しないクライアント', async () => {
    //     await supertest(app)
    //         .post('/oauth/token')
    //         .send({
    //             grant_type: 'password',
    //             username: 'xxx',
    //             password: 'xxx',
    //             client_id: 'xxx',
    //             scope: ['admin']
    //         })
    //         .expect(httpStatus.BAD_REQUEST)
    //         .then((response) => {
    //             assert(Array.isArray(response.body.errors));
    //         });
    // });

    // it('ユーザー認証失敗', async () => {
    //     await supertest(app)
    //         .post('/oauth/token')
    //         .send({
    //             grant_type: 'password',
    //             username: 'password',
    //             password: 'password',
    //             client_id: 'chevre-frontend',
    //             scope: ['admin']
    //         })
    //         .expect(httpStatus.BAD_REQUEST)
    //         .then((response) => {
    //             assert(Array.isArray(response.body.errors));
    //         });
    // });

    it('ok', async () => {
        await supertest(app)
            .post('/oauth/token')
            .send({
                grant_type: 'password',
                username: 'motionpicture',
                password: 'motionpicture',
                client_id: 'chevre-frontend',
                scope: ['admin']
            })
            .expect(httpStatus.OK)
            .then((response) => {
                assert.equal(typeof response.body.access_token, 'string');
            });
    });
});
