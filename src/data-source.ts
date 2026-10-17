import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: (process.env.DB_TYPE as 'postgres') || 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  synchronize: false,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
