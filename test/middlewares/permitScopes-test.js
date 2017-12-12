"use strict";
/**
 * スコープ許可ミドルウェアテスト
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
const permitScopes = require("../../app/middlewares/permitScopes");
describe('所有スコープが許可されたスコープかどうか', () => {
    it('許可される', () => __awaiter(this, void 0, void 0, function* () {
        const ownedScopes = ['owned1', 'owned2'];
        const permittedScopes = ['permitted1', 'permitted2', 'owned1'];
        const permitted = permitScopes.isScopesPermitted(ownedScopes, permittedScopes);
        assert(permitted);
    }));
    it('許可されない', () => __awaiter(this, void 0, void 0, function* () {
        const ownedScopes = ['owned1', 'owned2'];
        const permittedScopes = ['permitted1', 'permitted2'];
        const permitted = permitScopes.isScopesPermitted(ownedScopes, permittedScopes);
        assert(!permitted);
    }));
    it('所有スコープリストが配列でないと例外', () => __awaiter(this, void 0, void 0, function* () {
        const ownedScopes = 'owned1';
        const permittedScopes = ['permitted1', 'permitted2'];
        assert.throws(() => {
            permitScopes.isScopesPermitted(ownedScopes, permittedScopes);
        });
    }));
});
