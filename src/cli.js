#!/usr/bin/env node
const { analyzeRepos, generateReport } = require('./analyzer.js');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter GitHub repo URLs (comma-separated) or press Enter for mock examples: ', (input) => {
  const urls = input.trim().split(',').map(u => u.trim()).filter(Boolean);
  analyzeRepos(urls).then(results => {
    const report = generateReport(results);
    console.log(JSON.stringify(report, null, 2));
    rl.close();
  });
});

