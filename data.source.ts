import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Booking, Film, Hall, News, Review, Screening, Seat, Ticket, User } from './entities.ts';

// ====== НАСТРОЙКИ ПОДКЛЮЧЕНИЯ К MySQL ======
// Впишите свои логин и пароль. Базу данных создавать вручную не нужно.
const connection = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'MySQL1234',
};

// Имя новой базы, она будет создана автоматически
export const DB_NAME = process.env.DB_NAME || 'cinemadb';
// ===========================================

export const AppDataSource = new DataSource({
  type: 'mariadb',
  ...connection,
  database: DB_NAME,
  // true: TypeORM сам создаст все таблицы по сущностям из entities.ts
  synchronize: true,
  logging: false,
  entities: [User, Film, Hall, Seat, Screening, Booking, Ticket, Review, News],
  subscribers: [],
  migrations: [],
});

// Создаёт саму базу данных, если её ещё нет (подключается без указания базы)
export async function ensureDatabase() {
  const admin = new DataSource({ type: 'mariadb', ...connection });
  await admin.initialize();
  await admin.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4`);
  await admin.destroy();
}
