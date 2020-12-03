import {argv} from 'process';
import {logger} from './log';
import express, {Request, Response} from 'express';
import {SubscriberService} from './services';
import {getApi, initApi} from './services/chainService';

const app = express();

const port = argv[2] || 3000;

let subscriberService: SubscriberService;

const subscribeHead = () => {
  const api = getApi();
  subscriberService = new SubscriberService(api);
  subscriberService
    .subscribeNewBlock()
    .then(e => logger.info('Start the application normally'))
    .catch(error => {
      logger.error(`💥  Caught some error: ${error.toString()}`);
      throw error;
    });

  api.on('disconnected', () => {
    logger.error('☄️ [global] api on disconnected exception');
    initApi();
    subscribeHead();
  });
};

const errorHandler = (
  err: any,
  _req: Request | null,
  res: Response | null,
  _next: any
) => {
  const errMsg: string = '' + err ? err.message : 'Unknown error';
  logger.error(`☄️ [global]: Error catched: ${errMsg}.`);
  initApi();
  subscribeHead();
  logger.warn('📡 [global]: Connection reinitialized.');
};

subscribeHead();

app.listen(port, () => {
  logger.info(`app listening on port ${port}`);
});

// Error handler
app.use(errorHandler);
process.on('uncaughtException', (err: Error) => {
  logger.error(`☄️ [global] Uncaught exception ${err.message}`);
});
