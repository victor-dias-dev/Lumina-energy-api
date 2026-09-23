'use strict';

function usePostgres(databaseUrl) {
  return (
    typeof databaseUrl === 'string' &&
    (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'))
  );
}

function postgresConfig(databaseUrl) {
  const parsed = new URL(databaseUrl);
  const host = parsed.hostname;
  const useSsl = process.env.DATABASE_SSL !== 'false' && host.includes('.render.com');

  return {
    username: decodeURIComponent(parsed.username || ''),
    password: decodeURIComponent(parsed.password || ''),
    database: parsed.pathname.replace(/^\//, '') || 'postgres',
    host,
    port: parsed.port ? Number(parsed.port) : 5432,
    dialect: 'postgres',
    dialectOptions: {
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    },
  };
}

function sqliteConfig() {
  return {
    dialect: 'sqlite',
    storage: process.env.DATABASE_PATH || './data/energy_bills.sqlite',
  };
}

function envConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  return usePostgres(databaseUrl) ? postgresConfig(databaseUrl) : sqliteConfig();
}

module.exports = {
  development: envConfig(),
  test: envConfig(),
  production: envConfig(),
};
