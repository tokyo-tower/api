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
                scope: 'https://ttts-api-development.azurewebsites.net/orders.read-only',
                state: 'state',
                grant_type: 'client_credentials'
            },
            json: true
        }
    );
    console.log('credentials published.', credentials);

    const order = await request.post(
        'http://localhost:8082/orders/findByOrderInquiryKey',
        {
            auth: {
                bearer: credentials.access_token
            },
            json: true,
            body: {
                performanceDay: '20180108',
                paymentNo: '301700',
                telephone: '3896',
            }
        }
    ).then((body) => body);
    console.log('order found.', order);
}

main().then(() => {
    console.log('success!')
}).catch((err) => {
    console.error(err);
});