/**
 * oauthミドルウェア
 *
 * todo 認証失敗時の親切なメッセージ
 * todo scopeを扱う
 */

import * as createDebug from 'debug';
import * as jwt from 'jsonwebtoken';
import * as passport from 'passport';
import * as passportHttpBearer from 'passport-http-bearer';

const debug = createDebug('chevre-api:middleware:authentication');

passport.use(new passportHttpBearer.Strategy(
    // {
    //     scope: ['admin'],
    //     realm: '',
    //     passReqToCallback: false
    // },
    (token, done) => {
        debug('token is', token);

        jwt.verify(token, <string>process.env.SSKTS_API_SECRET, (err, decoded) => {
            if (err !== null) {
                done(null, false, {
                    message: err.message,
                    scope: ''
                });
            } else {
                debug('decoded is', decoded);
                done(null, {}, {
                    message: '',
                    scope: ''
                });

            }
        });
    }
));

export default passport.authenticate('bearer', {
    session: false
});
