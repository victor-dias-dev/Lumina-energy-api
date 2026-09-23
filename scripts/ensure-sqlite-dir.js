'use strict';

const fs = require('fs');
const path = require('path');

const databaseUrl = process.env.DATABASE_URL || '';
const usePostgres =
  databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');

if (!usePostgres) {
  const storage = process.env.DATABASE_PATH || './data/energy_bills.sqlite';
  fs.mkdirSync(path.dirname(path.resolve(storage)), { recursive: true });
}
