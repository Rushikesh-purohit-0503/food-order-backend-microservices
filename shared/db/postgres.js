const { Pool } = require("pg");

module.exports = new Pool({
  host: "postgres",
  user: "foodapp",
  password: "foodapp",
  database: "foodapp",
  port: 5432
});
