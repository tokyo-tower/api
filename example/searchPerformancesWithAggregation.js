const moment = require('moment');
const request = require('request-promise-native');

async function main() {
    const result = await request.get(
        'http://localhost:8082/preview/performancesWithAggregation',
        {
            json: true,
            qs: {
                startFrom: moment().toISOString(),
                startThrough: moment().add(2, 'days').toISOString()
            }
        }
    ).then((body) => body);
    console.log('result:', result);
    console.log('result.length:', result.length);
}

main().then(() => {
    console.log('success!')
}).catch((err) => {
    console.error(err);
});