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

const getReminders = (request, response) => {
  const responseJSON = {
    reminders,
  };
  respondJSON(request, response, 200, responseJSON);
};

const checkReminders = (request, response, searchObj) => {
    
    if(reminders[searchObj].name === searchObj){
        return respondJSONMeta(request, response, 200);
    }
    
    respondJSONMeta(request, response, 404);
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
    message: 'Name, Description, and Tag are all required.',
  };
  if (!body.name || !body.description || !body.tag) {
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
