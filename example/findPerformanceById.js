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

    const performance = await request.get(
        'http://localhost:8082/performances/171220001001020900',
        {
            auth: {
                bearer: credentials.access_token
            },
            json: true
        }
    ).then((body) => body);
    console.log('performance found.', performance);
}

main().then(() => {
    console.log('success!')
}).catch((err) => {
    console.error(err);
});