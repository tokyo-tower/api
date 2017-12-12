"use strict";
// tslint:disable:no-implicit-dependencies
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * グローバルヘルパー
 *
 * @ignore
 */
const httpStatus = require("http-status");
const supertest = require("supertest");
const app = require("../app/app");
before(() => __awaiter(this, void 0, void 0, function* () {
    yield supertest(app)
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
}));
