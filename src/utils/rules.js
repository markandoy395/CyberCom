export const DEFAULT_RULES = {
  competition: [
    'Only use this platform to complete challenges',
    'Developer Tools are disabled (F12, Ctrl+Shift+I, etc.)',
    'Tab switching is disabled (Tab key, Windows+Tab, Cmd+Tab)',
    'Address bar access is disabled (Ctrl+L, Cmd+L)',
    'Right-click context menu is disabled',
    'Any attempt to bypass restrictions will be logged',
    'Cheating will result in immediate disqualification',
    'Your activities are being monitored',
  ],
  practice: [
    'Only use this platform to practice cybersecurity skills',
    'Respect other users and their progress',
    'Do not share solutions or flags publicly',
    'Do not attempt to bypass security measures',
    'Report any bugs or vulnerabilities responsibly',
    'Maintain academic integrity in your learning',
    'Engage with the community constructively',
    'Have fun and learn from each challenge',
  ],
};

export const getDefaultRules = (type = 'competition') => [
  ...(DEFAULT_RULES[type] || DEFAULT_RULES.competition),
];

export const getRulesFromResponse = (response, type = 'competition') => {
  const rules = response?.data?.rules;

  return Array.isArray(rules) && rules.length > 0
    ? rules
    : getDefaultRules(type);
};
