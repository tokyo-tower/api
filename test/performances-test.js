"use strict";
/**
 * パフォーマンスルーターテスト
 *
 * @ignore
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const httpStatus = require("http-status");
const supertest = require("supertest");
const app = require("../app/app");
describe('パフォーマンスルーターテスト 検索', () => {
    it('スコープ不足', () => __awaiter(this, void 0, void 0, function* () {
        yield supertest(app)
            .get('/ja/performance/search')
            .set('authorization', 'Bearer ' + process.env.CHEVRE_API_ACCESS_TOKEN)
            .set('Accept', 'application/json')
            .send({})
            .expect('Content-Type', /json/)
            .expect(httpStatus.BAD_REQUEST)
            .then((response) => __awaiter(this, void 0, void 0, function* () {
            assert(Array.isArray(response.body.errors));
            assert.equal(response.body.errors[0].title, 'invalid scopes');
        }));
    }));
    it('ok', () => __awaiter(this, void 0, void 0, function* () {
        yield supertest(app)
            .post('/oauth/token')
            .send({
            // assertion: process.env.SSKTS_API_REFRESH_TOKEN,
            scopes: ['performances.readonly']
        })
            .then((response) => {
            process.env.CHEVRE_API_ACCESS_TOKEN = response.body.access_token;
        });
        yield supertest(app)
            .get('/ja/performance/search')
            .set('authorization', 'Bearer ' + process.env.CHEVRE_API_ACCESS_TOKEN)
            .set('Accept', 'application/json')
            .send({})
            .expect('Content-Type', /json/)
            .expect(httpStatus.OK)
            .then((response) => {
            assert(Array.isArray(response.body.data));
        });
    }));
});
