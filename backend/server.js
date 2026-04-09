const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Octokit } = require('@octokit/rest');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Load config from webui.conf
let config = {};
const configPath = path.join(__dirname, '../webui.conf');
if (fs.existsSync(configPath)) {
  const configContent = fs.readFileSync(configPath, 'utf8');
  configContent.split('\n').forEach(line => {
    if (line.includes('=')) {
      const [key, value] = line.split('=');
      config[key.trim()] = value.trim();
    }
  });
}

// GitHub setup
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Routes

// Get simulation statuses
app.get('/api/simulations', (req, res) => {
  res.json(simulationStatuses);
});

// Clear simulation statuses (optional endpoint)
app.delete('/api/simulations', (req, res) => {
  simulationStatuses = [];
  res.status(200).json({ message: 'Statuses cleared' });
});

// Post simulation status
app.post('/api/simulations', (req, res) => {
  const status = req.body;
  // Add timestamp if not present
  if (!status.timestamp) {
    status.timestamp = new Date().toISOString();
  }
  // Ensure ID is present (from config section)
  if (!status.id && status.simulationId) {
    status.id = status.simulationId;
  }
  simulationStatuses.push(status);
  console.log('Received simulation status:', status);
  res.status(201).json(status);
});

// Get Aruba statuses
app.get('/api/aruba', (req, res) => {
  res.json(arubaStatuses);
});

// Pull Aruba status (real API)
app.post('/api/aruba/pull', async (req, res) => {
  try {
    const baseUrl = config.ARUBA_BASE_URL || 'https://internal.api.central.arubanetworks.com';
    const clientId = config.ARUBA_CLIENT_ID;
    const clientSecret = config.ARUBA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'Aruba credentials not configured' });
    }

    // Get access token
    const tokenResponse = await axios.post(`${baseUrl}/oauth2/token`, {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = tokenResponse.data.access_token;

    // Fetch devices
    const devicesResponse = await axios.get(`${baseUrl}/central/v1/devices`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // Fetch alerts
    const alertsResponse = await axios.get(`${baseUrl}/central/v1/alerts`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // Process data
    const hardware = devicesResponse.data.devices?.map(d => ({
      device: d.name || d.serial,
      status: d.status || 'unknown',
      location: d.site || 'N/A'
    })) || [];

    const alerts = alertsResponse.data.alerts?.map(a => ({
      id: a.id,
      message: a.description || a.title,
      severity: a.severity,
      timestamp: a.timestamp
    })) || [];

    arubaStatuses = { hardware, alerts };
    res.json(arubaStatuses);
  } catch (error) {
    console.error('Aruba API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch Aruba data' });
  }
});

// Get config file from GitHub
app.get('/api/config/:branch', async (req, res) => {
  const { branch } = req.params;
  try {
    const response = await octokit.repos.getContent({
      owner: 'solutions-hpe',
      repo: 'client-sim',
      path: 'configs/simulation.conf',
      ref: branch
    });
    const content = Buffer.from(response.data.content, 'base64').toString();
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update config
app.post('/api/config/update', (req, res) => {
  const { key, value } = req.body;
  if (key && value !== undefined) {
    config[key] = value;
    // Update webui.conf
    let configLines = [];
    for (const [k, v] of Object.entries(config)) {
      configLines.push(`${k}=${v}`);
    }
    fs.writeFileSync(configPath, configLines.join('\n'));
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid key or value' });
  }
});

// Catch all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});