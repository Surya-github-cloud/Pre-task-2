# GitHub Repository Intelligence Analyzer

## Requirements Fulfilled
- **Input Handling**: Comma-separated URLs in web/CLI
- **GitHub API**: Stars, forks, contributors, languages, commits, issues
- **Activity Score**: `(commits/365*10) + (forks/100*10) + (stars/1000*30) + (contributors*0.5) + (issues/10)`
- **Complexity**: `files/1000 + langs*0.4 + issues/100 + contributors/50`
- **Difficulty**: Beginner (activity<20, complexity<3), Advanced (complexity>7 OR activity>80), else Intermediate
- **Structured Report**: JSON/table with summary/details
- **Edge Cases**: Defaults 0, error handling
- **Efficiency**: 1hr cache, optional GITHUB_TOKEN (5000/hr vs 60/hr unauth)
- **Docs**: This file
- **Examples**: 5 repos button/CLI

## Run
```
npm install
npm start  # web: localhost:3000
npm run analyze  # CLI
```

## Limitations
- File count: approx (tree API)
- Contributors: page 1 (100 max)
- No private repos (public only)

**Deploy**: `vercel --prod`


## Overview
Tool that analyzes GitHub repositories for **activity**, **complexity**, and **learning difficulty**. Supports CLI and web UI. Deployed on Vercel.

**Live Demo**: [Update after deploy]

## Features
- GitHub API integration (REST + GraphQL)
- Custom scores: Activity (0-100), Complexity (0-10)
- Difficulty: Beginner/Intermediate/Advanced
- Caching (1hr), rate limit handling
- Edge cases: Missing data → defaults/warns

## Scoring Formulas
**Activity Score** (0-100):
```
activity = min(commits/365*10, 30) + min(forks/100*10, 20) + min(stars/1000*30, 30)
```

**Complexity Score** (0-10):
```
complexity = min(files/1000, 4) + langs*0.4 + (package.json ? 1.5 : 0)
```

**Difficulty**:
- Beginner: activity <20 && complexity <3
- Advanced: complexity >7 || activity >80
- Intermediate: else

## Quick Start
1. Clone/fork this repo
2. `cp .env.example .env` & add `GITHUB_TOKEN` (optional, for >60 req/hr)
3. **CLI**: `npm run analyze`
4. **Web Dev**: `npm run dev` → http://localhost:3000
5. **Production**: `npm run start`

## Example Output (5 repos)
```
{
  "summary": { "totalRepos": 5, "beginner": 0, "intermediate": 2, "advanced": 3 },
  "details": [...]
}
```

## Deployment (Vercel)
```
npm i -g vercel
vercel --prod
```
Set env: `GITHUB_TOKEN`

## Limitations
- Approx commits (recent total)
- Public repos only
- Cache TTL: 1hr

## Run Instructions
- CLI: Enter URLs or Enter for examples
- Web: Input field or Examples button

Built for WebiU integration potential.

