import {Models} from '@motionpicture/ttts-domain';
import BaseController from '../BaseController';
import * as conf from 'config';
import * as mongoose from 'mongoose';
import * as request from 'request';
import * as fs from 'fs-extra';

const MONGOLAB_URI = conf.get<string>('mongolab_uri');

/**
 * 作品タスクコントローラー
 *
 * @export
 * @class FilmController
 * @extends {BaseController}
 */
export default class FilmController extends BaseController {
    public createTicketTypeGroupsFromJson(): void {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/ticketTypeGroups.json`, 'utf8', (err, data) => {
            if (err) throw err;
            const groups = JSON.parse(data);

            this.logger.info('removing all groups...');
            Models.TicketTypeGroup.remove({}, (err) => {
                if (err) throw err;

                this.logger.debug('creating groups...');
                Models.TicketTypeGroup.create(
                    groups,
                    (err) => {
                        this.logger.info('groups created.', err);
                        mongoose.disconnect();
                        process.exit(0);
                    }
                );
            });
        });
    }

    public createFromJson(): void {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/films.json`, 'utf8', (err, data) => {
            if (err) throw err;
            const films: any[] = JSON.parse(data);

            const promises = films.map((film) => {
                return new Promise((resolve, reject) => {
                    this.logger.debug('updating film...');
                    Models.Film.findOneAndUpdate(
                        {
                            _id: film._id
                        },
                        film,
                        {
                            new: true,
                            upsert: true
                        },
                        (err) => {
                            this.logger.debug('film updated', err);
                            (err) ? reject(err) : resolve();
                        }
                    );
                });
            });

            Promise.all(promises).then(() => {
                this.logger.info('promised.');
                mongoose.disconnect();
                process.exit(0);
            },                         (err) => {
                this.logger.error('promised.', err);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    }

    /**
     * 作品画像を取得する
     */
    public getImages() {
        mongoose.connect(MONGOLAB_URI, {});

        Models.Film.find({}, 'name', {sort: {_id: 1}}, (err, films) => {
            if (err) throw err;

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
                    if (!error && response.statusCode == 200) {
                        if (body.value.length > 0) {
                            const image = body.value[0].thumbnailUrl;
                            console.log('thumbnailUrl:', image);

                            request.get({url: image, encoding: null}, (error, response, body) => {
                                this.logger.debug('image saved.', error);
                                if (!error && response.statusCode === 200) {
                                    fs.writeFileSync(`${__dirname}/../../../../public/images/film/${film.get('_id').toString()}.jpg`, body, 'binary');
                                }

                                if (i === films.length - 1) {
                                    this.logger.debug('success!');
                                    mongoose.disconnect();
                                    process.exit(0);
                                } else {
                                    i++;
                                    next(films[i]);
                                }
                            });
                        } else {
                            i++;
                            next(films[i]);
                        }
                    } else {
                        if (i === films.length - 1) {
                            this.logger.debug('success!');
                            mongoose.disconnect();
                            process.exit(0);
                        } else {
                            i++;
                            next(films[i]);
                        }
                    }
                });
            };

            let i = 0;
            next(films[i]);
        });
    }
}
