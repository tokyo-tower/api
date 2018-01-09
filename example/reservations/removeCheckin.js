/**
 * 入場取消サンプル
 * @ignore
 */

const moment = require('moment');
const request = require('request-promise-native');

async function main() {
    // get token
    const credentials = await request.post(
        `https://ttts-development.auth.ap-northeast-1.amazoncognito.com/token`,
        {
            auth: {
                user: process.env.TEST_API_CLIENT_ID,
                password: process.env.TEST_API_CLIENT_SECRET,
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            form: {
                scope: 'https://ttts-api-development.azurewebsites.net/reservations.checkins',
                state: 'state',
                grant_type: 'client_credentials'
            },
            json: true
        }
    );
    console.log('credentials published.', credentials);

    const result = await request.delete(
        'http://localhost:8082/reservations/TT-171222-903010-0/checkins/2018-01-09 02:35:38.605Z',
        {
            auth: {
                bearer: credentials.access_token
            },
            json: true
        }
    ).then((body) => body);
    console.log('result:', result)
}

main().then(() => {
    console.log('success!')
}).catch((err) => {
    console.error(err);
});