
async function getIssueComments(issue, github) {
  const { repo, owner } = ownerAndNameFromRepoUrl(issue.repository_url);
  const comments = [];
  for await (const response of github.paginate.iterator(
    github.rest.issues.listComments,
    {
      owner,
      repo,
      issue_number: issue.number,
    }
  )) {
    comments.push(...response.data);
  }
  return comments;
}

function ownerAndNameFromRepoUrl(repoUrl) {
  const [owner, repo] = repoUrl.split('/').slice(-2);
  return { owner, repo };
}

module.exports = {
  getIssueComments,
  ownerAndNameFromRepoUrl,
};