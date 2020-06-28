import express from 'express';
import path from 'path';
import Youch from 'youch';
import * as Sentry from '@sentry/node';
import 'express-async-errors';
import cors from 'cors';
import routes from './routes';

import 'dotenv/config';
import './database';

import sentryConfig from './config/sentry';

class App {
  constructor() {
    this.server = express();

    if (process.env.SENTRY_START === 'true') Sentry.init(sentryConfig);

    this.middlewares();
    this.routes();
    this.exceptionHandler();
  }

  middlewares() {
    this.server.use(Sentry.Handlers.requestHandler());
    this.server.use(cors());
    this.server.use(express.json());
    this.server.use(
      '/files',
      express.static(path.resolve(process.env.DIR_UPLOADS))
    );
  }

  routes() {
    this.server.use(routes);
    this.server.use(Sentry.Handlers.errorHandler());
  }

  exceptionHandler() {
    this.server.use(async (err, req, res, next) => {
      let errors = 'Internal server error';
      if (process.env.NODE_ENV === 'development') {
        errors = await new Youch(err, req).toJSON();
      }
      return res.status(500).json({ err: errors });
    });
  }
}

export default new App().server;
