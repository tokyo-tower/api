/**
 * 作品タスクコントローラー
 *
 * @namespace task/FilmController
 */
"use strict";
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const fs = require("fs-extra");
const log4js = require("log4js");
const mongoose = require("mongoose");
const request = require("request");
const MONGOLAB_URI = process.env.MONGOLAB_URI;
const STATUS_CODE_OK = 200;
// todo ログ出力方法考える
log4js.configure({
    appenders: [
        {
            category: 'system',
            type: 'console'
        }
    ],
    levels: {
        system: 'ALL'
    },
    replaceConsole: true
});
const logger = log4js.getLogger('system');
/**
 * @memberOf task/FilmController
 */
function createTicketTypeGroupsFromJson() {
    mongoose.connect(MONGOLAB_URI, {});
    fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/ticketTypeGroups.json`, 'utf8', (err, data) => {
        if (err)
            throw err;
        const groups = JSON.parse(data);
        logger.info('removing all groups...');
        chevre_domain_1.Models.TicketTypeGroup.remove({}, (removeErr) => {
            if (removeErr)
                throw removeErr;
            logger.debug('creating groups...');
            chevre_domain_1.Models.TicketTypeGroup.create(groups, (createErr) => {
                logger.info('groups created.', createErr);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    });
}
exports.createTicketTypeGroupsFromJson = createTicketTypeGroupsFromJson;
/**
 * @memberOf task/FilmController
 */
function createFromJson() {
    mongoose.connect(MONGOLAB_URI, {});
    fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/films.json`, 'utf8', (err, data) => {
        if (err)
            throw err;
        const films = JSON.parse(data);
        const promises = films.map((film) => {
            return new Promise((resolve, reject) => {
                logger.debug('updating film...');
                chevre_domain_1.Models.Film.findOneAndUpdate({
                    _id: film._id
                }, film, {
                    new: true,
                    upsert: true
                }, (updateFilmErr) => {
                    logger.debug('film updated', updateFilmErr);
                    (updateFilmErr) ? reject(updateFilmErr) : resolve();
                });
            });
        });
        Promise.all(promises).then(() => {
            logger.info('promised.');
            mongoose.disconnect();
            process.exit(0);
        }, (promiseErr) => {
            logger.error('promised.', promiseErr);
            mongoose.disconnect();
            process.exit(0);
        });
    });
}
exports.createFromJson = createFromJson;
/**
 * 作品画像を取得する
 *
 * @memberOf task/FilmController
 */
function getImages() {
    mongoose.connect(MONGOLAB_URI, {});
    chevre_domain_1.Models.Film.find({}, 'name', { sort: { _id: 1 } }, (err, films) => {
        if (err)
            throw err;
        let i = 0;
        const next = (film) => {
            const options = {
                url: `https://api.cognitive.microsoft.com/bing/v5.0/images/search?q=${encodeURIComponent(film.get('name.ja'))}`,
                json: true,
                headers: {
                    'Ocp-Apim-Subscription-Key': '3bca568e7b684e218eb2a11d0cdce9c0'
                }
            };
            // let options = {
            //     url: `https://api.photozou.jp/rest/search_public.json?limit=1&keyword=${encodeURIComponent(film.get('name').ja)}`,
            //     json: true
            // };
            console.log('searching...', film.get('name').ja);
            request.get(options, (error, response, body) => {
                if (!error && response.statusCode === STATUS_CODE_OK) {
                    if (body.value.length > 0) {
                        const image = body.value[0].thumbnailUrl;
                        console.log('thumbnailUrl:', image);
                        request.get({ url: image, encoding: null }, (errorOfImageRequest, responseOfImageRequest, bodyOfImageRequest) => {
                            logger.debug('image saved.', error);
                            if (!errorOfImageRequest && responseOfImageRequest.statusCode === STATUS_CODE_OK) {
                                fs.writeFileSync(`${__dirname}/../../../../public/images/film/${film.get('_id').toString()}.jpg`, bodyOfImageRequest, 'binary');
                            }
                            if (i === films.length - 1) {
                                logger.debug('success!');
                                mongoose.disconnect();
                                process.exit(0);
                            }
                            else {
                                i += 1;
                                next(films[i]);
                            }
                        });
                    }
                    else {
                        i += 1;
                        next(films[i]);
                    }
                }
                else {
                    if (i === films.length - 1) {
                        logger.debug('success!');
                        mongoose.disconnect();
                        process.exit(0);
                    }
                    else {
                        i += 1;
                        next(films[i]);
                    }
                }
            });
        };
        next(films[i]);
    });
}
exports.getImages = getImages;
