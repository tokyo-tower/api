const moment = require('moment');
const request = require('request-promise-native');

async function main() {
    const result = await request.get(
        'http://localhost:8082/utils/pass/list',
        {
            json: true,
            qs: {
                day: '20171224'
            }
        }
    ).then((body) => body);
    console.log('result:', result);
}

main().then(() => {
    console.log('success!')
}).catch((err) => {
    console.error(err);
});