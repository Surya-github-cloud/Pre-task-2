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
    'facebook/react'
  ];

  if (!repoUrls.length) {
    // Always mock for examples (demo fast, no API)
    console.log('Using mock data for examples');
    const mockData = [
      {
        repo: 'expressjs/express',
        data: { stargazers_count: 65000, forks_count: 11000, languages: ['JavaScript'], fileCount: 200, recentCommits: 100, hasPackageJson: true },
        activityScore: 95, complexityScore: 8.5, difficulty: 'Advanced'
      },
      {
        repo: 'freeCodeCamp/freeCodeCamp',
        data: { stargazers_count: 380000, forks_count: 32000, languages: ['JavaScript'], fileCount: 5000, recentCommits: 500, hasPackageJson: true },
        activityScore: 100, complexityScore: 6.2, difficulty: 'Intermediate'
      },
      {
        repo: 'angular/angular',
        data: { stargazers_count: 95000, forks_count: 24000, languages: ['TypeScript'], fileCount: 3000, recentCommits: 200, hasPackageJson: true },
        activityScore: 85, complexityScore: 9.0, difficulty: 'Advanced'
      },
      {
        repo: 'tensorflow/tensorflow',
        data: { stargazers_count: 180000, forks_count: 85000, languages: ['Python'], fileCount: 10000, recentCommits: 300, hasPackageJson: false },
        activityScore: 90, complexityScore: 9.8, difficulty: 'Advanced'
      },
      {
        repo: 'facebook/react',
        data: { stargazers_count: 230000, forks_count: 48000, languages: ['JavaScript'], fileCount: 1500, recentCommits: 400, hasPackageJson: true },
        activityScore: 98, complexityScore: 7.5, difficulty: 'Advanced'
      }
    ];
    return mockData;
  }

  const reposToAnalyze = repoUrls.map(url => {
    let cleanUrl = url.replace(/^https?:\/\/github\.com\//i, '').replace(/\/+$/, '').trim();
    const parts = cleanUrl.split('/');
    if (parts.length === 1) {
      cleanUrl = 'c2siorg/' + cleanUrl;
    } else if (parts.length > 2) {
      cleanUrl = parts[0] + '/' + parts[1];
    } else if (parts.length === 2 && parts[0] === 'https:' || parts[0] === 'www') {
      cleanUrl = parts.slice(-2).join('/');
    }
    return cleanUrl;
  }).filter(url => url.includes('/') && url.split('/').length === 2);

  for (const url of reposToAnalyze) {
    const parts = url.split('/');
    const owner = parts[0];
    const repo = parts[1];
    if (!owner || !repo) continue;
    const cacheKey = `${owner}/${repo}`;
    let data = cache.get(cacheKey);

    if (!data) {
      data = await getRepoData(owner, repo);
      if (data && !data.error) cache.set(cacheKey, data);
    }

    if (data.error) {
      results.push({ repo: url, error: data.error });
      continue;
    }

    const analysis = computeScores(data);
    results.push({ repo: url, data, ...analysis });
  }

  return results;
}

function computeScores(data) {
  const { stargazers_count: stars, forks_count: forks, languages, fileCount, recentCommits, contributorsCount = 0, openIssues = 0, license } = data;
  const uniqueLangs = languages.length;
  const commitsLastYearApprox = recentCommits || 0;

  // Activity Score (0-100)
  let activity = 0;
  activity += Math.min(commitsLastYearApprox / 365 * 10, 30);
  activity += Math.min(forks / 100 * 10, 20);
  activity += Math.min(stars / 1000 * 30, 30);
  activity += Math.min(contributorsCount * 0.5, 10);
  activity += Math.min(openIssues / 10, 10);
  activity = Math.min(activity, 100);

  // Complexity (0-10)
  let complexity = 0;
  complexity += Math.min(fileCount / 1000, 4);
  complexity += uniqueLangs * 0.4;
  complexity += openIssues / 100;
  complexity += contributorsCount / 50;
  if (license === 'MIT' || license === 'Apache-2.0') complexity -= 0.5;
  complexity = Math.min(Math.max(complexity, 0), 10);

  // Difficulty Classification
  let difficulty;
  if (activity < 20 && complexity < 3) {
    difficulty = 'Beginner';
  } else if (complexity > 7 || activity > 80 || contributorsCount > 100) {
    difficulty = 'Advanced';
  } else {
    difficulty = 'Intermediate';
  }

  return { activityScore: Math.round(activity), complexityScore: Math.round(complexity * 10) / 10, difficulty };
}

async function generateReport(results) {
  const errorCount = results.filter(r => r.error).length;
  const analyzedCount = results.length - errorCount;
  const beginner = results.filter(r => r.difficulty === 'Beginner').length;
  const intermediate = results.filter(r => r.difficulty === 'Intermediate').length;
  const advanced = results.filter(r => r.difficulty === 'Advanced').length;

  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalRepos: results.length,
      analyzed: analyzedCount,
      errors: errorCount,
      beginner,
      intermediate,
      advanced
    },
    details: results
  };
}

module.exports = { analyzeRepos, generateReport, computeScores };

