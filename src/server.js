const express = require('express');
const cors = require('cors');
const path = require('path');
const { analyzeRepos, generateReport } = require('./analyzer.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.post('/analyze', async (req, res) => {
  console.log('Analyze POST:', req.body);
  try {
    const { repos } = req.body;
    if (!repos || !Array.isArray(repos) || repos.length === 0) {
      return res.status(400).json({ error: 'Provide repos array' });
    }
    const results = await analyzeRepos(repos);
    const report = await generateReport(results);
    console.log('Analyze report summary:', JSON.stringify(report.summary));
    res.json(report);
  } catch (error) {
    console.error('Analyze error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/examples', async (req, res) => {
  console.log('Examples requested');
  try {
    const results = await analyzeRepos([]);
    const report = await generateReport(results);
    console.log('Examples report summary:', JSON.stringify(report.summary));
    res.json(report);
  } catch (error) {
    console.error('Examples error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Set GITHUB_TOKEN in .env for auth (optional for public repos)');
});

module.exports = app;

