const mysql = require('mysql');
const config = require('../.credentials.json');

// Establish connection to our mysql database
const mysqlConnection = mysql.createConnection({
  host: process.env.DATABASE_HOST || config.mysqlHost,
  user: process.env.DATABASE_USER || config.mysqlUser,
  password: process.env.DATABASE_PASS || config.mysqlPass,
});

// Setup our database if it somehow gets wiped,
// and make sure we're in the right database and ready to use it.
mysqlConnection.connect((err) => {
  if (err) throw err;
  console.log('Connected to mysql database');

  // Make sure connection isn't timed out by just polling it every 5 secs.
  // Thanks to: https://stackoverflow.com/questions/20210522/nodejs-mysql-error-connection-lost-the-server-closed-the-connection
  setInterval(() => {
    mysqlConnection.query('SELECT 1');
  }, 5000);

  mysqlConnection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DATABASE_SCHEMA || config.mysqlSchema}`, (e) => {
    if (e) throw e;
  });

  mysqlConnection.query(`USE ${process.env.DATABASE_SCHEMA || config.mysqlSchema};`, (e) => {
    if (e) throw e;
  });

  mysqlConnection.query('CREATE TABLE IF NOT EXISTS reminders (name varchar(255) NOT NULL, description varchar(255), tag varchar(255), date varchar(255), PRIMARY KEY (name));', (e) => {
    if (e) throw e;
  });
});

// JSON to send back to client
const respondJSON = (request, response, status, object) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.write(JSON.stringify(object));
  response.end();
};

// To send back to client, there's no object, only status codes.
const respondJSONMeta = (request, response, status) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end();
};

// Grabs reminders as requested and specified by the client and their parameters.
const getReminders = async (request, response, parsedUrl) => {
  // Split the field and search type and spit them out into an object to use.
  const splitUrl = parsedUrl.pathname.split('/')[1].split('&field=');

  const params = {
    searchBy: splitUrl[0],
    field: splitUrl[1],
  };
  let responseJSON = {};
  const reminders = {};

  // URLs sends spaces as a %20, we need to convert them back into spaces
  const convParams = params.field.replace(/%20/g, ' ');

  // Send a mysql query based on what was requested.
  let myQuery = '';
  if (params.searchBy === 'getAllReminders') myQuery = 'SELECT * FROM reminders';
  else if (params.searchBy === 'getByTag') myQuery = `SELECT * FROM reminders WHERE tag = "${convParams}"`;
  else if (params.searchBy === 'getByName') myQuery = `SELECT * FROM reminders WHERE name = "${convParams}"`;

  // Async request that must be fulfilled before sending back.
  // Based on parameters and what was requested by user.
  try {
    await mysqlConnection.query(myQuery, (e, result) => {
      if (e) throw e;
      for (let i = 0; i < result.length; i++) {
        reminders[result[i].name] = {};
        reminders[result[i].name].name = result[i].name;
        reminders[result[i].name].description = result[i].description;
        reminders[result[i].name].tag = result[i].tag;
        reminders[result[i].name].date = result[i].date;
      }
      responseJSON = {
        reminders,
      };
      respondJSON(request, response, 200, responseJSON);
    });
  } catch (error) {
    console.dir(error);
  }
};

// Checks if a reminder exists. Dont need to send anything back.
const checkReminders = async (request, response, searchObj) => {
  try {
    // URLs sends spaces as a %20, we need to convert them back into spaces
    const convSearchObj = searchObj.replace(/%20/g, ' ');
    await mysqlConnection.query(`SELECT name FROM reminders WHERE name = '${convSearchObj}'`, (e, result) => {
      if (result[0]) {
        if (convSearchObj === result[0].name) {
          return respondJSONMeta(request, response, 230);
        }
      }
      return respondJSONMeta(request, response, 404);
    });
  } catch (error) {
    console.dir(error);
  }
};

const getRemindersMeta = (request, response) => respondJSONMeta(request, response, 200);

const notFoundMeta = (request, response) => respondJSONMeta(request, response, 404);

const notFound = (request, response) => {
  const responseJSON = {
    id: 'notFound',
    message: 'The page you are looking for was not found',
  };

  return respondJSON(request, response, 404, responseJSON);
};

// Adds the reminder and its fields into our database for storage.
const addReminder = async (request, response, body) => {
  try {
    // Default case of response JSON.
    const responseJSON = {
      message: 'Name, Description, Tag, and Date are all required.',
    };
      // Sends missing params 400 error if either field is missing.
    if (!body.name || !body.description || !body.tag || !body.date) {
      responseJSON.id = 'missingParams';
      return respondJSON(request, response, 400, responseJSON);
    }

    // If we made it this far, there is something to send back to the client.
    let responseCode = 201;
    // Check if the name already exists, if so we're updating the reminder and using code 204.
    await mysqlConnection.query(`SELECT name FROM reminders WHERE name = '${body.name}'`, (e, result) => {
      if (result[0]) {
        if (body.name === result[0].name) {
          responseCode = 204;
        }
      }
    });

    // Add the paramters into the database.
    // If it already exists, we update the existing table column instead.
    await mysqlConnection.query(`INSERT INTO reminders (name, description, tag, date) VALUES ('${body.name}', '${body.description}', '${body.tag}', '${body.date}') ON DUPLICATE KEY UPDATE description = '${body.description}', tag = '${body.tag}', date = '${body.date}';`, (e) => {
      if (e) throw e;

      if (responseCode === 201) {
        responseJSON.message = 'Reminder Created Successfully';
        return respondJSON(request, response, responseCode, responseJSON);
      }
      return respondJSONMeta(request, response, responseCode);
    });
  } catch (error) {
    console.dir(error);
  }
  // Should never reach this point.
  return null;
};

// public exports
module.exports = {
  getReminders,
  addReminder,
  checkReminders,
  notFound,
  getRemindersMeta,
  notFoundMeta,
};
