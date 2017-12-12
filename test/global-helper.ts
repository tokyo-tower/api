// tslint:disable:no-implicit-dependencies

/**
 * グローバルヘルパー
 * @ignore
 */

import * as httpStatus from 'http-status';
import * as supertest from 'supertest';
import * as app from '../src/app/app';

before(async () => {
    await supertest(app)
        .post('/oauth/token')
        .send({
            grant_type: 'client_credentials',
            client_id: 'motionpicture',
            client_secret: 'motionpicture',
            state: 'teststate',
            scopes: [
                'performances',
                'screens',
                'reservations',
                'transactions',
                'transactions.authorizations'
            ]
        })
        .expect(httpStatus.OK)
        .then((response) => {
            process.env.TTTS_API_ACCESS_TOKEN = response.body.access_token;
        });
});
