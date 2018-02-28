const mysql = require('mysql');
const config = require('../.credentials.json');

const mysqlConnection = mysql.createConnection({
  host: process.env.DATABASE_HOST || config.mysqlHost,
  user: process.env.DATABASE_USER || config.mysqlUser,
  password: process.env.DATABASE_PASS || config.mysqlPass,
});

mysqlConnection.connect((err) => {
  if (err) throw err;
  console.log('Connected to mysql database');

  setInterval(() => {
    mysqlConnection.query('SELECT 1');
  }, 5000);

  mysqlConnection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DATABASE_SCHEMA || config.mysqlSchema}`, (e, result) => {
    if (e) throw e;
    console.log(result);
  });

  mysqlConnection.query(`USE ${process.env.DATABASE_SCHEMA || config.mysqlSchema};`, (e, result) => {
    if (e) throw e;
    console.log(result);
  });

  mysqlConnection.query('CREATE TABLE IF NOT EXISTS reminders (name varchar(255) NOT NULL, description varchar(255), tag varchar(255), date varchar(255), PRIMARY KEY (name));', (e, result) => {
    if (e) throw e;
    console.log(result);
  });
});

const respondJSON = (request, response, status, object) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.write(JSON.stringify(object));
  response.end();
};

const respondJSONMeta = (request, response, status) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end();
};

const getReminders = async (request, response, parsedUrl) => {
  const splitUrl = parsedUrl.pathname.split('/')[1].split('&field=');
  console.dir(splitUrl);

  const params = {
    searchBy: splitUrl[0],
    field: splitUrl[1],
  };
  let responseJSON = {};
  const reminders = {};

  let myQuery = '';
  if (params.searchBy === 'getAllReminders') myQuery = 'SELECT * FROM reminders';
  else if (params.searchBy === 'getByTag') myQuery = `SELECT * FROM reminders WHERE tag = '${params.field}'`;
  else if (params.searchBy === 'getByName') myQuery = `SELECT * FROM reminders WHERE name = '${params.field}'`;


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

const checkReminders = async (request, response, searchObj) => {
  try {
    await mysqlConnection.query(`SELECT name FROM reminders WHERE name = '${searchObj}'`, (e, result) => {
      if (result[0]) {
        if (searchObj === result[0].name) {
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

const addReminder = async (request, response, body) => {
  try {
    const responseJSON = {
      message: 'Name, Description, Tag, and Date are all required.',
    };
    if (!body.name || !body.description || !body.tag || !body.date) {
      responseJSON.id = 'missingParams';
      return respondJSON(request, response, 400, responseJSON);
    }
    let responseCode = 201;
    await mysqlConnection.query(`SELECT name FROM reminders WHERE name = '${body.name}'`, (e, result) => {
      if (result[0]) {
        if (body.name === result[0].name) {
          console.log(`name updated:${result[0].name}`);
          responseCode = 204;
        }
      }
    });

    await mysqlConnection.query(`INSERT INTO reminders (name, description, tag, date) VALUES ('${body.name}', '${body.description}', '${body.tag}', '${body.date}') ON DUPLICATE KEY UPDATE description = '${body.description}', tag = '${body.tag}', date = '${body.date}';`, (e, result) => {
      if (e) throw e;
      console.log(result);

      if (responseCode === 201) {
        responseJSON.message = 'Reminder Created Successfully';
        return respondJSON(request, response, responseCode, responseJSON);
      }
      return respondJSONMeta(request, response, responseCode);
    });
  } catch (error) {
    console.dir(error);
  }
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
