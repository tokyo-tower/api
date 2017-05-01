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
    it('ok', async () => {
        await supertest(app)
            .get('/screen/00101/show')
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
            .expect('Content-Type', /json/)
            .expect(httpStatus.NOT_FOUND);
    });
});
