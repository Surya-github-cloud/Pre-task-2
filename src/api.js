const { Octokit } = require('@octokit/rest');
require('dotenv').config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN || undefined,
  userAgent: 'github-repo-analyzer/1.0.0'
});

async function getRepoData(owner, repo) {
  try {
    const repoInfo = await octokit.rest.repos.get({ owner, repo });
    
    // Total contributors count (not paginated list)
    const repoStats = await octokit.rest.repos.get({ owner, repo });
    
    // Contributors with contributions (page 1, count unique)
    const contributorsResp = await octokit.rest.repos.listContributors({ 
      owner, repo, 
      per_page: 100 
    });
    const contributors = (contributorsResp.data || []).filter(c => c && c.contributions > 0);
    
    // Separate Issues + PR counts using Search API
    const issuesSearch = await octokit.rest.search.issuesAndPullRequests({
      q: `repo:${owner}/${repo} type:issue state:open`
    });
    const prSearch = await octokit.rest.search.issuesAndPullRequests({
      q: `repo:${owner}/${repo} type:pr state:open`
    });
    const issuesCount = issuesSearch.data.total_count;
    const prCount = prSearch.data.total_count;
    
    const { data: commits } = await octokit.rest.repos.listCommits({ owner, repo, per_page: 1 });
    
    let license = null;
    try {
      license = await octokit.rest.licensing.getRepoLicense({ owner, repo });
    } catch {}
    
    let readme = '';
    try {
      const { data } = await octokit.rest.repos.getReadme({ owner, repo });
      const readmeRaw = Buffer.from(data.content, 'base64').toString();
      readme = readmeRaw; // Full complete README
    } catch {}
    
    const languagesResp = await octokit.rest.repos.listLanguages({ owner, repo });
    const languages = Object.keys(languagesResp.data);

    return {
      ...repoInfo.data,
      contributorsCount: contributors.length,
      openIssuesCount: issuesCount,
      openPRCount: prCount,
      openIssues: issuesCount + prCount,
      lastCommit: commits[0]?.commit.author.date || null,
      license: license?.data?.license?.name || null,
      readmeFull: readme,
      languages,
      fileCount: 0
    };
  } catch (error) {
    console.error(`Error fetching ${owner}/${repo}:`, error.message);
    return { error: error.message };
  }
}

module.exports = { getRepoData };
