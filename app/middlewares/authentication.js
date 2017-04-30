"use strict";
/**
 * oauthミドルウェア
 *
 * todo 認証失敗時の親切なメッセージ
 * todo scopeを扱う
 */
Object.defineProperty(exports, "__esModule", { value: true });
const createDebug = require("debug");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const passportHttpBearer = require("passport-http-bearer");
const debug = createDebug('chevre-api:middleware:authentication');
passport.use(new passportHttpBearer.Strategy(
// {
//     scope: ['admin'],
//     realm: '',
//     passReqToCallback: false
// },
(token, done) => {
    debug('token is', token);
    jwt.verify(token, process.env.SSKTS_API_SECRET, (err, decoded) => {
        if (err !== null) {
            done(null, false, {
                message: err.message,
                scope: ''
            });
        }
        else {
            debug('decoded is', decoded);
            done(null, {}, {
                message: '',
                scope: ''
            });
        }
    });
}));
exports.default = passport.authenticate('bearer', {
    session: false
});
