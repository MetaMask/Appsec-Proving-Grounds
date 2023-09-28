const { SEV_LABELS, REPOS, getLabelByRemainingDays } = require('./labels-config');
const { getIssueComments, ownerAndNameFromRepoUrl } = require('./utils');

const RESOLUTION_COMMENT = `Resolution Date:`;


/**
 * 
 * @param {*} sevLabel severity label e.g. SEV-0
 * @param {*} issue object from github
 * @returns resolution date as a string
 */
function calculateResolutionDate(sevLabel, issue) {
  const sevConfig = SEV_LABELS[sevLabel.name];
  const triagedDateLabel = issue.labels.find(label => {
    const name = label.name.toLowerCase();
    return name.startsWith('triaged date:');
  });
  const triagedDate = triagedDateLabel ? triagedDateLabel.name.split(':')[1] : null;
  const issueDate = new Date(triagedDate || issue.created_at);
  issueDate.setDate(issueDate.getDate() + sevConfig.resolutionDays);
  return issueDate;
}


/**
 * Calculates the resolution date label on the issue
 * @param {*} issue object from github
 * @param {*} sevLabel severity label
 * @param {*} github github object
 * @returns object with resolution date and existing comment url
 */
async function getResolutionDate(issue, sevLabel, github) {
  const comments = await getIssueComments(issue, github);

  // find existing resolution date comment
  const resolutionDateComment = comments.filter(comment => {
    return comment.body.startsWith(RESOLUTION_COMMENT);
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

  if (resolutionDateComment) {
    return {
      resolutionDate: resolutionDateComment.body.split(': ')[1],
      existingComment: resolutionDateComment.html_url,
    };
  }

  // or generate one if it doesn't exist
  const resolutionDate = calculateResolutionDate(sevLabel, issue);
  return { resolutionDate: resolutionDate.toISOString().split('T')[0], existingComment: false };
}

/**
 * adds resolution date comment to the issue
 * @param {*} resolutionDate resolution date string
 * @param {*} issue  issue object from github
 * @param {*} sevLabel severity label
 * @param {*} github github object
 * @returns url of the comment
 */
async function addResolutionDateComment(resolutionDate, issue, sevLabel, github) {
  const { repo, owner } = ownerAndNameFromRepoUrl(issue.repository_url);
  const commentBody = `${RESOLUTION_COMMENT} ${resolutionDate}`;
  const res = await github.rest.issues.createComment({
    owner,
    repo,
    issue_number: issue.number,
    body: commentBody,
  });

  return res.html_url;
}

/**
 * 
 * @param {*} issue object from github
 * @param {*} github object
 */
async function retireResolutionDateComments(issue, github) {
  const { repo, owner } = ownerAndNameFromRepoUrl(issue.repository_url);
  const comments = await getIssueComments(issue, github);
  const resolutionDateComment = comments.filter(comment => {
    return comment.body.startsWith(RESOLUTION_COMMENT);
  });

  await Promise.all(resolutionDateComment.map(comment => {
    return github.rest.issues.updateComment({
      owner,
      repo,
      comment_id: comment.id,
      body: `~~${comment.body}~~`,
    });
  }));
}

/**
 * adds weeks remaining label to the issue
 * @param {*} resolutionDateStr resolution date string
 * @param {*} issue  issue object from github
 * @param {*} github github object
*/
async function addFixTimelineLabel(resolutionDateStr, issue, github, issueDone = false) {
  const LABEL_PREFIX = 'Fix timeline:';
  const today = new Date();
  const resolutionDate = new Date(resolutionDateStr);
  const days = Math.floor((resolutionDate - today) / (1000 * 60 * 60 * 24));
  const { repo, owner } = ownerAndNameFromRepoUrl(issue.repository_url);

  const newLabelConfig = getLabelByRemainingDays(days);
  const newLabel = `${LABEL_PREFIX} ${issueDone ? 'Done' : newLabelConfig.timelineText}`;

  const oldWeeksLabels = issue.labels.filter((label) => label.name.startsWith(LABEL_PREFIX));

  let alreadyHasCorrectLabel = false;
  await Promise.all(oldWeeksLabels.map(async (oldWeeksLabel) => {
    if (oldWeeksLabel.name === newLabel) {
      alreadyHasCorrectLabel = true;
      return;
    }
    try {
      console.log('removing old weeks left', oldWeeksLabel);
      await github.rest.issues.removeLabel({
        repo, owner,
        issue_number: issue.number,
        name: oldWeeksLabel.name
      });
    } catch (error) {
      console.log(`>>>>>`, error);
    }
  }));

  if (!alreadyHasCorrectLabel) {
    try {
      await github.rest.issues.createLabel({
        repo, owner,
        name: newLabel,
        color: newLabelConfig.color,
      });
    } catch (error) {
      if (error.status !== 422) { // 422 is already exists
        console.error(error);
      }
    }
    console.log(`Adding ${newLabel} label to issue`);
    try {
      await github.rest.issues.addLabels({
        repo, owner,
        issue_number: issue.number,
        labels: [newLabel],
      });
    } catch (error) {
      if (error.status !== 422) { // 422 is already exists
        console.error(error);
      }
    }
  }

}
/**
 * 
 * @param {*} issue object from github
 * @param {*} github object
 * @returns  object {mobile, extension, release, released}
 */
async function checkRelease(issue, github) {
  const { repo, owner } = ownerAndNameFromRepoUrl(issue.repository_url);
  const { mobile, extension, release, released } = issue.labels.reduce((acc, label) => {
    const lbl = label.name.toLowerCase();
    if (lbl.startsWith('release:')) {
      acc['release'] = label.name.split(':')[1].trim();
    }
    if (lbl === 'released') {
      acc['released'] = true;
    }
    if (['mobile', 'extension'].includes(lbl)) {
      acc[lbl] = label.name;
    }
    return acc;
  }, {});

  if (mobile && extension) {
    // issue targetting mobile and extension not supported yet
    throw new Error(`Issue ${issue.number} has both mobile and extension labels`);
  }

  if ((!released && (mobile || extension) && release)) {
    // add label to issue
    const latestRelease = await github.rest.repos.getLatestRelease({
      owner: 'MetaMask',
      repo: REPOS[mobile ? 'mobile' : 'extension'],
    });
    const tag = latestRelease.data.tag_name.replace('v', '');
    if (tag > release) {
      await github.rest.issues.addLabels({
        repo, owner,
        issue_number: issue.number,
        labels: [`Released`],
      });
    }
  }
  return { mobile, extension, release, released };
}


/**
 * 
 * @param {*} labels array of label strings
 * @throws if there is not exactly one SEV label
 * @returns sev label
 */
function getSevLabel(labels) {
  const sevLabels = labels.filter((label) => label.name.startsWith(SEV_LABELS.format));
  if (sevLabels.length !== 1) {
    throw new Error(`${sevLabels.length === 0 ? 'Missing SEV label' : 'Too many SEV labels'}`);
  }
  return sevLabels[0];
}
/**
 * Processes a single issue with sev label
 * @param {*} param0 { issue, github }
 * @returns 
 */
async function processIssue({
  issue,
  github,
  context
}) {
  console.log(`>>>>>issue`, issue);
  const sevLabel = getSevLabel(issue.labels);


  const { released, release } = await checkRelease(issue, github);

  const { resolutionDate, existingComment } = await getResolutionDate(issue, sevLabel, github);
  const url = !existingComment ? await addResolutionDateComment(resolutionDate, issue, sevLabel, github) : existingComment;
  console.log('>>>>> resolutionDate: ', resolutionDate);
  console.log(`>>>>> added comment ${url}`);

  const issueDone = released || release;
  await addFixTimelineLabel(resolutionDate, issue, github, issueDone);
}

async function processIssueLabelChange({ github, context }) {
  const { payload: { action, label, issue } } = context;

  const sevLabel = getSevLabel(issue.labels);

  const { released, release } = await checkRelease(issue, github);
  await retireResolutionDateComments(issue, github);

  const { resolutionDate, existingComment } = await getResolutionDate(issue, sevLabel, github);
  const url = !existingComment ? await addResolutionDateComment(resolutionDate, issue, sevLabel, github) : existingComment;

  console.log('>>>>> resolutionDate: ', resolutionDate);
  console.log(`>>>>> added comment ${url}`);

  const issueDone = released || release;
  await addFixTimelineLabel(resolutionDate, issue, github, issueDone);
}

module.exports = {
  processIssue,
  processIssueLabelChange,
};