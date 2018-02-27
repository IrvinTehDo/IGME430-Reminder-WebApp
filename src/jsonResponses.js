const mysql = require('mysql');
const config = require('../.credentials.json');

const mysqlConnection = mysql.createConnection({
  host: config.mysqlHost,
  user: config.mysqlUser,
  password: config.mysqlPass,
});

mysqlConnection.connect((err) => {
  if (err) throw err;
  console.log('Connected to mysql database');

  mysqlConnection.query(`CREATE DATABASE IF NOT EXISTS ${config.mysqlSchema}`, (e, result) => {
    if (e) throw e;
    console.log(result);
  });

  mysqlConnection.query(`USE ${config.mysqlSchema};`, (e, result) => {
    if (e) throw e;
    console.log(result);
  });

  mysqlConnection.query('CREATE TABLE IF NOT EXISTS reminders (ID int NOT NULL AUTO_INCREMENT, name varchar(255), description varchar(255), time varchar(255), date varchar(255), PRIMARY KEY (ID));', (e, result) => {
    if (e) throw e;
    console.log(result);
  });
});

const reminders = {};


const respondJSON = (request, response, status, object) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.write(JSON.stringify(object));
  response.end();
};

const respondJSONMeta = (request, response, status) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end();
};

const getReminders = (request, response, parsedUrl) => {
  const splitUrl = parsedUrl.pathname.split('/')[1].split('&field=');
  console.dir(splitUrl);

  const params = {
    searchBy: splitUrl[0],
    field: splitUrl[1],
  };
  let responseJSON = {};

  if (params.searchBy === 'getAllReminders') {
    responseJSON = {
      reminders,
    };
  } else {
    const keys = Object.keys(reminders);
    const tempReminders = {};

    if (params.searchBy === 'getByTag') {
      for (let i = 0; i < keys.length; i++) {
        console.dir(keys[i]); // gets the name of the object

        if (reminders[keys[i]].tag === params.field) {
          tempReminders[keys[i]] = {};
          tempReminders[keys[i]].name = reminders[keys[i]].name;
          tempReminders[keys[i]].description = reminders[keys[i]].description;
          tempReminders[keys[i]].tag = reminders[keys[i]].tag;
          tempReminders[keys[i]].date = reminders[keys[i]].date;
        }
      }

      responseJSON = {
        tempReminders,
      };
    } else if (params.searchBy === 'getByName') {
      for (let i = 0; i < keys.length; i++) {
        console.dir(keys[i]);

        if (reminders[keys[i]].name === params.field) {
          tempReminders[keys[i]] = {};
          tempReminders[keys[i]].name = reminders[keys[i]].name;
          tempReminders[keys[i]].description = reminders[keys[i]].description;
          tempReminders[keys[i]].date = reminders[keys[i]].date;
        }
      }

      responseJSON = {
        tempReminders,
      };
    }
  }

  console.dir(responseJSON);
  respondJSON(request, response, 200, responseJSON);
};

const checkReminders = (request, response, searchObj) => {
  if (reminders[searchObj].name === searchObj) {
    return respondJSONMeta(request, response, 200);
  }

  return respondJSONMeta(request, response, 404);
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

const addReminder = (request, response, body) => {
  const responseJSON = {
    message: 'Name, Description, Tag, and Date are all required.',
  };
  if (!body.name || !body.description || !body.tag || !body.date) {
    responseJSON.id = 'missingParams';
    return respondJSON(request, response, 400, responseJSON);
  }
  let responseCode = 201;

  if (reminders[body.name]) {
    responseCode = 204;
  } else {
    reminders[body.name] = {};
  }
  reminders[body.name].name = body.name;
  reminders[body.name].description = body.description;
  reminders[body.name].tag = body.tag;
  reminders[body.name].date = body.date;

  if (responseCode === 201) {
    responseJSON.message = 'Created Successfully';
    return respondJSON(request, response, responseCode, responseJSON);
  }
  return respondJSONMeta(request, response, responseCode);
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
