const moment = require('moment');
const request = require('request-promise-native');

async function main() {
    // get token
    const credentials = await request.post(
        `https://ttts-development.auth.ap-northeast-1.amazoncognito.com/token`,
        {
            auth: {
                user: '',
                password: '',
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
        'http://localhost:8080/performances',
        {
            auth: {
                bearer: credentials.access_token
            },
            json: true,
            qs: {
                day: moment().add(1, 'day').format('YYYYMMDD')
            }
        }
    ).then((body) => body.data);
    performances.forEach((performance) => {
        console.log('performance found.', performance);
        console.log('performance found.', performance.attributes.ticket_types);
    });
}

main().then(() => {
    console.log('success!')
}).catch((err) => {
    console.error(err);
});