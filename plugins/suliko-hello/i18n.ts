// E4/D-061: own-plugin UI strings, no private BB module or new dependency.
export const EN = {
  panelLabel: "Suliko Hello panel",
  heading: "Suliko Hello",
  description: "SDK panel and typed backend RPC feasibility probe.",
  checkingCompatibility: "Checking BB compatibility…",
  unsupportedPrefix: "Suliko Hello disabled: BB",
  versionUnavailable: "version unavailable",
  unsupportedSuffix: "is unsupported.",
  required: "Required:",
  updateOrRestore: "Update or restore a compatible BB build.",
  pingServer: "Ping server",
  checking: "Checking…",
  connectedAt: "Connected at",
  secretConfigured: "Disposable secret configured:",
  yes: "yes",
  no: "no",
  rpcFailed: "RPC check failed.",
} as const;
export type TextKey = keyof typeof EN;
export type Locale = "en" | "ka";
export const KA: Record<TextKey, string> = {
  panelLabel: "სულიკო ჰელოს პანელი",
  heading: "სულიკო ჰელო",
  description: "SDK პანელისა და ტიპიზებული RPC კავშირის საცდელი შემოწმება.",
  checkingCompatibility: "მოწმდება BB-სთან თავსებადობა…",
  unsupportedPrefix: "სულიკო ჰელო გამორთულია: BB",
  versionUnavailable: "ვერსია უცნობია",
  unsupportedSuffix: "არ არის მხარდაჭერილი.",
  required: "საჭიროა:",
  updateOrRestore: "განაახლეთ ან აღადგინეთ თავსებადი BB ვერსია.",
  pingServer: "სერვერის შემოწმება",
  checking: "მოწმდება…",
  connectedAt: "დაკავშირებულია:",
  secretConfigured: "სატესტო საიდუმლოს კონფიგურაცია:",
  yes: "დიახ",
  no: "არა",
  rpcFailed: "RPC შემოწმება ვერ შესრულდა.",
};
export const MESSAGES: Record<Locale, Record<TextKey, string>> = { en: EN, ka: KA };
export function localeFromLanguage(language: string): Locale {
  return /^ka(?:[-_]|$)/iu.test(language) ? "ka" : "en";
}
export function panelMessages(language: string): Record<TextKey, string> {
  return MESSAGES[localeFromLanguage(language)];
}
