const { getRepoData } = require('./api.js');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 }); // 1hr cache

async function analyzeRepos(repoUrls, options = {}) {
  const results = [];
  const exampleRepos = [
    'expressjs/express',
    'freeCodeCamp/freeCodeCamp',
    'angular/angular',
    'tensorflow/tensorflow',
  
  ];

  const reposToAnalyze = repoUrls.length ? repoUrls : exampleRepos;

  for (const url of reposToAnalyze) {
    const [owner, repo] = url.split('/').slice(-2);
    const cacheKey = `${owner}/${repo}`;
    let data = cache.get(cacheKey);

    if (!data) {
      data = await getRepoData(owner, repo);
      if (data && !data.error) cache.set(cacheKey, data);
    }

    if (!data || data.error) {
      results.push({ repo: url, error: data?.error || 'Failed to fetch' });
      continue;
    }

    const analysis = computeScores(data);
    results.push({ repo: url, data, ...analysis });
  }

  return results;
}

function computeScores(data) {
  const { stargazers_count: stars, forks_count: forks, languages, fileCount, contributorsCount = 0, openIssuesCount = 0, openPRCount = 0 } = data;
  const uniqueLangs = languages ? languages.length : 0;
  const commitsLastYearApprox = 0; // Placeholder

  // Activity Score (0-100)
  let activity = 0;
  activity += Math.min(forks / 100 * 10, 20);
  activity += Math.min(stars / 1000 * 30, 30);
  activity += Math.min(contributorsCount * 0.5, 10);
  activity += Math.min((openIssuesCount + openPRCount) / 10, 10);
  activity = Math.min(activity, 100);

  // Complexity (0-10)
  let complexity = 0;
  complexity += Math.min(fileCount / 1000, 4);
  complexity += uniqueLangs * 0.4;
  complexity += (openIssuesCount + openPRCount) / 100;
  complexity += contributorsCount / 50;
  complexity = Math.min(Math.max(complexity, 0), 10);

  // Difficulty Classification
  let difficulty;
  if (activity < 20 && complexity < 3) {
    difficulty = 'Beginner';
  } else if (complexity > 7 || activity > 80) {
    difficulty = 'Advanced';
  } else {
    difficulty = 'Intermediate';
  }

  return { activityScore: Math.round(activity), complexityScore: Math.round(complexity * 10) / 10, difficulty };
}

async function generateReport(results) {
  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalRepos: results.length,
      beginner: results.filter(r => r.difficulty === 'Beginner').length,
      intermediate: results.filter(r => r.difficulty === 'Intermediate').length,
      advanced: results.filter(r => r.difficulty === 'Advanced').length
    },
    details: results
  };
}

module.exports = { analyzeRepos, generateReport, computeScores };
