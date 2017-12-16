/**
 * スコープ許可ミドルウェアテスト
 * @ignore
 */

import * as assert from 'assert';

import * as permitScopes from '../../src/app/middlewares/permitScopes';

describe('所有スコープが許可されたスコープかどうか', () => {
    it('許可される', async () => {
        const ownedScopes = ['owned1', 'owned2'];
        const permittedScopes = ['permitted1', 'permitted2', 'owned1'];

        const permitted = permitScopes.isScopesPermitted(ownedScopes, permittedScopes);
        assert(permitted);
    });

    it('許可されない', async () => {
        const ownedScopes = ['owned1', 'owned2'];
        const permittedScopes = ['permitted1', 'permitted2'];

        const permitted = permitScopes.isScopesPermitted(ownedScopes, permittedScopes);
        assert(!permitted);
    });

    it('所有スコープリストが配列でないと例外', async () => {
        const ownedScopes = 'owned1';
        const permittedScopes = ['permitted1', 'permitted2'];

        assert.throws(() => {
            permitScopes.isScopesPermitted(<any>ownedScopes, permittedScopes);
        });
    });
});
