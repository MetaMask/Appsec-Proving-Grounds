function getLabelByRemainingDays(days) {
  // SEV rules are in business days, but we want label to show calendar days for the timeline
  if (days < 1) {
    return { color: 'b60205', timelineText: 'Overdue' };
  }
  if (days <= 7) {
    return { color: 'b60205', timelineText: '< 1 week' };
  }
  if (days <= 14) {
    return { color: 'd93f0b', timelineText: '< 2 weeks' };
  }
  if (days <= 21) {
    return { color: 'd93f0b', timelineText: '3 weeks' };
  }
  if (days <= 31) {
    return { color: 'fbca04', timelineText: '1 month' };
  }
  if (days <= 61) {
    return { color: '32CD32', timelineText: '2 months' };
  }
  if (days <= 92) {
    return { color: '0e8a16', timelineText: '3 months' };
  }
}


const SEV_LABELS = {
  format: "SEV-",
  'SEV-0': { resolutionDays: 10, color: 'b60205' },
  'SEV-1': { resolutionDays: 20, color: 'd93f0b' },
  'SEV-2': { resolutionDays: 30, color: 'fbca04' },
  'SEV-3': { resolutionDays: 60, color: '0e8a16' },
};


const REPOS = {
  mobile: 'metamask-mobile',
  extension: 'metamask-extension',
};


module.exports = {
  getLabelByRemainingDays,
  SEV_LABELS,
  REPOS,
};