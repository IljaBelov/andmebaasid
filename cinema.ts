import'reflect-metadata';
import { AppDataSource } from './data.source.ts';

AppDataSource.initialize()
  .then(() => {
    console.log('Подключение к базе данных успешно установлено!');
  })
  .catch((error) => console.log('Ошибка при подключении к БД:', error));
