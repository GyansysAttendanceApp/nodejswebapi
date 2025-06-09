require("dotenv").config();
 
const { getToken, verifyToken } = require("./middleware/authController");
 
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const os = require("os");
const path = require("path");
 
const {
  //  configNetXs,
  configATDB,
  sql,
  //  poolPromiseNetXs,
  poolPromiseATDB,
} = require("./db");
 
const app = express();
const PORT = process.env.PORT;
const BASE_URL = "/attendance";
`${BASE_URL}/api/employees`, app.use(bodyParser.json({ limit: "100mb" })); //comment
app.use(cors());
 
// the below is the controller for token generation and verification
app.post("/api/get-token", getToken);
 
//app.use(bodyParser.json({ limit: '100mb' }));
 
// app.use(express.static(path.join(__dirname, 'ReactUIApp/build')));
//Integration Start
// below is for suggestion api (using Stored Procedure)
app.get("/api/lastsyncdate", async (req, res) => {
  // const swipejson = req.body;
  // const jsonString = JSON.stringify(swipejson);
  try {
    const pool = await poolPromiseATDB;
    const result = await pool.request().execute("sp_GetLastSyncDateWithNetxs");
    console.log("ress", result.recordset.LastCloudSyncDate);
    res.json(result.recordset[0].LastCloudSyncDate);
  } catch (error) {
    console.error(
      "Error getting integration last sync date to sp_GetLastSyncDateWithNetxs: ",
      error
    );
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/get-last-sync-date",verifyToken,  async (req, res) => {
  // const swipejson = req.body;
  // const jsonString = JSON.stringify(swipejson);
  try {
    const pool = await poolPromiseATDB;
    const result = await pool.request().execute("sp_GetLastSyncDateWithNetxs");
    console.log("ress", result.recordset.LastCloudSyncDate);
    res.json(result.recordset[0].LastCloudSyncDate);
  } catch (error) {
    console.error(
      "Error getting integration last sync date to sp_GetLastSyncDateWithNetxs: ",
      error
    );
    res.status(500).json({ error: "Internal Server Error" });
  }
});
 
app.post("/api/integration-daily-swipe-data", verifyToken, async (req, res) => {
  //const swipejson = req.query.swipejson;
  const swipejson = req.body;
  const jsonString = JSON.stringify(swipejson);
  try {
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()
      .input("param_swipejson", sql.NVarChar(sql.MAX), jsonString)
      .execute("sp_IntegrateDailySwipeData");
    //input("json", sql.NVarChar(sql.MAX), jsonString)
 
    res.json(result.recordset);
  } catch (error) {
    console.error(
      "Error uploading integration data to sp_IntegrateDailySwipeData: ",
      error
    );
    res.status(500).json({ error: "Internal Server Error" });
  }
});
 
app.post("/api/integration-employee-data", verifyToken, async (req, res) => {
  const employeejson = req.body;
  const jsonString = JSON.stringify(employeejson);
  try {
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()
      .input("param_employeejson", sql.NVarChar(sql.MAX), jsonString)
      .execute("sp_IntegrateEmployeeData");
 
    res.json(result.recordset);
  } catch (error) {
    console.error(
      "Error uploading integration data to sp_IntegrateEmplyeeData: ",
      error
    );
    res.status(500).json({ error: "Internal Server Error" });
  }
});
 
// integrate - department-data
app.post("/api/integration-department-data", verifyToken, async (req, res) => {
  const deparmentjson = req.body;
  const jsonString = JSON.stringify(deparmentjson);
  try {
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()
      .input("param_deptjson", sql.NVarChar(sql.MAX), jsonString)
      .execute("sp_IntegrateDepartmentData");
 
    res.json(result.recordset);
  } catch (error) {
    console.error(
      "Error uploading integration data to sp_IntegrateDepartmentData: ",
      error
    );
    res.status(500).json({ error: "Internal Server Error" });
  }
});
 
// integrate - gate-data
app.post("/api/integration-Gate-data", verifyToken, async (req, res) => {
  const gatejson = req.body;
  const jsonString = JSON.stringify(gatejson);
  try {
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()
      .input("param_gatejson", sql.NVarChar(sql.MAX), jsonString)
      .execute("sp_IntegrateGateData");
 
    res.json(result.recordset);
  } catch (error) {
    console.error(
      "Error uploading integration data to sp_IntegrateGateData: ",
      error
    );
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/integrate-missing-trans", async (req, res) => {
  // 1) The client should send a bare array of transaction objects:
  //    [ { CID: "001", GtNo: "01", ..., location: null, ... }, {...}, ... ]
  //
  //    If you ever wrap it as { transactions: [...] }, this line still handles it.
  const incoming = Array.isArray(req.body) ? req.body : req.body.transactions;
  if (!Array.isArray(incoming)) {
    return res
      .status(400)
      .json({ error: "Expected a JSON array of transaction objects." });
  }

  try {
    const pool = await poolPromiseATDB;

    // 2) Build the TVP columns in the exact same order & types as dbo.TVP_TransTable in SQL:
    const tvp = new sql.Table("dbo.TVP_TransTable");
    tvp.columns.add("CID",         sql.VarChar(50));
    tvp.columns.add("GtNo",        sql.VarChar(50));
    tvp.columns.add("EmpID",       sql.VarChar(50));
    tvp.columns.add("CardID",      sql.VarChar(50));
    tvp.columns.add("dt",          sql.VarChar(23));
    tvp.columns.add("InOut",       sql.VarChar(10));
    tvp.columns.add("ErrDesc",     sql.VarChar(255));
    tvp.columns.add("loccode",     sql.VarChar(50));
    tvp.columns.add("downloccode", sql.VarChar(50));
    tvp.columns.add("status",      sql.VarChar(50));
    tvp.columns.add("Tid",         sql.BigInt);
    tvp.columns.add("sitecode",    sql.VarChar(50));
    tvp.columns.add("deptid",      sql.VarChar(50));
    tvp.columns.add("type",        sql.VarChar(50));
    tvp.columns.add("updatedon",   sql.VarChar(23)); // Use VarChar(23) for DATETIME2 precision
    tvp.columns.add("empname",     sql.VarChar(255));
    tvp.columns.add("location",    sql.VarChar(255));
    tvp.columns.add("VFlag",       sql.VarChar(10));

    // 3) Coerce each property into the correct JS type before adding to TVP:
    incoming.forEach(tx => {
      // Strings or null for VARCHAR columns:
      const CIDVal       = tx.CID       != null ? String(tx.CID)       : null;
      const GtNoVal      = tx.GtNo      != null ? String(tx.GtNo)      : null;
      const EmpIDVal     = tx.EmpID     != null ? String(tx.EmpID)     : null;
      const CardIDVal    = tx.CardID    != null ? String(tx.CardID)    : null;
      const dtVal        = tx.dt        ? tx.dt       : null;
      const InOutVal     = tx.InOut     != null ? String(tx.InOut)     : null;
      const ErrDescVal   = tx.ErrDesc   != null ? String(tx.ErrDesc)   : null;
      const loccodeVal   = tx.loccode   != null ? String(tx.loccode)   : null;
      const downlocVal   = tx.downloccode != null ? String(tx.downloccode) : null;
      const statusVal    = tx.status    != null ? String(tx.status)    : null;

      // Number or null for BIGINT column:
      const TidVal       = tx.Tid       != null ? Number(tx.Tid)       : null;

      const sitecodeVal  = tx.sitecode  != null ? String(tx.sitecode)  : null;
      const deptidVal    = tx.deptid    != null ? String(tx.deptid)    : null;
      const typeVal      = tx.type      != null ? String(tx.type)      : null;
      const updatedonVal = tx.updatedon ? tx.updatedon  : null;
      const empnameVal   = tx.empname   != null ? String(tx.empname)   : null;

      // location is now either null or a string.
      // If your C# side sent location=null, tx.location === null here => locationVal stays null.
      const locationVal = tx.location != null ? String(tx.location) : null;

      const VFlagVal     = tx.VFlag     != null ? String(tx.VFlag)     : null;

      // 4) Add the row into the TVP in exactly the same column order as above:
      tvp.rows.add(
        CIDVal,        // CID (VARCHAR(50))
        GtNoVal,       // GtNo (VARCHAR(50))
        EmpIDVal,      // EmpID (VARCHAR(50))
        CardIDVal,     // CardID (VARCHAR(50))
        dtVal,         // dt (DATETIME)
        InOutVal,      // InOut (VARCHAR(10))
        ErrDescVal,    // ErrDesc (VARCHAR(255))
        loccodeVal,    // loccode (VARCHAR(50))
        downlocVal,    // downloccode (VARCHAR(50))
        statusVal,     // status (VARCHAR(50))
        TidVal,        // Tid (BIGINT)
        sitecodeVal,   // sitecode (VARCHAR(50))
        deptidVal,     // deptid (VARCHAR(50))
        typeVal,       // type (VARCHAR(50))
        updatedonVal,  // updatedon (DATETIME)
        empnameVal,    // empname (VARCHAR(255))
        locationVal,   // location (VARCHAR(255)) now null or string
        VFlagVal       // VFlag (VARCHAR(10))
      );
    });

    // 5) Execute the stored procedure that inserts from @TVP into NetXs_Trans
    await pool
      .request()
      .input("TVP", tvp)  // matches: @TVP dbo.TVP_TransTable READONLY
      .execute("sp_IntegrateMissingTransData");
    console.log('triggered')
    return res
      .status(200)
      .json({ message: "Missing transaction data integrated successfully." });
  }
  catch (error) {
    console.error("Error integrating missing transactions:", error);
    return res
      .status(500)
      .json({ error: "Failed to integrate missing transactions." });
  }
});





app.get("/api/gettranstid-list", async (req, res) => {
  try {
    // 1) Read startDate and endDate from the query string,
    //    in “YYYY-MM-DD” format. E.g. /api/gettranstid-list?startDate=2025-05-21&endDate=2025-05-26
    const startDateParam = req.query.startDate;  // e.g. "2025-05-21"
    const endDateParam   = req.query.endDate;    // e.g. "2025-05-26"

    if (!startDateParam || !endDateParam) {
      return res
        .status(400)
        .json({ message: "You must supply both ?startDate=YYYY-MM-DD & ?endDate=YYYY-MM-DD" });
    }

    // 2) Build plain “YYYY-MM-DD HH:mm:ss” strings—no toISOString, no UTC conversion.
    //    We want “start of day” at 00:00:00 and “end of day” at 23:59:59 (or 23:59:59.997 if you like).
    const startDateTimeStr = `${startDateParam} 00:00:00`;
    const endDateTimeStr   = `${endDateParam} 23:59:59`;

    // 3) Query SQL Server. We pass the plain string as sql.DateTime (or DateTime2).
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()
      // Notice: we explicitly say “sql.DateTime” here, but we hand it a string like “2025-05-21 00:00:00”.
      // SQL Server will interpret that as a “local” datetime (no timezone adjustment).
      .input("startDate", sql.VarChar(23), startDateTimeStr)
      .input("endDate",   sql.VarChar(23), endDateTimeStr)
      .query(`
        SELECT 
          Tid,
          -- Return dt exactly as stored in the database (no CONVERT to dd-MM-yyyy, etc.)
          dt 
        FROM dbo.NetXs_Trans
        WHERE dt >= @startDate 
          AND dt <= @endDate
      `);

    // 4) Send back a JSON array of { Tid: <long>, dt: <Date> }.
    //    Express (and mssql) will automatically serialize “dt” as a JS Date.
    //    If you want “dd-MM-yyyy HH:mm:ss” on the client, you can convert later.
    return res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Error in /api/gettranstid-list:", err);
    return res.status(500).json({ message: "Failed to retrieve TID list." });
  }
});

//Integration End
 
// below is for suggestion api (using Stored Procedure)
app.get("/api/employees", verifyToken, async (req, res) => {
  const name = req.query.name;
  const email = req.query.email;
 
  try {
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()
      .input("param_EmpName", sql.NVarChar, `${name}`)
      .input("param_ManagerEmail", sql.NVarChar, `${email}`)
      .execute("sp_SearchEmployeesByName");
 
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching employees sp_SearchEmployeesByName: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
 
// below is sp api call this one is for handle search
app.get("/api/attendance/:empId/:date", verifyToken, async (req, res) => {
  const empId = req.params.empId;
  const date = req.params.date;
 
  try {
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()
      .input("param_EmpID", sql.NVarChar, empId)
      .input("param_Date", sql.NVarChar, date)
      .execute("sp_GetEmpAttendance");
 
    res.json(result.recordset);
  } catch (error) {
    console.error(
      "Error fetching employee attendance sp_GetEmpAttendance: ",
      error
    );
    res.status(500).json({ error: "Internal Server Error" });
  }
});
 
// below is sp query this is for table
// app.get("/api/dept", verifyToken, async (req, res) => {
//   const date = req.query.date;
 
//   sql
//     .connect(configATDB)
//     .then(() => {
//       const request = new sql.Request();
 
//       request.input("param_Date", sql.VarChar, date);
 
//       request
//         .execute("sp_GetDeptwiseAttendance")
//         .then((result) => {
//           return res.json(result.recordset);
//         })
//         .catch((err) => {
//           console.error(`Error executing sp_GetDeptwiseAttendance: ${err}`);
//         });
//     })
//     .catch((err) => {
//       console.error(err);
//     });
//   // return [];
// });
 
app.get("/api/dept", verifyToken, async (req, res) => {
  const date = req.query.date;
  const email = req.query.email;
  const transitionDate = "2025-04-16";
 
  sql
    .connect(configATDB)
    .then(() => {
      const request = new sql.Request();
      request.input("ManagerEmail", sql.NVarChar, email);
      request.input("param_Date", sql.Date, date);
      request.input("TransitionDate", sql.Date, transitionDate);
 
      request
        .execute("sp_GetDeptwiseAttendance_dev")
 
        .then((result) => {
          return res.json(result.recordset);
        })
        .catch((err) => {
          console.error(`Error executing sp_GetDeptwiseAttendance_dev: ${err}`);
        });
    })
    .catch((err) => {
      console.error(err);
    });
  // return [];
});
// // Api for ranged attendance History of Employeee (based on EmpID, startdate enddate)
// server/routes/attendanceRoutes.js
app.get('/api/attendance/range', verifyToken, async (req, res) => {
  const { empid, start, end } = req.query;
  try {
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()
      .input('param_EmpID', sql.NVarChar(15), empid)
      .input('param_StartDate', sql.Date, start)
      .input('param_EndDate', sql.Date, end)
      .execute('sp_GetAttendanceHistoryRange'); // <-- you write this stored proc
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// // API for Daily Attendance History of Employeee (based on EmpID, Year, Month)
app.get(
  "/api/attendance/:empId/:year/:month",
  verifyToken,
  async (req, res) => {
    const empId = req.params.empId;
    const year = req.params.year;
    const month = req.params.month;
 
    try {
      const pool = await poolPromiseATDB;
      const result = await pool
        .request()
        .input("param_EmpID", sql.NVarChar, empId)
        .input("param_Year", sql.NVarChar, year)
        .input("param_Month", sql.NVarChar, month)
        .execute("[dbo].[sp_GetDailyAttendanceHistory]");
 
      res.json(result.recordset);
    } catch (error) {
      console.error(
        "Error fetching employee attendance history [dbo].[sp_GetDailyAttendanceHistory]: ",
        error
      );
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);
 
app.get(
  "/api/get-employee-attendance/:operationId/:date/:deptId/:subdeptId",
  verifyToken,
  async (req, res) => {
    const operationId = req.params.operationId;
    const date = req.params.date;
    const deptId = req.params.deptId;
    const subDeptId = req.params.subdeptId || null;
 
    try {
      const pool = await poolPromiseATDB;
      const result = await pool
        .request()
        .input("param_OperationId", sql.NVarChar(2), operationId)
        .input("param_Date", sql.NVarChar(10), date)
        .input("param_DeptId", sql.NVarChar(10), deptId)
        .input("param_SubDeptID", sql.NVarChar(10), subDeptId)
        .execute("[dbo].[sp_GetEmployeeAttendance_NEW]");
       
      res.json(result.recordset);
      console.log('executed',result.recordset);
    } catch (error) {
      console.error(
        "Error fetching employee attendance [dbo].[sp_GetEmployeeAttendance_new]: ",
        error
      );
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);
 

app.get(
  "/api/get-employee-absent/:operationId/:date/:deptId/:subdeptId",
  verifyToken,
  async (req, res) => {
    const operationId = req.params.operationId;
    const date = req.params.date;
    const deptId = req.params.deptId;
    const subDeptId = req.params.subdeptId || null;
 
    try {
      const pool = await poolPromiseATDB;
      const result = await pool
        .request()
        .input("param_OperationId", sql.NVarChar(2), operationId)
        .input("param_Date", sql.NVarChar(10), date)
        .input("param_DeptId", sql.NVarChar(10), deptId)
        .input("param_SubDeptID", sql.NVarChar(10), subDeptId)
        .execute("[dbo].[sp_GetEmployeeAbsentees_NEW]");
       
      res.json(result.recordset);
      console.log('executed',result.recordset);
    } catch (error) {
      console.error(
        "Error fetching employee attendance [dbo].[sp_GetEmployeeAbsentees_NEW]: ",
        error
      );
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);


app.put("/api/update-expected-count", verifyToken, async (req, res) => {
  const { deptId, subDeptId, newExpectedCount } = req.body;
 
  if (!deptId || !newExpectedCount) {
    return res.status(400).json({ error: "DeptID and NewExpectedCount are required" });
  }
 
  try {
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()
      .input("DeptID", sql.NVarChar(10), deptId)
      .input("SubDeptID", sql.NVarChar(10), subDeptId || null) // SubDeptID is optional
      .input("NewExpectedCount", sql.Int, newExpectedCount)
      .execute("sp_UpdateExpectedCount");
 
    res.status(200).json({ message: "Expected count updated successfully", result: result.recordset });
  } catch (error) {
    console.error("Error executing sp_UpdateExpectedCount: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
 
//monthly report
app.get("/api/monthly-attendance", verifyToken, async (req, res) => {
  const { operationId, deptId, year, month, subDeptId } = req.query;
 
  try {
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()
      .input("param_OperationId", sql.NVarChar(2), operationId)
      .input("param_DeptId", sql.NVarChar(10), deptId)
      .input("param_Year", sql.NVarChar(4), year)
      .input("param_Month", sql.NVarChar(2), month)
      .input("param_SubDeptID", sql.NVarChar(10), subDeptId || null)
      .execute("[dbo].[sp_GetEmployeeAttendance_NEW]");
 
    res.status(200).json(result.recordset);
    console.log("Executed successfully:", result.recordset);
  } catch (error) {
    console.error(
      "Error executing [dbo].[sp_GetEmployeeAttendance_NEW]: ",
      error
    );
    res.status(500).json({ error: "Internal Server Error" });
  }
});
 
//monthly report
app.get("/api/Monthly-attendance-batch", verifyToken, async (req, res) => {
  const { operationId, deptId, subDeptId, fromDate, toDate } = req.query;

  try {
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()
      .input("param_OperationId", sql.NVarChar(2), operationId)
      .input("param_DeptId", sql.NVarChar(10), deptId)
      .input("param_SubDeptID", sql.NVarChar(10), subDeptId || null)
      .input("param_FromDate", sql.Date, fromDate)
      .input("param_ToDate", sql.Date, toDate)
      .execute("[dbo].[sp_GetDeptAttHistory_range]");

    res.status(200).json(result.recordset);
    console.log("Executed successfully:", result.recordset);
  } catch (error) {
    console.error(
      "Error executing [dbo].[sp_GetEmployeeAttendance_NEW]: ",
      error
    );
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// API for Daily deptwise  Attendance History of Employeee (based on EmpID, Year, Month)
app.get(
  "/api/get-employee-attendance/:operationId/:date/:deptId/",
  verifyToken,
  async (req, res) => {
    const operationId = req.params.operationId;
    const date = req.params.date;
    const deptId = req.params.deptId;
 
    try {
      const pool = await poolPromiseATDB;
      const result = await pool
        .request()
        .input("param_OperationId", sql.NVarChar(2), operationId)
        .input("param_Date", sql.NVarChar(10), date)
        .input("param_DeptId", sql.NVarChar(10), deptId)
        .execute("[dbo].[sp_GetEmployeeAttendance]");
 
      res.json(result.recordset);
    } catch (error) {
      console.error(
        "Error fetching employee attendance [dbo].[sp_GetEmployeeAttendance]: ",
        error
      );
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);
 
app.get("/api/get-employee-attendance/", verifyToken, async (req, res) => {
  const { operationId, deptId, empid, date, year, month } = req.query;
  console.log("req.query", req.query);
  try {
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()
      .input("param_OperationId", sql.NVarChar(2), operationId)
      .input("param_DeptId", sql.NVarChar(10), deptId)
      .input("param_EmpId", sql.NVarChar(10), empid || null)
      .input("param_Date", sql.NVarChar(10), date || null)
      .input("param_Year", sql.SmallInt, year || null)
      .input("param_Month", sql.SmallInt, month || null)
     
      .execute("[dbo].[sp_GetEmployeeAttendance]");
    res.json(result.recordset);
   
  } catch (error) {
    console.error(
      "Error fetching employee attendance [dbo].[sp_GetEmployeeAttendance]: ",
      error
    );
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//  API for fetching user roles based on EmployeeEmail
app.get("/api/userroles", verifyToken, async (req, res) => {
  const EmployeeEmail = req.query.email;
 
  if (!EmployeeEmail) {
    return res.status(400).json({ error: "Employee email is required" });
  }
 
  try {
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()
      .input("param_LoggedInUserEmail", sql.NVarChar, EmployeeEmail)
      .execute("[dbo].[sp_GetUserRoles]"); // Updated stored procedure name
 
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching user roles: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
  // return [];
});
 
// API for fetching watchlist details for today based on loginemail and current date
app.get("/api/watchlist/:email/:date", verifyToken, async (req, res) => {
  const email = req.params.email;
  const date = req.params.date;
 
  try {
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()
      .input("param_LoggedInUserEmail", sql.NVarChar, email)
      .input("param_Date", sql.NVarChar, date)
      .execute("[dbo].[sp_WatchListDetailsForToday]");
 
    res.json(result.recordset);
  } catch (error) {
    console.error(
      "Error fetching watch list details for today [dbo].[sp_WatchListDetailsForToday]: ",
      error
    );
    res.status(500).json({ error: "Internal Server Error" });
  }
  // return [];
});
 
// API For Fetching the watchlist based on the logged-in users email
app.get("/api/watchlist/:email", verifyToken, async (req, res) => {
  const email = req.params.email;
 
  try {
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()
      .input("param_LoggedInUserEmail", sql.NVarChar, email)
      .execute("[dbo].[sp_GetWatchList]");
 
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching watch list [dbo].[sp_GetWatchList]: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
 
// API for deleting a watchlist
app.delete(
  "/api/watchlist/:email/:watchListId",
  verifyToken,
  async (req, res) => {
    const email = req.params.email;
    const watchListId = req.params.watchListId;
 
    try {
      const pool = await poolPromiseATDB;
      const result = await pool
        .request()
        .input("param_LoggedInUserEmail", sql.NVarChar, email)
        .input("param_WatchListID", sql.BigInt, watchListId)
        .execute("[dbo].[sp_DeleteWatchList]");
 
      res.json({ message: "Watchlist deleted successfully" });
    } catch (error) {
      console.error(
        "Error deleting watchlist [dbo].[sp_DeleteWatchList]: ",
        error
      );
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);
 
// API for getting watchlist by ID
app.get("/api/watchlistdetails/:email/:id", verifyToken, async (req, res) => {
  const email = req.params.email;
  const watchListId = req.params.id;
 
  try {
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()
      .input("param_LoggedInUserEmail", sql.NVarChar, email)
      .input("param_WatchListID", sql.BigInt, watchListId)
      .execute("[dbo].[sp_GetWatchListByID]");
 
    res.json(result.recordset);
  } catch (error) {
    console.error(
      "Error fetching watch list by ID [dbo].[sp_GetWatchListByID]: ",
      error
    );
    res.status(500).json({ error: "Internal Server Error" });
  }
});
 
// Define the PUT endpoint for updating watchlist data
app.put("/api/watchlist/:watchlistId", verifyToken, async (req, res) => {
  const watchlistId = req.params.watchlistId;
 
  const {
    param_LoggedInUserEmail,
    param_WatchListName,
    param_WatchListID,
    param_WatchListDescription,
    param_WatchListPrimaryOwnerName,
    param_WatchListPrimaryOwnerEmail,
    param_tvp_WatchListEmployees,
  } = req.body;
 
  console.log("UPDATE/PUT WatchList", req.body);
  try {
    // Get a connection pool from the database
    const pool = await poolPromiseATDB;
 
    // Create a new SQL Table-Valued Parameter (TVP) for employees
    const tvp = new sql.Table();
    tvp.columns.add("EmployeeID", sql.VarChar(10));
    tvp.columns.add("EmployeeName", sql.NVarChar(255));
    tvp.columns.add("EmployeeEmail", sql.NVarChar(255));
    tvp.columns.add("StartDate", sql.Date); // Optional: Add EmployeeStatus if needed
    tvp.columns.add("EndDate", sql.Date); // Optional: Add EmployeeRole if needed
 
    // Add employee data to the TVP
    param_tvp_WatchListEmployees.forEach((emp) => {
      tvp.rows.add(
        emp.EmployeeID,
        emp.EmployeeName,
        emp.EmployeeEmail,
        emp.StartDate,
        emp.EndDate
      );
    });
 
    // Execute the stored procedure to update the watchlist
    const result = await pool
      .request()
      .input(
        "param_LoggedInUserEmail",
        sql.NVarChar(255),
        param_LoggedInUserEmail
      )
      .input("param_WatchListID", sql.BigInt, watchlistId)
      .input("param_WatchListName", sql.NVarChar(100), param_WatchListName)
      .input(
        "param_WatchListDescription",
        sql.NVarChar(255),
        param_WatchListDescription
      )
      .input(
        "param_WatchListPrimaryOwnerName",
        sql.NVarChar(255),
        param_WatchListPrimaryOwnerName
      )
      .input(
        "param_WatchListPrimaryOwnerEmail",
        sql.NVarChar(255),
        param_WatchListPrimaryOwnerEmail
      )
      .input("param_tvp_WatchListEmployees", sql.TVP, tvp)
      .execute("[dbo].[sp_UpdateWatchList]");
 
    // Send a success response
    res.status(200).json({ message: "Watchlist updated successfully" });
  } catch (error) {
    // Handle errors
    console.error("Error updating watchlist: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
 
app.post("/api/watchlist/create", verifyToken, async (req, res) => {
  const {
    param_LoggedInUserEmail,
    param_WatchListName,
    param_WatchListDescription,
    param_WatchListPrimaryOwnerName,
    param_WatchListPrimaryOwnerEmail,
    param_tvp_WatchListEmployees,
  } = req.body;
 
  console.log("POST - Server received data: ", req.body);
 
  try {
    const pool = await poolPromiseATDB;
 
    const tvp = new sql.Table();
    tvp.columns.add("EmployeeID", sql.VarChar(10));
    tvp.columns.add("EmployeeName", sql.NVarChar(255));
    tvp.columns.add("EmployeeEmail", sql.NVarChar(255));
    tvp.columns.add("StartDate", sql.Date); // Optional: Add EmployeeStatus if needed
    tvp.columns.add("EndDate", sql.Date); 
 
    param_tvp_WatchListEmployees.forEach((emp, index) => {
     tvp.rows.add(
    emp.EmployeeID,
    emp.EmployeeName,
    emp.EmployeeEmail,
    emp.StartDate,
    emp.EndDate
  ); // index + 1, emp.EmpID
    });
 
    await pool
      .request()
      .input(
        "param_LoggedInUserEmail",
        sql.NVarChar(255),
        param_LoggedInUserEmail
      )
      .input("param_WatchListName", sql.NVarChar(255), param_WatchListName)
      .input(
        "param_WatchListDescription",
        sql.NVarChar(255),
        param_WatchListDescription
      )
      .input(
        "param_WatchListPrimaryOwnerName",
        sql.NVarChar(255),
        param_WatchListPrimaryOwnerName
      )
      .input(
        "param_WatchListPrimaryOwnerEmail",
        sql.NVarChar(255),
        param_WatchListPrimaryOwnerEmail
      )
      .input("param_tvp_WatchListEmployees", sql.TVP, tvp)
      .execute("[dbo].[sp_CreateWatchList]");
 
    res.status(200).json({ message: "Watchlist created successfully" });
  } catch (error) {
    console.error("Error creating watchlist: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
 
// 1) GET Dept‑SubDept mapping
app.get("/api/deptsubdeptmapping", async (req, res) => {
  try {
    const pool = await poolPromiseATDB;
    const result = await pool.request().execute("sp_GetDeptSubDeptMapping");
 
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Error fetching dept‑subdept mapping:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
 
// // 2) GET all employees (with optional dept/sub filters)
// app.get('/api/employeereport', async (req, res) => {
//   const { deptid, subdeptid } = req.query;
//   try {
//     const pool = await poolPromiseATDB;
//     const result = await pool.request()
//       .execute('usp_GetAllEmployeeStatus');
 
//     let rows = result.recordset;
//     if (deptid)    rows = rows.filter(r => r.Deptid === parseInt(deptid));
//     if (subdeptid) rows = rows.filter(r => r.Subdeptid === parseInt(subdeptid));
 
//     res.status(200).json(rows);
//   } catch (err) {
//     console.error('Error fetching employee list:', err);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });
 
app.get("/api/employeereport", async (req, res) => {
  const { deptid, subdeptid } = req.query;
  try {
    const pool = await poolPromiseATDB;
    const request = pool.request();
 
    if (deptid && !isNaN(parseInt(deptid))) {
      request.input("deptid", sql.Int, parseInt(deptid));
    }
    if (subdeptid) {
      request.input("subdeptid", sql.VarChar(50), subdeptid);
    }
 
    const result = await request.execute("usp_GetAllEmployeeStatus");
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Error fetching employee list:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
 
// 3) POST update employee report
app.post("/api/employeereport/:empid/report", async (req, res) => {
  const { empid } = req.params;
  const { report } = req.body;
  if (!report)
    return res.status(400).json({ error: "Report content is required" });
 
  try {
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()
      .input("Empid", sql.NVarChar(15), empid)
      .input("Report", sql.NVarChar(sql.MAX), report)
      .execute("sp_UpdateEmployeeReport");
 
    // return updated row
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset[0]);
    } else {
      res.status(404).json({ error: "Employee not found" });
    }
  } catch (err) {
    console.error("Error updating employee report:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
 
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../ReactUIApp/build', 'index.html'));
// });
 
/** 1️⃣ Get Dept/Sub‑Dept list */
app.get("/api/deptsubdept", verifyToken, async (req, res) => {
  try {
    const pool = await poolPromiseATDB; // Corrected pool reference
    const result = await pool.request().execute("sp_GetDeptSubDeptMapping");
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching Dept/Sub-Dept list:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
 
/** 2️⃣ Search employees by name */
app.get("/api/employeedpt", verifyToken, async (req, res) => {
  const search = req.query.search || "";
  try {
    const pool = await poolPromiseATDB; // Corrected pool reference
    const result = await pool
      .request()
      .input("SearchTerm", sql.NVarChar(100), search)
      .execute("sp_SearchEmployees");
    res.json(result.recordset);
  } catch (err) {
    console.error("Error searching employees:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
 
/** 3️⃣ Insert new Dept‑Manager mapping */
app.post("/api/deptmanager", verifyToken, async (req, res) => {
  const { DeptId, DeptName, SubDeptId, SubDeptName, ManagerId, ManagerEmail } =
    req.body;
 
  if (!DeptId || !DeptName || !SubDeptId || !ManagerId || !ManagerEmail) {
    return res.status(400).json({ error: "Missing required fields" });
  }
 
  try {
    const pool = await poolPromiseATDB; // Corrected pool reference
 
    const existingMapping = await pool
      .request()
      .input("DeptId", sql.NVarChar(50), DeptId)
      .input("SubDeptId", sql.NVarChar(50), SubDeptId)
      .input("ManagerId", sql.NVarChar(50), ManagerId)
      .execute("sp_CheckDeptManagerMapping"); // Stored procedure to check existing mapping
 
    if (existingMapping.recordset.length > 0) {
      return res
        .status(400)
        .json({
          error:
            "This manager is already mapped to the specified department and sub-department.",
        });
    }
    await pool
      .request()
      .input("DeptId", sql.NVarChar(50), DeptId)
      .input("DeptName", sql.NVarChar(50), DeptName)
      .input("SubDeptId", sql.NVarChar(50), SubDeptId)
      .input("SubDeptName", sql.NVarChar(150), SubDeptName)
      .input("ManagerId", sql.NVarChar(50), ManagerId)
      .input("ManagerEmail", sql.NVarChar(100), ManagerEmail)
      .execute("sp_InsertDeptManagerMapping");
    res.status(201).json({ message: "Mapping created successfully." });
  } catch (err) {
    console.error("Error inserting Dept-Manager mapping:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
 
/** 4️⃣ Read all mappings */
app.get("/api/deptmanager", verifyToken, async (req, res) => {
  try {
    const pool = await poolPromiseATDB; // Corrected pool reference
    const result = await pool.request().execute("sp_GetDeptManagerMappings");
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching Dept-Manager mappings:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
 
/** 5️⃣ Update mapping */
app.put(
  "/api/deptmanager/:deptId/:subDeptId/:oldManagerId",
  verifyToken,
  async (req, res) => {
    const { deptId, subDeptId, oldManagerId } = req.params;
    const { ManagerId: newManagerId, ManagerEmail } = req.body;
 
    try {
      const pool = await poolPromiseATDB; // Ensure poolPromiseATDB is used
      await pool
        .request()
        .input("DeptId", sql.NVarChar(50), deptId)
        .input("SubDeptId", sql.NVarChar(50), subDeptId)
        .input("OldManagerId", sql.NVarChar(50), oldManagerId)
        .input("NewManagerId", sql.NVarChar(50), newManagerId)
        .input("ManagerEmail", sql.NVarChar(100), ManagerEmail)
        .execute("sp_UpdateDeptManagerMapping");
 
      res.status(200).json({ message: "Mapping updated successfully." });
    } catch (err) {
      console.error("Error updating Dept-Manager mapping:", err.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);
 
/** 6️⃣ Delete mapping */
app.delete(
  "/api/deptmanager/:deptId/:subDeptId/:managerId",
  verifyToken,
  async (req, res) => {
    const { deptId, subDeptId, managerId } = req.params;
 
    try {
      const pool = await poolPromiseATDB; // Corrected pool reference
      await pool
        .request()
        .input("DeptId", sql.NVarChar(50), deptId)
        .input("SubDeptId", sql.NVarChar(50), subDeptId)
        .input("ManagerId", sql.NVarChar(50), managerId)
        .execute("sp_DeleteDeptManagerMapping");
      res.json({ message: "Mapping deleted successfully." });
    } catch (err) {
      console.error("Error deleting Dept-Manager mapping:", err.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);
 
app.listen(PORT, () => {
  console.log(`Attendance Tracker Server is running on port: ${PORT}`);
});
 
 
