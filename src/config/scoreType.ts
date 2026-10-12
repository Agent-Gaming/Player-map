import experienceImg from '../assets/img/scoreType/experience.png';
import communityImg from '../assets/img/scoreType/community.png';
import monetizationImg from '../assets/img/scoreType/monetization.png';
import trustImg from '../assets/img/scoreType/trust.png';
import globalImg from '../assets/img/scoreType/global.png';

// Unified with the dashboard's CampaignScoreDimension — same 4 dimensions,
// plus "global" (feedback-only; a Campaign is always scoped to specific
// triples, so "global" doesn't apply there).
export type FeedbackScoreType = 'experience' | 'community' | 'monetization' | 'trust' | 'global';

// Same icon set as the dashboard's DIM_ICONS (packages/app/src/lib/dimIcons.ts)
// — copied in, not shared (no package boundary between the two repos).
export const SCORE_TYPE_ICON: Record<FeedbackScoreType, string> = {
  experience: experienceImg,
  community: communityImg,
  monetization: monetizationImg,
  trust: trustImg,
  global: globalImg,
};

// Fixed display order for the Feedback tab's dimension filter tabs.
export const FEEDBACK_SCORE_TYPES_ORDER: FeedbackScoreType[] = ['experience', 'community', 'monetization', 'trust', 'global'];

export const SCORE_TYPE_LABEL: Record<FeedbackScoreType, string> = {
  experience: 'Experience',
  community: 'Community',
  monetization: 'Monetization',
  trust: 'Trust',
  global: 'Global',
};

// Distinct from the FOR/AGAINST blue/orange already used in ClaimItem's row
// tint (rgba(0,111,232,...) / rgba(255,149,0,...)).
export const SCORE_TYPE_COLOR: Record<FeedbackScoreType, string> = {
  experience: '#8b5cf6',
  community: '#06b6d4',
  monetization: '#eab308',
  trust: '#22c55e',
  global: '#94a3b8',
};
