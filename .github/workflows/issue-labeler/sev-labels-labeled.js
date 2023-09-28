const { processIssueLabelChange } = require('./issuesProcessor');

module.exports = async ({ github, context }) => {
  const { payload: { action, label, issue } } = context;
  if (issue.state !== 'open') return;
  console.log(`
   action: ${action},
   label: ${label.name},
   issue: ${issue.number},
  `);

  await processIssueLabelChange({ github, context });
}

