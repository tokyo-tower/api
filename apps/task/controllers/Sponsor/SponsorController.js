"use strict";
const BaseController_1 = require("../BaseController");
const Util_1 = require("../../../common/Util/Util");
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const conf = require("config");
const mongoose = require("mongoose");
const fs = require("fs-extra");
const crypto = require("crypto");
let MONGOLAB_URI = conf.get('mongolab_uri');
class SponsorController extends BaseController_1.default {
    createFromJson() {
        mongoose.connect(MONGOLAB_URI, {});
        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/sponsors.json`, 'utf8', (err, data) => {
            if (err)
                throw err;
            let sponsors = JSON.parse(data);
            let promises = sponsors.map((sponsor) => {
                let password_salt = crypto.randomBytes(64).toString('hex');
                sponsor['password_salt'] = password_salt;
                sponsor['password_hash'] = Util_1.default.createHash(sponsor.password, password_salt);
                return new Promise((resolve, reject) => {
                    this.logger.debug('updating sponsor...');
                    ttts_domain_1.Models.Sponsor.findOneAndUpdate({
                        user_id: sponsor.user_id
                    }, sponsor, {
                        new: true,
                        upsert: true
                    }, (err) => {
                        this.logger.debug('sponsor updated', err);
                        (err) ? reject(err) : resolve();
                    });
                });
            });
            Promise.all(promises).then(() => {
                this.logger.info('promised.');
                mongoose.disconnect();
                process.exit(0);
            }, (err) => {
                this.logger.error('promised.', err);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    }
    createPasswords() {
        let file = `${__dirname}/../../../../data/${process.env.NODE_ENV}/sponsorPasswords.txt`;
        let passwords = [];
        let l = 8;
        let c = "abcdefghijklmnopqrstuvwxyz0123456789";
        let cl = c.length;
        for (let i = 0; i < 300; i++) {
            let password = '';
            while (password.length < l || !password.match(/[0-9]+/g)) {
                if (password.length >= l) {
                    password = '';
                }
                password += c[Math.floor(Math.random() * cl)];
            }
            console.log(password);
            passwords.push(password);
        }
        fs.writeFileSync(file, passwords.join("\n"), 'utf8');
        process.exit(0);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorController;
