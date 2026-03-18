const { Octokit } = require('@octokit/rest');
require('dotenv').config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN || undefined,
  userAgent: 'github-repo-analyzer/1.0.0'
});

async function getRepoData(owner, repo) {
  try {
    const repoInfo = await octokit.rest.repos.get({ owner, repo });
    const contributors = await octokit.rest.repos.listContributors({ owner, repo });
    const { data: issues } = await octokit.rest.issues.listForRepo({ owner, repo, state: 'open' });
    const { data: commits } = await octokit.rest.repos.listCommits({ owner, repo, per_page: 1 });
    let license = null;
    try {
      license = await octokit.rest.licensing.getRepoLicense({ owner, repo });
    } catch {}
    let readme = '';
    try {
      const { data } = await octokit.rest.repos.getReadme({ owner, repo });
      readme = Buffer.from(data.content, 'base64').toString().slice(0, 500) + '...';
    } catch {}
    const languagesResp = await octokit.rest.repos.listLanguages({ owner, repo });
    const languages = Object.keys(languagesResp.data);

    return {
      ...repoInfo.data,
      contributorsCount: contributors.data.length,
      openIssues: issues.length,
      lastCommit: commits[0]?.commit.author.date || null,
      license: license?.data?.license?.name || null,
      readmeSummary: readme,
      languages,
      fileCount: 0 // TODO: estimate or tree API
    };
  } catch (error) {
    console.error(`Error fetching ${owner}/${repo}:`, error.message);
    return { error: error.message };
  }
}

async function checkFileExists(owner, repo, path) {
  try {
    await octokit.rest.repos.getContent({ owner, repo, path });
    return true;
  } catch {
    return false;
  }
}

module.exports = { getRepoData };

