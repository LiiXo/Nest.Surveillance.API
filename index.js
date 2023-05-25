const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const cors = require('cors');

const app = express();
app.use(cors());
const port = 3000;

const swaggerDocument = YAML.load('./swagger.yaml');

const nestApiUrl = 'https://api.home.nest.com';
const clientId = '881534249218-692gl89ctmhch1abv0sir56f7kg81fs2.apps.googleusercontent.com';
const clientSecret = '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';
const redirectUri = 'http://localhost:3000/auth/callback';

let permanentToken = '';

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

function checkAuth(req, res, next) {
  if (permanentToken) {
    next();
  } else {
    res.redirect('/auth');
  }
}

app.get('/auth', (req, res) => {
  const authorizeUrl = `${nestApiUrl}/oauth2/access`;
  
  const params = {
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    response_type: 'code',
    grant_type: 'authorization_code',
    state: 'RANDOM_STATE_VALUE',
    scope: 'camera:read'
  };
  
  const authUrl = `${authorizeUrl}?${querystring.stringify(params)}`;
  res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
  const tokenUrl = `${nestApiUrl}/oauth2/access_token`;
  
  const params = {
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code: req.query.code
  };
  
  try {
    const response = await axios.post(tokenUrl, querystring.stringify(params));
    permanentToken = response.data.access_token;
    
    res.send('Authentication successful! You can now use the permanent access token.');
  } catch (error) {
    console.error('Error obtaining the permanent access token:', error.message);
    res.status(500).send('An error occurred while obtaining the permanent access token.');
  }
});

app.get('/cameras', checkAuth, async (req, res) => {
  try {
    const response = await axios.get(`${apiUrl}devices/cameras`, {
      headers: {
        Authorization: `Bearer ${permanentToken}`
      }
    });

    if (response.status === 200) {
      const cameras = response.data;
      res.json(cameras);
    } else {
      res.status(500).json({ error: 'Error retrieving the list of cameras.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving the list of cameras.' });
  }
});

app.get('/camera/:cameraId/stream', checkAuth, async (req, res) => {
  try {
    const cameraResponse = await axios.get(`${nestApiUrl}/devices/cameras/${req.params.cameraId}`, {
      headers: {
        Authorization: `Bearer ${permanentToken}`
      }
    });
    
    res.redirect(cameraResponse.data.stream_url);
  } catch (error) {
    console.error('Error retrieving the camera video stream:', error.message);
    res.status(500).send('An error occurred while retrieving the camera video stream.');
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});