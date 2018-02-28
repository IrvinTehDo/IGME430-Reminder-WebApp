const http = require('http');
const url = require('url');
const query = require('querystring');

const htmlHandler = require('./htmlResponses.js');
const jsonHandler = require('./jsonResponses.js');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// handle POST
const handlePost = (request, response, parsedUrl) => {
  if (parsedUrl.pathname === '/submitReminder') {
    const res = response;

    const body = [];

    request.on('error', (err) => {
      console.dir(err);
      res.statusCode = 400;
      res.end();
    });

    request.on('data', (chunk) => {
      body.push(chunk);
    });

    request.on('end', () => {
      const bodyString = Buffer.concat(body).toString();
      const bodyParams = query.parse(bodyString);

      jsonHandler.addReminder(request, res, bodyParams);
    });
  }
};

// Handles Get requests
const handleGet = async (request, response, parsedUrl) => {
  if (parsedUrl.pathname === '/style.css') {
    htmlHandler.getCSS(request, response);
  } else if (parsedUrl.pathname.includes('/getAllReminders&') || parsedUrl.pathname.includes('/getByTag&') || (parsedUrl.pathname.includes('/getByName&'))) {
    await jsonHandler.getReminders(request, response, parsedUrl);
  } else if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/client.html' || parsedUrl.pathname === '') {
    htmlHandler.getIndex(request, response);
  } else {
    jsonHandler.notFound(request, response);
  }
};

// Handles Head requests
const handleHead = (request, response, parsedUrl) => {
  const searchObj = parsedUrl.pathname.split('/')[1];

  jsonHandler.checkReminders(request, response, searchObj);
};

// First place data goes when it's sent from client and recieved by server
const onRequest = (request, response) => {
  const parsedUrl = url.parse(request.url);

  if (request.method === 'POST') {
    handlePost(request, response, parsedUrl);
  } else if (request.method === 'GET') {
    handleGet(request, response, parsedUrl);
  } else {
    handleHead(request, response, parsedUrl);
  }
};

http.createServer(onRequest).listen(port);

console.log(`Listening on 127.0.0.1: ${port}`);
