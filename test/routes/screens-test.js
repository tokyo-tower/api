"use strict";
/**
 * スクリーンルーターテスト
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
const ttts = require("@motionpicture/ttts-domain");
const assert = require("assert");
const httpStatus = require("http-status");
const supertest = require("supertest");
const app = require("../../app/app");
describe('スクリーンルーター 座席html取得', () => {
    it('ok', () => __awaiter(this, void 0, void 0, function* () {
        // テストデータ作成
        const screenId = '00101';
        yield ttts.Models.Screen.findByIdAndUpdate(screenId, {}, { upsert: true }).exec();
        yield supertest(app)
            .get(`/screens/${screenId}/show`)
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({})
            .expect(httpStatus.OK)
            .then((response) => __awaiter(this, void 0, void 0, function* () {
            assert(typeof response.body.data === 'string');
        }));
        yield ttts.Models.Screen.findByIdAndRemove(screenId).exec();
    }));
    it('存在しない', () => __awaiter(this, void 0, void 0, function* () {
        yield supertest(app)
            .get('/screens/xxx/show')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(httpStatus.NOT_FOUND);
    }));
});
