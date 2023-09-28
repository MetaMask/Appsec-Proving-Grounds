const { processIssue } = require('./issuesProcessor');
const { SEV_LABELS } = require('./labels-config');

module.exports = async ({ github, context }) => {
  const { data: issues } = await github.rest.issues.listForRepo({
    owner: context.repo.owner,
    repo: context.repo.repo,
    state: 'open',
  });
  issues.forEach(async (issue) => {
    if (issue.state !== 'open') return;
    if (issue.labels.find(label => label.name === 'Released')) return;
    const sevLabels = issue.labels.filter((label) => label.name.startsWith(SEV_LABELS.format));
    if (sevLabels.length === 0) return;
    await processIssue({ issue, github, context });
  });

};