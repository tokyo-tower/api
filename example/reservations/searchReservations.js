/**
 * 予約検索
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
                scope: 'https://ttts-api-development.azurewebsites.net/transactions',
                state: 'state',
                grant_type: 'client_credentials'
            },
            json: true
        }
    );
    console.log('credentials published.', credentials);

    const reservations = await request.get(
        'http://localhost:8082/reservations',
        {
            auth: {
                bearer: credentials.access_token
            },
            json: true,
            qs: {
                status: 'ReservationConfirmed',
                // performanceId: '171222001001020900',
                performanceStartFrom: moment().toISOString(),
                performanceStartThrough: moment().add(15, 'minutes').toISOString(),
            }
        }
    ).then((body) => body);
    console.log(reservations)
    console.log(reservations.length)
}

main().then(() => {
    console.log('success!')
}).catch((err) => {
    console.error(err);
});