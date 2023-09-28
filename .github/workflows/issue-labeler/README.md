# Issue-Labeler Documentation

## Overview

This Github action, referred to as the `Issue-Labeler`, interacts only with open issues that have a SEV (severity) label. The action's primary function is to update the `Fix Timeline:` label, reflecting the remaining time until the expected resolution date. Additionally, it will check if the issue fix has been released.

## Triggers

There are two triggers for this action:

1. **Cron job** - This action is set to run automatically at 8 AM GMT every day.
2. **SEV label addition** - The action is triggered when a SEV label is added to the issue.

## Features

- **Update Fix Timeline Label**: During each run, the action checks the expected resolution date and updates the `Fix Timeline:` label to show how much time is remaining.
  
- **Add Resolution Date Comment**: The action will add a comment with the expected resolution date when a `SEV-n` label is added. If the severity is changed, it will strikethrough the old resolution date and add a new comment with the updated resolution date.
  
- **Check Release**: The action will check if the issue fix has been released. For this, it requires either the `extension` or `mobile` product label and the associated scheduled release.

## Labels

### Unchangeable Labels

These labels are applied manually and will not be altered by the automation:

- **SEV-0**: Should be resolved within 5 days, CVSS 9.0 - 10.0 (Critical)
- **SEV-1**: Should be resolved within 14 days, CVSS 7.0 - 8.9 (High)
- **SEV-2**: Should be resolved within 30 days, CVSS 4.0 - 6.9 (Medium)
- **SEV-3**: Should be resolved within 60 days, CVSS 0.1 - 3.9 (Low)
- **extension**: Issue affecting Metamask extension
- **mobile**: Issue affecting Metamask mobile app
- **release XX.YY**: Scheduled release version for the fix

### Automation-Managed Labels

These labels will be automatically updated by the action:

- **Fix Timeline: 3 months**
- **Fix Timeline: 2 months**
- **Fix Timeline: 1 month**
- **Fix Timeline: 3 weeks**
- **Fix Timeline: <2 weeks**
- **Fix Timeline: <1 week**
- **Fix Timeline: Overdue**
- **Released**: The fix for the issue has been released.
