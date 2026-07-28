import {
  type INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';

import { HttpExceptionFilter } from '@common/filters/http-exception.filter';

export const configureApp = (app: INestApplication): void => {
  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
};
