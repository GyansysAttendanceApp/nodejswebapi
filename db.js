require('dotenv').config();
 
const sql = require("mssql");
// const configNetXs = {
//   user:process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   server: process.env.DB_SERVER,
//   instanceName: process.env.INSTANCE_NAME,
//   database: process.env.DB_DATABASE_NETXS,
//   stream: false,
//   // stream: true,
//   // instanceName: "",
 
//   pool: {
//     max: 10,
//     min: 0,
//     idleTimeoutMillis: 130000,
//   },
//   options: {
//     trustedConnection: true,
//     encrypt: true,
//     enableArithAbort: true,
//     trustServerCertificate: true,
//     requestTimeout: 1300000,
//     idleTimeoutMillis: 1300000,
//   },
// };
 
const configATDB = {
  user:process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  instanceName: process.env.INSTANCE_NAME,
  database: process.env.DB_DATABASE_ATDB,
  stream: false,
  // stream: true,
  // instanceName: "",
 
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 130000,
  },
  options: {
    trustedConnection: true,
    encrypt: true,
    enableArithAbort: true,
    trustServerCertificate: true,
    requestTimeout: 1300000,
    idleTimeoutMillis: 1300000   
  },
};
 
// const poolPromiseNetXs = new sql.ConnectionPool(configNetXs)
//   .connect()
//   .then((pool) => {
//     console.log("Connected to NetXs SQL Database.");
//     return pool;
//   })
//   .catch((err) => console.error("NetXs Database Connection Failed: ", err));
 
  const poolPromiseATDB = new sql.ConnectionPool(configATDB)
  .connect()
  .then((pool) => {
    console.log("Connected to Attendance Tracker SQL Database.");
    return pool;
  })
  .catch((err) => console.error("Attendance Tracker Database Connection Failed: ", err));
 
// module.exports = { configNetXs, configATDB, sql, poolPromiseNetXs, poolPromiseATDB};
module.exports = {configATDB, sql, poolPromiseATDB};
 