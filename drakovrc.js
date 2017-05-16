const port = normalizePort((process.env.PORT === undefined) ? '8080' : process.env.PORT);
function normalizePort(val) {
    const portNumber = parseInt(val, 10);
    if (isNaN(portNumber)) {
        // named pipe
        return val;
    }
    if (portNumber >= 0) {
        // port number
        return portNumber;
    }
    return false;
}

module.exports = {
    sourceFiles: './blueprints/**/*.md',
    serverPort: port,
    staticPaths: [
        './docs=/docs'
    ],
    stealthmode: true,
    disableCORS: true,
    autoOptions: true,
    public: true,
    // sslKeyFile: '/path/to/ssl/key.key',
    // sslCrtFile: '/path/to/ssl/cert.crt',
    // delay: 2000,
    header: ['Authorization'],
    method: ['DELETE', 'OPTIONS'],
    watch: true
};
