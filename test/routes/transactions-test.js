"use strict";
/**
 * 取引ルーターテスト
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
// import * as ttts from '@motionpicture/ttts-domain';
const assert = require("assert");
const httpStatus = require("http-status");
// import * as mongoose from 'mongoose';
const supertest = require("supertest");
const app = require("../../app/app");
describe('座席仮予約', () => {
    it('ok', () => __awaiter(this, void 0, void 0, function* () {
        yield supertest(app)
            .post('/transactions/authorizations')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({})
            .expect(httpStatus.OK)
            .then((response) => __awaiter(this, void 0, void 0, function* () {
            assert.deepEqual(response.body.data, {});
        }));
    }));
});
describe('座席仮予約解除', () => {
    it('ok', () => __awaiter(this, void 0, void 0, function* () {
        yield supertest(app)
            .delete('/transactions/authorizations/xxx')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({})
            .expect(httpStatus.OK)
            .then((response) => __awaiter(this, void 0, void 0, function* () {
            assert.deepEqual(response.body.data, {});
        }));
    }));
});
describe('座席本予約', () => {
    it('ok', () => __awaiter(this, void 0, void 0, function* () {
        yield supertest(app)
            .post('/transactions/confirm')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({})
            .expect(httpStatus.OK)
            .then((response) => __awaiter(this, void 0, void 0, function* () {
            assert.deepEqual(response.body.data, {});
        }));
    }));
});
describe('座席本予約取消', () => {
    it('ok', () => __awaiter(this, void 0, void 0, function* () {
        yield supertest(app)
            .post('/transactions/cancel')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({})
            .expect(httpStatus.OK)
            .then((response) => __awaiter(this, void 0, void 0, function* () {
            assert.deepEqual(response.body.data, {});
        }));
    }));
});
