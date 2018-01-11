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
                scope: 'https://ttts-api-development.azurewebsites.net/performances.read-only',
                state: 'state',
                grant_type: 'client_credentials'
            },
            json: true
        }
    );
    console.log('credentials published.', credentials);

    const performances = await request.get(
        'http://localhost:8082/performances',
        {
            auth: {
                bearer: credentials.access_token
            },
            json: true,
            qs: {
                start_from: moment().toISOString(),
                start_through: moment().add(1, 'month').toISOString(),
            }
        }
    ).then((body) => body.data);
    console.log('performances[0]:', performances[0])
    console.log(performances.length, 'performances found.')
}

main().then(() => {
    console.log('success!')
}).catch((err) => {
    console.error(err);
});