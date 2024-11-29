require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const os = require("os");
const path = require('path');

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
`${BASE_URL}/api/employees`,


app.use(bodyParser.json()); //comment
app.use(cors());


// app.use(express.static(path.join(__dirname, 'ReactUIApp/build')));
//Integration Start
// below is for suggestion api (using Stored Procedure)

app.post("/api/get-last-sync-date", async (req, res) => {
  // const swipejson = req.body;
  // const jsonString = JSON.stringify(swipejson);
  try {
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()      
      .execute("sp_GetLastSyncDateWithNetxs");
      console.log("ress",result.recordset.LastCloudSyncDate);
      res.json(result.recordset[0].LastCloudSyncDate);
  } catch (error) {
    console.error("Error getting integration last sync date to sp_GetLastSyncDateWithNetxs: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/integration-daily-swipe-data", async (req, res) => {
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
    console.error("Error uploading integration data to sp_IntegrateDailySwipeData: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/integration-employee-data", async (req, res) => {
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
    console.error("Error uploading integration data to sp_IntegrateEmplyeeData: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//Integration End

// below is for suggestion api (using Stored Procedure)
app.get("/api/employees", async (req, res) => {
  const name = req.query.name;

  try {
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()
      .input("param_EmpName", sql.NVarChar, `${name}`)
      .execute("sp_SearchEmployeesByName");

    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching employees sp_SearchEmployeesByName: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// below is sp api call this one is for handle search
app.get("/api/attendance/:empId/:date", async (req, res) => {
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
app.get("/api/dept", async(req, res)=>{
  const date= req.query.date;

  sql
  .connect(configATDB)
  .then(() => {
    const request = new sql.Request();

    request.input("param_Date", sql.VarChar, date);

    request
      .execute("sp_GetDeptwiseAttendance")
      .then((result) => {
        return res.json(result.recordset);
      })
      .catch((err) => {
        console.error(`Error executing sp_GetDeptwiseAttendance: ${err}`);
      });
  })
  .catch((err) => {
    console.error(err);
  });
  // return [];
});

// API for Daily Attendance History of Employeee (based on EmpID, Year, Month)
app.get("/api/attendance/:empId/:year/:month", async (req, res) => {
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

//  API for fetching user roles based on EmployeeEmail
app.get("/api/userroles", async (req, res) => {
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
app.get("/api/watchlist/:email/:date", async (req, res) => {
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
app.get("/api/watchlist/:email", async (req, res) => {
  const email = req.params.email;

  try {
    const pool = await poolPromiseATDB;
    const result = await pool
      .request()
      .input("param_LoggedInUserEmail", sql.NVarChar, email)
      .execute("[dbo].[sp_GetWatchList]");

    res.json(result.recordset);
  } catch (error) {
    console.error(
      "Error fetching watch list [dbo].[sp_GetWatchList]: ",
      error
    );
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// API for deleting a watchlist
app.delete("/api/watchlist/:email/:watchListId", async (req, res) => {
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
app.get("/api/watchlistdetails/:email/:id", async (req, res) => {
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
    console.error("Error fetching watch list by ID [dbo].[sp_GetWatchListByID]: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Define the PUT endpoint for updating watchlist data
app.put("/api/watchlist/:watchlistId", async (req, res) => {
 
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


  console.log("UPDATE/PUT WatchList" ,req.body)
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
      tvp.rows.add( emp.EmployeeID ,emp.EmployeeName, emp.EmployeeEmail);
    });

    // Execute the stored procedure to update the watchlist
    const result = await pool
      .request()
      .input("param_LoggedInUserEmail", sql.NVarChar(255), param_LoggedInUserEmail)
      .input("param_WatchListID", sql.BigInt, watchlistId)
      .input("param_WatchListName", sql.NVarChar(100), param_WatchListName)
      .input("param_WatchListDescription", sql.NVarChar(255), param_WatchListDescription)
      .input("param_WatchListPrimaryOwnerName", sql.NVarChar(255), param_WatchListPrimaryOwnerName)
      .input("param_WatchListPrimaryOwnerEmail", sql.NVarChar(255), param_WatchListPrimaryOwnerEmail)
      .input("param_tvp_WatchListEmployees", sql.TVP , tvp)
      .execute("[dbo].[sp_UpdateWatchList]");

    // Send a success response
    res.status(200).json({ message: "Watchlist updated successfully" });
  } catch (error) {
    // Handle errors
    console.error("Error updating watchlist: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.post("/api/watchlist/create", async (req, res) => {
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
    tvp.columns.add('EmployeeID', sql.Int);
    tvp.columns.add('EmployeeName', sql.NVarChar(255));
    tvp.columns.add('EmployeeEmail', sql.NVarChar(255));

    param_tvp_WatchListEmployees.forEach((emp , index )=> {
      tvp.rows.add ( emp.EmployeeID , emp.EmployeeName, emp.EmployeeEmail);   // index + 1, emp.EmpID 
    });

    await pool.request()
      .input("param_LoggedInUserEmail", sql.NVarChar(255), param_LoggedInUserEmail)
      .input("param_WatchListName", sql.NVarChar(255), param_WatchListName)
      .input("param_WatchListDescription", sql.NVarChar(255), param_WatchListDescription)
      .input("param_WatchListPrimaryOwnerName", sql.NVarChar(255), param_WatchListPrimaryOwnerName)
      .input("param_WatchListPrimaryOwnerEmail", sql.NVarChar(255), param_WatchListPrimaryOwnerEmail)
      .input("param_tvp_WatchListEmployees", sql.TVP , tvp)
      .execute("[dbo].[sp_CreateWatchList]");

    res.status(200).json({ message: "Watchlist created successfully" });
  } catch (error) {
    console.error("Error creating watchlist: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../ReactUIApp/build', 'index.html'));
// });
 

app.listen(PORT, () => {
  console.log(`Attendance Tracker Server is running on port: ${PORT}`);
});





