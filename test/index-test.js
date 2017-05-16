var assert = require('assert');
var request = require('request');

const ENDPOINT = 'http://localhost:8080';

describe('not found', () => {
    it('ok', (done) => {
        request.get('http://localhost:8080/any', {
            auth: {
                bearer: 'JWT'
            },
            json: true
        }, (error, response, body) => {
            assert.equal(response.statusCode, 404);
            done();
        });
    });
});

// describe('/performances', () => {
//     it('ok', (done) => {
//         request.get('http://localhost:8080/performances', {
//             auth: {
//                 bearer: 'JWT'
//             },
//             json: true
//         }, (error, response, body) => {
//             console.log(body);
//             assert(response.statusCode === 200);
//             assert(Array.isArray(body.data));
//             done();
//         });
//     });
// });

describe('/oauth/token', () => {
    it('ok', (done) => {
        request.post('http://localhost:8080/oauth/token', {
            body: {
                grant_type: 'client_credintials',
                client_id: 'motionpicture',
                scope: [
                    'performances.readonly'
                ]
            },
            json: true
        }, (error, response, body) => {
            assert.equal(response.statusCode, 200);
            assert(typeof body.access_token, 'string');
            done();
        });
    });
});
