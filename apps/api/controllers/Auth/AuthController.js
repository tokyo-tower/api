"use strict";
const BaseController_1 = require("../BaseController");
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const crypto = require("crypto");
class AuthController extends BaseController_1.default {
    login() {
        let token = crypto.randomBytes(64).toString('hex');
        ttts_domain_1.Models.Authentication.findOneAndUpdate({
            mvtk_kiin_cd: '00000775'
        }, {
            token: token,
        }, {
            upsert: true,
            new: true
        }, (err, authentication) => {
            if (err) {
                this.res.json({
                    success: false,
                    access_token: null,
                    mvtk_kiin_cd: null
                });
            }
            else {
                this.res.json({
                    success: true,
                    access_token: authentication.get('token'),
                    mvtk_kiin_cd: authentication.get('mvtk_kiin_cd')
                });
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AuthController;
