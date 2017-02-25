/**
 * 作品タスクコントローラー
 *
 * @namespace task/FilmController
 */

import { Models } from '@motionpicture/chevre-domain';

import * as conf from 'config';
import * as fs from 'fs-extra';
import * as log4js from 'log4js';
import * as mongoose from 'mongoose';
import * as request from 'request';

const MONGOLAB_URI = conf.get<string>('mongolab_uri');
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
export function createTicketTypeGroupsFromJson(): void {
    mongoose.connect(MONGOLAB_URI, {});

    fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/ticketTypeGroups.json`, 'utf8', (err, data) => {
        if (err) throw err;
        const groups = JSON.parse(data);

        logger.info('removing all groups...');
        Models.TicketTypeGroup.remove({}, (removeErr) => {
            if (removeErr) throw removeErr;

            logger.debug('creating groups...');
            Models.TicketTypeGroup.create(
                groups,
                (createErr) => {
                    logger.info('groups created.', createErr);
                    mongoose.disconnect();
                    process.exit(0);
                }
            );
        });
    });
}

/**
 * @memberOf task/FilmController
 */
export function createFromJson(): void {
    mongoose.connect(MONGOLAB_URI, {});

    fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/films.json`, 'utf8', (err, data) => {
        if (err) throw err;
        const films: any[] = JSON.parse(data);

        const promises = films.map((film) => {
            return new Promise((resolve, reject) => {
                logger.debug('updating film...');
                Models.Film.findOneAndUpdate(
                    {
                        _id: film._id
                    },
                    film,
                    {
                        new: true,
                        upsert: true
                    },
                    (updateFilmErr) => {
                        logger.debug('film updated', updateFilmErr);
                        (updateFilmErr) ? reject(updateFilmErr) : resolve();
                    }
                );
            });
        });

        Promise.all(promises).then(
            () => {
                logger.info('promised.');
                mongoose.disconnect();
                process.exit(0);
            },
            (promiseErr) => {
                logger.error('promised.', promiseErr);
                mongoose.disconnect();
                process.exit(0);
            }
        );
    });
}

/**
 * 作品画像を取得する
 *
 * @memberOf task/FilmController
 */
export function getImages() {
    mongoose.connect(MONGOLAB_URI, {});

    Models.Film.find({}, 'name', { sort: { _id: 1 } }, (err, films) => {
        if (err) throw err;

        let i = 0;

        const next = (film: mongoose.Document) => {
            const options = {
                url: `https://api.cognitive.microsoft.com/bing/v5.0/images/search?q=${encodeURIComponent(film.get('name.ja'))}`,
                json: true,
                headers: {
                    'Ocp-Apim-Subscription-Key': '3bca568e7b684e218eb2a11d0cdce9c0'
                    // User-Agent: Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 822)
                    // X-Search-ClientIP: 999.999.999.999
                    // X-MSEdge-ClientID: <blobFromPriorResponseGoesHere>
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
                            } else {
                                i += 1;
                                next(films[i]);
                            }
                        });
                    } else {
                        i += 1;
                        next(films[i]);
                    }
                } else {
                    if (i === films.length - 1) {
                        logger.debug('success!');
                        mongoose.disconnect();
                        process.exit(0);
                    } else {
                        i += 1;
                        next(films[i]);
                    }
                }
            });
        };

        next(films[i]);
    });
}
