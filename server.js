require("dotenv").config();

const { getToken, verifyToken } = require('./middleware/authController');

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
`${BASE_URL}/api/employees`, app.use(bodyParser.json({ limit: '100mb' })); //comment
app.use(cors());



// the below is the controller for token generation and verification
app.post('/api/get-token', getToken);


//app.use(bodyParser.json({ limit: '100mb' }));

// app.use(express.static(path.join(__dirname, 'ReactUIApp/build')));
//Integration Start
// below is for suggestion api (using Stored Procedure)



app.post("/api/get-last-sync-date", verifyToken, async (req, res) => {
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


//Integration End

// below is for suggestion api (using Stored Procedure)
app.get("/api/employees", verifyToken, async (req, res) => {
  const name = req.query.name;
  // const email = req.query.email;

  try {
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()
      .input("param_EmpName", sql.NVarChar, `${name}`)
      // .input("param_EmpEmail", sql.NVarChar, `${email}`)
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
 

// // API for Daily Attendance History of Employeee (based on EmpID, Year, Month)
app.get("/api/attendance/:empId/:year/:month", verifyToken, async (req, res) => {
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
});

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
    } catch (error) {
      console.error(
        "Error fetching employee attendance [dbo].[sp_GetEmployeeAttendance]: ",
        error
      );
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// API for Daily deptwise  Attendance History of Employeee (based on EmpID, Year, Month)
app.get(
  "/api/get-employee-attendance/:operationId/:date/:deptId/",
  verifyToken, async (req, res) => {
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
  const { operationId, deptId, empid, date,  year, month } = req.query;
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
app.delete("/api/watchlist/:email/:watchListId", verifyToken, async (req, res) => {
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
});

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
    tvp.columns.add("EmployeeID", sql.Int);
    tvp.columns.add("EmployeeName", sql.NVarChar(255));
    tvp.columns.add("EmployeeEmail", sql.NVarChar(255));

    // Add employee data to the TVP
    param_tvp_WatchListEmployees.forEach((emp) => {
      tvp.rows.add(emp.EmployeeID, emp.EmployeeName, emp.EmployeeEmail);
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
    tvp.columns.add("EmployeeID", sql.Int);
    tvp.columns.add("EmployeeName", sql.NVarChar(255));
    tvp.columns.add("EmployeeEmail", sql.NVarChar(255));

    param_tvp_WatchListEmployees.forEach((emp, index) => {
      tvp.rows.add(emp.EmployeeID, emp.EmployeeName, emp.EmployeeEmail); // index + 1, emp.EmpID
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
app.get('/api/deptsubdeptmapping', async (req, res) => {
  try {
    const pool = await poolPromiseATDB;
    const result = await pool.request()
      .execute('sp_GetDeptSubDeptMapping');

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching dept‑subdept mapping:', err);
    res.status(500).json({ error: 'Internal Server Error' });
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

app.get('/api/employeereport', async (req, res) => {
  const { deptid, subdeptid } = req.query;
  try {
    const pool = await poolPromiseATDB;
    const request = pool.request();

    if (deptid && !isNaN(parseInt(deptid))) {
      request.input('deptid', sql.Int, parseInt(deptid));
    }
    if (subdeptid) {
      request.input('subdeptid', sql.VarChar(50), subdeptid);
    }

    const result = await request.execute('usp_GetAllEmployeeStatus');
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching employee list:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3) POST update employee report
app.post('/api/employeereport/:empid/report', async (req, res) => {
  const { empid } = req.params;
  const { report } = req.body;
  if (!report) return res.status(400).json({ error: 'Report content is required' });

  try {
    const pool = await poolPromiseATDB;
    const result = await pool.request()
      .input('Empid',   sql.NVarChar(15), empid)
      .input('Report',  sql.NVarChar(sql.MAX), report)
      .execute('sp_UpdateEmployeeReport');

    // return updated row
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset[0]);
    } else {
      res.status(404).json({ error: 'Employee not found' });
    }
  } catch (err) {
    console.error('Error updating employee report:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../ReactUIApp/build', 'index.html'));
// });


/** 1️⃣ Get Dept/Sub‑Dept list */
app.get('/api/deptsubdept',verifyToken ,async (req, res) => {
  try {
    const pool = await poolPromiseATDB; // Corrected pool reference
    const result = await pool.request().execute('sp_GetDeptSubDeptMapping');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching Dept/Sub-Dept list:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/** 2️⃣ Search employees by name */
app.get('/api/employeedpt',verifyToken, async (req, res) => {
  const search = req.query.search || '';
  try {
    const pool = await poolPromiseATDB; // Corrected pool reference
    const result = await pool
      .request()
      .input('SearchTerm', sql.NVarChar(100), search)
      .execute('sp_SearchEmployees');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error searching employees:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/** 3️⃣ Insert new Dept‑Manager mapping */
app.post('/api/deptmanager', verifyToken,async (req, res) => {
  const {
    DeptId,
    DeptName,
    SubDeptId,
    SubDeptName,
    ManagerId,
    ManagerEmail,
  } = req.body;

  if (!DeptId || !DeptName || !SubDeptId || !ManagerId || !ManagerEmail) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const pool = await poolPromiseATDB; // Corrected pool reference
    await pool
      .request()
      .input('DeptId', sql.NVarChar(50), DeptId)
      .input('DeptName', sql.NVarChar(50), DeptName)
      .input('SubDeptId', sql.NVarChar(50), SubDeptId)
      .input('SubDeptName', sql.NVarChar(150), SubDeptName)
      .input('ManagerId', sql.NVarChar(50), ManagerId)
      .input('ManagerEmail', sql.NVarChar(100), ManagerEmail)
      .execute('sp_InsertDeptManagerMapping');
    res.status(201).json({ message: 'Mapping created successfully.' });
  } catch (err) {
    console.error('Error inserting Dept-Manager mapping:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/** 4️⃣ Read all mappings */
app.get('/api/deptmanager', verifyToken,async (req, res) => {
  try {
    const pool = await poolPromiseATDB; // Corrected pool reference
    const result = await pool.request().execute('sp_GetDeptManagerMappings');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching Dept-Manager mappings:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/** 5️⃣ Update mapping */
app.put('/api/deptmanager/:deptId/:subDeptId', verifyToken,async (req, res) => {
  const { deptId, subDeptId } = req.params;
  const { ManagerId, ManagerEmail } = req.body;

  if (!ManagerId || !ManagerEmail) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const pool = await poolPromiseATDB; // Corrected pool reference
    await pool
      .request()
      .input('DeptId', sql.NVarChar(50), deptId)
      .input('SubDeptId', sql.NVarChar(50), subDeptId)
      .input('ManagerId', sql.NVarChar(50), ManagerId)
      .input('ManagerEmail', sql.NVarChar(100), ManagerEmail)
      .execute('sp_UpdateDeptManagerMapping');
    res.json({ message: 'Mapping updated successfully.' });
  } catch (err) {
    console.error('Error updating Dept-Manager mapping:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/** 6️⃣ Delete mapping */
app.delete('/api/deptmanager/:deptId/:subDeptId', verifyToken,async (req, res) => {
  const { deptId, subDeptId } = req.params;

  try {
    const pool = await poolPromiseATDB; // Corrected pool reference
    await pool
      .request()
      .input('DeptId', sql.NVarChar(50), deptId)
      .input('SubDeptId', sql.NVarChar(50), subDeptId)
      .execute('sp_DeleteDeptManagerMapping');
    res.json({ message: 'Mapping deleted successfully.' });
  } catch (err) {
    console.error('Error deleting Dept-Manager mapping:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.listen(PORT, () => {
  console.log(`Attendance Tracker Server is running on port: ${PORT}`);
});
