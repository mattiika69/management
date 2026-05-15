export type FunnelType = "book-a-call" | "webinar";

export type FunnelStatus = "not_started" | "in_progress" | "done";
export type BuilderKey = "lovable" | "claude-code" | "manus" | "replit" | "bolt" | "other";

export type CompanyContextData = Record<string, string>;

export type FunnelStepDefinition = {
  key: string;
  title: string;
  agentId: string | null;
};

export type AIDefinition = {
  agentId: string;
  title: string;
  funnelTypes: FunnelType[];
  description: string;
  defaultPrompt: string;
  defaultCriteria: string[];
};

export type LaunchAssetDefinition = {
  key: string;
  title: string;
  agentId: string;
  stepKey: string;
  creditCost: number;
  noteFolder: string;
  inspirationCategories: string[];
};

export const BUILDER_OPTIONS: Array<{ key: BuilderKey; label: string; promptLabel: string }> = [
  { key: "lovable", label: "Lovable", promptLabel: "Lovable app builder" },
  { key: "claude-code", label: "Claude Code", promptLabel: "Claude Code implementation workspace" },
  { key: "manus", label: "Manus", promptLabel: "Manus builder" },
  { key: "replit", label: "Replit", promptLabel: "Replit app workspace" },
  { key: "bolt", label: "Bolt", promptLabel: "Bolt app builder" },
  { key: "other", label: "Other", promptLabel: "selected builder" },
];

export const INSPIRATION_CATEGORIES = [
  "ads",
  "opt-in-page",
  "sales-page",
  "vsl",
  "thank-you-page",
  "email",
  "follow-up",
  "general",
] as const;

export const COMPANY_FIELD_GROUPS: Array<{
  title: string;
  fields: Array<{ key: string; label: string; multiline?: boolean }>;
}> = [
  {
    title: "Company",
    fields: [
      { key: "companyName", label: "Company name" },
      { key: "companyWhatItDoes", label: "What the company does", multiline: true },
      { key: "websiteUrl", label: "Website URL" },
      { key: "funnelUrl", label: "Main funnel URL" },
      { key: "bookACallUrl", label: "Book-a-call URL" },
      { key: "qualificationFormUrl", label: "Qualification form URL" },
      { key: "salesPresentationUrl", label: "Sales presentation URL" },
      { key: "mainEmailAddress", label: "Main email" },
      { key: "mainPhoneNumber", label: "Main phone" },
      { key: "reviewsLink", label: "Reviews link" },
    ],
  },
  {
    title: "Founder And ICP",
    fields: [
      { key: "founderFullName", label: "Founder full name" },
      { key: "founderBio", label: "Founder bio", multiline: true },
      { key: "icp", label: "ICP notes", multiline: true },
      { key: "icpJobTitle", label: "ICP job title" },
      { key: "icpIndustry", label: "ICP industry" },
      { key: "icpRevenueRange", label: "ICP revenue range" },
      { key: "icpEmployeeCount", label: "ICP employee count" },
      { key: "icpHouseholdIncome", label: "ICP household income" },
      { key: "icpTechStack", label: "ICP tech stack", multiline: true },
    ],
  },
  {
    title: "Offer",
    fields: [
      { key: "offerPrimary", label: "Primary offer", multiline: true },
      { key: "offerBenefits", label: "Benefits", multiline: true },
      { key: "offerDeliverables", label: "Deliverables", multiline: true },
      { key: "offerTimelineProcess", label: "Timeline and process", multiline: true },
      { key: "offerGuarantee", label: "Guarantee", multiline: true },
      { key: "offerCallToActionType", label: "Call to action type" },
      { key: "offerAudience", label: "Audience type" },
      { key: "offerObjections", label: "Objections and answers", multiline: true },
    ],
  },
  {
    title: "Voice And Proof",
    fields: [
      { key: "likes", label: "Likes", multiline: true },
      { key: "dislikes", label: "Dislikes", multiline: true },
      { key: "language", label: "Language and tone", multiline: true },
      { key: "problems", label: "Problems", multiline: true },
      { key: "circumstances", label: "Circumstances", multiline: true },
      { key: "outcomes", label: "Outcomes", multiline: true },
      { key: "topFaqs", label: "FAQs", multiline: true },
      { key: "qaFirstOrder", label: "First-order questions", multiline: true },
      { key: "qaSecondOrder", label: "Second-order questions", multiline: true },
      { key: "qaExpectations", label: "Expectations", multiline: true },
      { key: "topTenCaseStudies", label: "Case studies", multiline: true },
      { key: "topTenTestimonials", label: "Testimonials", multiline: true },
      { key: "voiceNotes", label: "Source material", multiline: true },
      { key: "companyTechStack", label: "Company tech stack", multiline: true },
    ],
  },
];

export const DEFAULT_COMPANY_CONTEXT: CompanyContextData = Object.fromEntries(
  COMPANY_FIELD_GROUPS.flatMap((group) => group.fields.map((field) => [field.key, ""])),
);

export const FUNNEL_DEFINITIONS: Record<
  FunnelType,
  { name: string; subtitle: string; steps: FunnelStepDefinition[] }
> = {
  "book-a-call": {
    name: "Book-a-Call Funnel",
    subtitle: "Track the booked-call path from opt-in through sales call and follow-up.",
    steps: [
      { key: "opt_in_page", title: "Opt-In Page", agentId: "opt-in-page" },
      { key: "lead_magnet", title: "Lead Magnet", agentId: "lead-magnet" },
      { key: "page_with_vsl", title: "Sales Page", agentId: "sales-page" },
      { key: "vsl", title: "VSL", agentId: "vsl" },
      { key: "application_form", title: "Application Form", agentId: "application-form" },
      { key: "unqualified_page", title: "Unqualified Page", agentId: "unqualified-page" },
      { key: "thank_you_page", title: "Thank You Page", agentId: "confirmation-page" },
      { key: "book_a_call", title: "Book a Call", agentId: null },
      { key: "welcome_flow", title: "Welcome Flow", agentId: "welcome-flow" },
      { key: "pre_call_flow", title: "Pre-Call Flow", agentId: "pre-call-flow" },
      { key: "retargeting_ads", title: "Retargeting Ads", agentId: "retargeting-ads" },
      { key: "appointment_setting_message", title: "Appointment-Setting Message", agentId: "appointment-setting-script" },
      { key: "selfie_video", title: "Selfie Video", agentId: "selfie-video" },
      { key: "breakout_videos", title: "Breakout Videos", agentId: "youtube-intro" },
      { key: "sales_call_plan", title: "Sales Call Plan", agentId: "sales-call-plan" },
      { key: "follow_up_flow", title: "Follow-Up Flow", agentId: "post-call-follow-up" },
    ],
  },
  webinar: {
    name: "Webinar Funnel",
    subtitle: "Track the webinar path from registration through replay and scheduler handoff.",
    steps: [
      { key: "webinar_opt_in_page", title: "Opt-In Page", agentId: "opt-in-page" },
      { key: "webinar_confirmation_page", title: "Confirmation Page", agentId: "confirmation-page" },
      { key: "webinar_pre_email_flow", title: "Pre-Webinar Email Flow", agentId: "pre-webinar-flow" },
      { key: "webinar_pre_sms_flow", title: "Pre-Webinar SMS Flow", agentId: "pre-webinar-flow" },
      { key: "webinar_platform", title: "Webinar Platform", agentId: null },
      { key: "webinar_presentation", title: "Webinar Presentation", agentId: null },
      { key: "webinar_replay_page", title: "Replay Page", agentId: null },
      { key: "webinar_post_flow", title: "Post-Webinar Flow", agentId: "post-webinar-flow" },
      { key: "webinar_meeting_scheduler", title: "Meeting Scheduler", agentId: "appointment-setting-script" },
    ],
  },
};

export const AI_DEFINITIONS: AIDefinition[] = [
  { agentId: "lead-magnet", title: "Lead Magnet AI", funnelTypes: ["book-a-call"], description: "Creates simple lead magnet concepts and delivery copy for the opt-in path.", defaultPrompt: "Create a lead magnet concept, outline, landing copy, and delivery notes that match the ICP and offer.", defaultCriteria: ["Simple promise", "Useful in minutes", "Matches ICP pain", "Supports the booked-call path"] },
  { agentId: "sales-page", title: "Sales Page AI", funnelTypes: ["book-a-call"], description: "Creates and improves the core sales page for the booked-call path.", defaultPrompt: "Create sales page copy that drives qualified booked calls.", defaultCriteria: ["Clear offer promise", "Uses ICP language", "Includes proof and objections", "Drives the next booked-call action"] },
  { agentId: "vsl", title: "VSL AI", funnelTypes: ["book-a-call"], description: "Creates video sales letter outlines and scripts.", defaultPrompt: "Create a VSL script or outline grounded in the offer, ICP, proof, objections, and funnel destination.", defaultCriteria: ["Strong hook", "Clear problem and mechanism", "Proof-driven", "Clear call to action"] },
  { agentId: "opt-in-page", title: "Opt-In Page AI", funnelTypes: ["book-a-call", "webinar"], description: "Creates opt-in page copy for booked-call and webinar funnels.", defaultPrompt: "Create opt-in page copy using company context, funnel goal, promise, proof, and the next step.", defaultCriteria: ["Specific promise", "Low-friction CTA", "Matches funnel type", "Uses company context"] },
  { agentId: "confirmation-page", title: "Confirmation Page AI", funnelTypes: ["book-a-call", "webinar"], description: "Creates confirmation and thank-you page copy.", defaultPrompt: "Create confirmation page copy that confirms the action and drives the next required step.", defaultCriteria: ["Confirms conversion", "Sets expectations", "Includes next step", "Uses relevant links"] },
  { agentId: "thank-you-page", title: "Thank You Page AI", funnelTypes: ["book-a-call"], description: "Creates thank-you page copy and next-step instructions.", defaultPrompt: "Create thank-you page copy that makes the next action clear and keeps the user moving.", defaultCriteria: ["Clear next action", "Warm confirmation", "Includes required links", "Maintains offer context"] },
  { agentId: "application-form", title: "Application Form AI", funnelTypes: ["book-a-call"], description: "Creates qualification form structure and application page copy.", defaultPrompt: "Create an application form that qualifies fit, surfaces urgency, and prepares the sales call.", defaultCriteria: ["Clear qualification signal", "Short and easy to complete", "Surfaces urgency and fit", "Prepares sales team"] },
  { agentId: "unqualified-page", title: "Unqualified Page AI", funnelTypes: ["book-a-call"], description: "Creates fallback pages for people who should not book a call yet.", defaultPrompt: "Create an unqualified page that respectfully redirects non-fit leads toward the best next step.", defaultCriteria: ["Respectful tone", "Clear reason", "Downsell or nurture path", "No dead end"] },
  { agentId: "welcome-flow", title: "Welcome Flow AI", funnelTypes: ["book-a-call"], description: "Creates welcome email or message flow for new leads.", defaultPrompt: "Create a welcome flow that introduces the company and moves the prospect toward the booked-call goal.", defaultCriteria: ["Personal opening", "Company context", "Clear CTA", "Sequence logic"] },
  { agentId: "pre-call-flow", title: "Pre-Call Flow AI", funnelTypes: ["book-a-call"], description: "Creates pre-call nurture and reminder flow.", defaultPrompt: "Create a pre-call flow that increases show-up rate and pre-sells the offer before the call.", defaultCriteria: ["Show-up reinforcement", "Sales presentation link where relevant", "Objection handling", "Clear timing"] },
  { agentId: "post-call-follow-up", title: "Post-Call Follow-Up AI", funnelTypes: ["book-a-call"], description: "Creates post-call follow-up assets.", defaultPrompt: "Create follow-up copy that moves a sales conversation forward after the call.", defaultCriteria: ["References call context", "Handles objections", "Clear reply CTA", "Persists next step"] },
  { agentId: "retargeting-ads", title: "Retargeting Ads AI", funnelTypes: ["book-a-call"], description: "Creates retargeting ad angles and copy for funnel visitors.", defaultPrompt: "Create retargeting ad copy grounded in objections, proof, and funnel status.", defaultCriteria: ["Specific audience", "Proof or objection angle", "CTA back to funnel", "No broad generic claims"] },
  { agentId: "appointment-setting-script", title: "Appointment Setting Script AI", funnelTypes: ["book-a-call", "webinar"], description: "Creates appointment-setting and meeting-scheduler scripts.", defaultPrompt: "Create appointment-setting scripts, call-plan prompts, and scheduler handoff copy using company context.", defaultCriteria: ["Qualifies prospect", "Clear meeting reason", "Handles objections", "Moves to scheduled call"] },
  { agentId: "selfie-video", title: "Selfie Video AI", funnelTypes: ["book-a-call"], description: "Creates short selfie video scripts for pre-call trust.", defaultPrompt: "Create a concise selfie video script that builds trust and reinforces the booked-call path.", defaultCriteria: ["Human tone", "Short and clear", "Relevant proof", "Next step reminder"] },
  { agentId: "youtube-intro", title: "YouTube Intro AI", funnelTypes: ["book-a-call"], description: "Creates short intro/breakout video scripts.", defaultPrompt: "Create YouTube or breakout intro scripts that support the book-a-call funnel.", defaultCriteria: ["Strong opener", "Contextual teaching point", "CTA alignment", "Simple structure"] },
  { agentId: "sales-call-plan", title: "Sales Call Plan AI", funnelTypes: ["book-a-call"], description: "Creates sales call plans, discovery structure, objection handling, and close logic.", defaultPrompt: "Create a sales call plan with opener, discovery questions, pitch structure, objection handling, close, and follow-up handoff.", defaultCriteria: ["Clear call structure", "ICP-specific discovery", "Objection handling", "Close and follow-up handoff"] },
  { agentId: "pre-webinar-flow", title: "Pre-Webinar Flow AI", funnelTypes: ["webinar"], description: "Creates pre-webinar email/SMS nurture and attendance flow.", defaultPrompt: "Create a pre-webinar sequence that increases attendance and prepares registrants for the offer.", defaultCriteria: ["Registration reminder", "Attendance motivation", "Value preview", "Calendar/platform clarity"] },
  { agentId: "post-webinar-flow", title: "Post-Webinar Flow AI", funnelTypes: ["webinar"], description: "Creates post-webinar follow-up and conversion flow.", defaultPrompt: "Create a post-webinar flow that uses replay, offer context, and scheduler handoff to drive conversion.", defaultCriteria: ["Replay CTA", "Offer urgency", "Objection handling", "Scheduler handoff"] },
];

export const BOOK_A_CALL_LAUNCH_ASSETS: LaunchAssetDefinition[] = [
  { key: "opt_in_page", title: "Opt-In Page", agentId: "opt-in-page", stepKey: "opt_in_page", creditCost: 50, noteFolder: "Generated Assets", inspirationCategories: ["opt-in-page", "general"] },
  { key: "lead_magnet", title: "Lead Magnet", agentId: "lead-magnet", stepKey: "lead_magnet", creditCost: 50, noteFolder: "Generated Assets", inspirationCategories: ["opt-in-page", "general"] },
  { key: "sales_page", title: "Sales Page", agentId: "sales-page", stepKey: "page_with_vsl", creditCost: 50, noteFolder: "Generated Assets", inspirationCategories: ["sales-page", "general"] },
  { key: "vsl", title: "VSL", agentId: "vsl", stepKey: "vsl", creditCost: 50, noteFolder: "Generated Assets", inspirationCategories: ["vsl", "general"] },
  { key: "application_form", title: "Application Form", agentId: "application-form", stepKey: "application_form", creditCost: 50, noteFolder: "Generated Assets", inspirationCategories: ["general"] },
  { key: "unqualified_page", title: "Unqualified Page", agentId: "unqualified-page", stepKey: "unqualified_page", creditCost: 50, noteFolder: "Generated Assets", inspirationCategories: ["sales-page", "general"] },
  { key: "thank_you_page", title: "Thank You Page", agentId: "confirmation-page", stepKey: "thank_you_page", creditCost: 50, noteFolder: "Generated Assets", inspirationCategories: ["thank-you-page", "general"] },
  { key: "welcome_flow", title: "Welcome Flow", agentId: "welcome-flow", stepKey: "welcome_flow", creditCost: 50, noteFolder: "Generated Assets", inspirationCategories: ["email", "general"] },
  { key: "breakout_videos", title: "Breakout Videos", agentId: "youtube-intro", stepKey: "breakout_videos", creditCost: 50, noteFolder: "Generated Assets", inspirationCategories: ["vsl", "general"] },
  { key: "pre_call_flow", title: "Pre-Call Flow", agentId: "pre-call-flow", stepKey: "pre_call_flow", creditCost: 50, noteFolder: "Generated Assets", inspirationCategories: ["email", "follow-up", "general"] },
  { key: "retargeting_ads", title: "Retargeting Ads", agentId: "retargeting-ads", stepKey: "retargeting_ads", creditCost: 50, noteFolder: "Generated Assets", inspirationCategories: ["ads", "general"] },
  { key: "appointment_setting_message", title: "Appointment-Setting Message", agentId: "appointment-setting-script", stepKey: "appointment_setting_message", creditCost: 50, noteFolder: "Generated Assets", inspirationCategories: ["follow-up", "general"] },
  { key: "selfie_video", title: "Selfie Video", agentId: "selfie-video", stepKey: "selfie_video", creditCost: 50, noteFolder: "Generated Assets", inspirationCategories: ["vsl", "general"] },
  { key: "sales_call_plan", title: "Sales Call Plan", agentId: "sales-call-plan", stepKey: "sales_call_plan", creditCost: 50, noteFolder: "Generated Assets", inspirationCategories: ["general"] },
  { key: "follow_up_flow", title: "Follow-Up Flow", agentId: "post-call-follow-up", stepKey: "follow_up_flow", creditCost: 50, noteFolder: "Generated Assets", inspirationCategories: ["email", "follow-up", "general"] },
];

const builderKeys = new Set(BUILDER_OPTIONS.map((builder) => builder.key));
const launchAssetKeys = new Set(BOOK_A_CALL_LAUNCH_ASSETS.map((asset) => asset.key));
const inspirationCategorySet = new Set<string>(INSPIRATION_CATEGORIES);

export function isBuilderKey(value: string): value is BuilderKey {
  return builderKeys.has(value as BuilderKey);
}

export function isBookACallAssetKey(value: string) {
  return launchAssetKeys.has(value);
}

export function isInspirationCategory(value: string) {
  return inspirationCategorySet.has(value);
}

export const DEFAULT_LEARNING_ITEMS: Record<
  FunnelType,
  Array<{ section: "learning" | "training"; itemType: "learning" | "training" | "assignment"; title: string; body: string }>
> = {
  "book-a-call": [
    { section: "learning", itemType: "learning", title: "Book-a-Call Funnel Learning", body: "Understand how each step increases qualified booked calls before operating the funnel." },
    { section: "training", itemType: "training", title: "Opt-in and sales pages", body: "Train opt-in page, lead magnet, sales page, VSL, application form, unqualified page, book-a-call link, and thank-you page checks." },
    { section: "training", itemType: "training", title: "Pre-call conversion assets", body: "Train welcome flow, pre-call flow, selfie video, retargeting ads, appointment-setting message, and breakout video review." },
    { section: "training", itemType: "training", title: "Sales Call Plan", body: "Train offer-specific call plan structure, discovery questions, objection handling, close logic, and call-to-follow-up handoff." },
    { section: "training", itemType: "assignment", title: "Sales call handoff", body: "Train call prep, DRI ownership, sales call plan use, follow-up flow, close review, and feedback back into funnel rows." },
  ],
  webinar: [
    { section: "learning", itemType: "learning", title: "Webinar Funnel Learning", body: "Understand the webinar-specific journey before operating the funnel." },
    { section: "training", itemType: "training", title: "Registration and confirmation", body: "Train opt-in page checks, confirmation page links, pre-webinar email/SMS flow setup, and platform registration QA." },
    { section: "training", itemType: "training", title: "Webinar delivery assets", body: "Train platform access, presentation readiness, replay page publishing, and offer transition review." },
    { section: "training", itemType: "assignment", title: "Post-webinar conversion", body: "Train post-webinar flow, scheduler handoff, DRI ownership, and follow-up review after each event." },
  ],
};

export function isFunnelType(value: string): value is FunnelType {
  return value === "book-a-call" || value === "webinar";
}

export function aiDefinitionsForFunnel(funnelType: FunnelType) {
  return AI_DEFINITIONS.filter((definition) => definition.funnelTypes.includes(funnelType));
}

export function companyContextToText(data: CompanyContextData) {
  const lines = COMPANY_FIELD_GROUPS.flatMap((group) => {
    const fields = group.fields
      .map((field) => {
        const value = (data[field.key] ?? "").trim();
        return value ? `${field.label}: ${value}` : "";
      })
      .filter(Boolean);
    return fields.length ? [group.title, ...fields] : [];
  });
  return lines.join("\n");
}
