"use strict";
/**
 * グローバルヘルパー
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
const httpStatus = require("http-status");
const supertest = require("supertest");
const app = require("../app/app");
before(() => __awaiter(this, void 0, void 0, function* () {
    // todo テスト用のオーナーとクライアントを生成
    yield supertest(app)
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
        process.env.CHEVRE_API_ACCESS_TOKEN = response.body.access_token;
    });
}));
