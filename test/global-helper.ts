/**
 * グローバルヘルパー
 *
 * @ignore
 */

import * as supertest from 'supertest';
import * as app from '../app/app';

before(async () => {
    await supertest(app)
        .post('/oauth/token')
        .send({
            // assertion: process.env.SSKTS_API_REFRESH_TOKEN,
            scopes: ['admin']
        })
        .then((response) => {
            process.env.CHEVRE_API_ACCESS_TOKEN = response.body.access_token;
        });
});
