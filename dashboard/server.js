const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

// Serve the index.html directly from this folder
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint to view the raw logs in the browser
app.get('/logs', (req, res) => {
  const logFilePath = path.join(__dirname, 'automation.log');
  if (fs.existsSync(logFilePath)) {
    const logs = fs.readFileSync(logFilePath, 'utf-8');
    res.send(`
      <html>
        <head><title>Automation Logs</title></head>
        <body style="background: #0F172A; color: #10B981; font-family: monospace; padding: 20px;">
          <h2>Playwright Automation Logs</h2>
          <pre style="white-space: pre-wrap; word-wrap: break-word;">${logs}</pre>
          <script>window.scrollTo(0, document.body.scrollHeight);</script>
        </body>
      </html>
    `);
  } else {
    res.send('<h3>No logs available yet. Run a test from the dashboard first!</h3>');
  }
});

// Endpoint to receive data and trigger playwright
app.post('/run-automation', (req, res) => {
  const candidateData = req.body;
  
  // Save the data to a json file
  const dataPath = path.join(__dirname, 'candidate-data.json');
  fs.writeFileSync(dataPath, JSON.stringify(candidateData, null, 2));

  // Trigger Playwright script
  console.log('Received automation request. Starting Playwright...');
  
  // We navigate out of dashboard to the root folder to run npx playwright
  const rootDir = path.resolve(__dirname, '..');
  
  const child = exec('npx playwright test tests/job-application.spec.js --headed', { cwd: rootDir });

  // Define log file path
  const logFilePath = path.join(__dirname, 'automation.log');
  
  // Append a header for the new run
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFilePath, `\n--- Automation Run Started: ${timestamp} ---\n`);

  child.stdout.on('data', (data) => {
    console.log(data.toString());
    fs.appendFileSync(logFilePath, data.toString());
  });
  
  child.stderr.on('data', (data) => {
    console.error(data.toString());
    fs.appendFileSync(logFilePath, data.toString());
  });
  
  child.on('close', (code) => {
    console.log(`Playwright test exited with code ${code}`);
    fs.appendFileSync(logFilePath, `\n--- Automation Run Finished with Code: ${code} ---\n`);
  });

  res.status(200).json({ success: true, message: 'Automation started' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Dashboard running on http://localhost:${PORT}`);
  console.log(`Fill out the form to trigger the Playwright test!`);
});
