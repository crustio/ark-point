import {logger} from '../log';

const mongoose = require('mongoose');

/**
 *  connect
 */
const DB_URL = 'mongodb://xxx';

mongoose.connect(DB_URL, {
    poolSize: 10,
    bufferMaxEntries: 0,
    reconnectTries: 5000,
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

/**
 *  connect success
 */
mongoose.connection.on('connected', () => {
    logger.info('Mongoose connection open to ' + DB_URL);
});

/**
 *  connect error
 */
mongoose.connection.on('error', (err: any) => {
    logger.error('Mongoose connection error: ' + err);
});

/**
 *  disconnected
 */
mongoose.connection.on('disconnected', () => {
    logger.info('Mongoose connection disconnected');
});

export = mongoose;
