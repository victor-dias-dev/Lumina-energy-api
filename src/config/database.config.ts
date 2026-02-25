export default () => ({
  database: {
    dialect: 'sqlite',
    storage: process.env.DATABASE_PATH || './data/energy_bills.sqlite',
  },
});
