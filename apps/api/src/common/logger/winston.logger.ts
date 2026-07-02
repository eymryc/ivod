import { createLogger, format, transports, Logger } from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

const { combine, timestamp, errors, json, colorize, simple } = format;

export function createAppLogger(): Logger {
  const isProd = process.env.NODE_ENV === 'production';

  return createLogger({
    level: isProd ? 'info' : 'debug',
    format: combine(
      timestamp(),
      errors({ stack: true }),
      isProd
        ? json()
        : combine(
            colorize({ all: true }),
            nestWinstonModuleUtilities.format.nestLike('IVOD', {
              colors: true,
              prettyPrint: true,
            }),
          ),
    ),
    transports: [
      new transports.Console(),
      ...(isProd
        ? [
            new transports.File({ filename: 'logs/error.log', level: 'error' }),
            new transports.File({ filename: 'logs/combined.log' }),
          ]
        : []),
    ],
  });
}
