export interface QuickPromptTemplate {
  id: string;
  title: string;
  icon: string;
  category: 'code' | 'review' | 'debug' | 'docs' | 'git';
  description: string;
  prompt: string;
}

export const QUICK_PROMPT_TEMPLATES: QuickPromptTemplate[] = [];

