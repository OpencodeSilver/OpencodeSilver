const CURATED_SKILLS_SOURCES = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    description: "Anthropic's public skills repository",
    source: 'anthropics/skills',
    defaultSubpath: 'skills',
    sourceType: 'github',
    // These four ship under a proprietary LICENSE.txt that forbids copies
    // outside Anthropic's services; the rest of the repo is Apache 2.0.
    excludedSkills: ['docx', 'pdf', 'pptx', 'xlsx'],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: "OpenAI's curated skills",
    source: 'openai/skills',
    defaultSubpath: 'skills/.curated',
    sourceType: 'github',
  },
  {
    id: 'cursor',
    label: 'Cursor',
    description: "Cursor's plugin skills",
    source: 'cursor/plugins',
    defaultSubpath: 'pstack/skills',
    sourceType: 'github',
  },
  {
    id: 'mattpocock',
    label: 'Matt Pocock',
    description: 'Matt Pocock skills collection',
    source: 'mattpocock/skills',
    sourceType: 'github',
  },
  {
    id: 'opencodesilver-claude-skills',
    label: 'OpencodeSilver/claude-skills',
    description: 'OpencodeSilver curated Claude skills collection',
    source: 'OpencodeSilver/claude-skills',
    sourceType: 'github',
  },
  {
    id: 'claude-skills',
    label: 'claude-skills',
    description: 'Alireza Rezvani Claude skills collection',
    source: 'alirezarezvani/claude-skills',
    sourceType: 'github',
  },
  {
    id: 'claude-code-skill-factory',
    label: 'claude-code-skill-factory',
    description: 'Claude Code skill factory collection',
    source: 'alirezarezvani/claude-code-skill-factory',
    sourceType: 'github',
  },
];

export function getCuratedSkillsSources() {
  return CURATED_SKILLS_SOURCES.slice();
}

