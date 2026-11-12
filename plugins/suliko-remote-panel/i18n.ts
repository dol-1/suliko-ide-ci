// Own-plugin E4 locale table, dependency-free and safe English fallback.
export const EN = {
  panelLabel: "Suliko Remote panel",
  title: "Suliko Remote (mock only)",
  demoNote: "Offline demo fixture. No live connection, token or permissions.",
  loadError: "Unable to load demo data.",
  loading: "Loading mock data…",
  devices: "Devices",
  noDevices: "No devices available in this snapshot.",
  offlineNotice: "Some devices are offline; status is informational only.",
  pendingApprovals: "Pending approvals",
  noApprovals: "No pending approvals.",
  externalOnly: "Approval is performed only on the separate Remote secure page, never inside IDE.",
  openApproval: "Open Remote approval page (demo link)",
  pageUnavailable: "Approval page unavailable",
  outcomes: "Operation outcomes",
  unknownOutcome: "Outcome unknown. Poll status later; never replay a write automatically.",
  online: "online",
  offline: "offline",
  pending: "pending",
  approved: "approved",
  denied: "denied",
  expired: "expired",
  succeeded: "succeeded",
  failed: "failed",
  unknown: "unknown",
} as const;
export type RemoteTextKey = keyof typeof EN;
export type RemoteLocale = "en" | "ka";
export const KA: Record<RemoteTextKey, string> = {
  panelLabel: "სულიკო Remote პანელი",
  title: "სულიკო Remote (მხოლოდ დემო)",
  demoNote: "ოფლაინ სატესტო მონაცემები. რეალური კავშირი, ტოკენი და ნებართვები არ გამოიყენება.",
  loadError: "სატესტო მონაცემები ვერ ჩაიტვირთა.",
  loading: "იტვირთება სატესტო მონაცემები…",
  devices: "მოწყობილობები",
  noDevices: "ამ ჩანაწერში მოწყობილობები არ არის.",
  offlineNotice: "ზოგი მოწყობილობა გამორთულია; სტატუსი მხოლოდ საინფორმაციოა.",
  pendingApprovals: "მოლოდინში მყოფი თანხმობები",
  noApprovals: "მოლოდინში თანხმობა არ არის.",
  externalOnly: "თანხმობა გაიცემა მხოლოდ Remote-ის ცალკე უსაფრთხო გვერდზე, არა IDE-ში.",
  openApproval: "გახსენით Remote-ის თანხმობის გვერდი (დემო)",
  pageUnavailable: "თანხმობის გვერდი მიუწვდომელია",
  outcomes: "ოპერაციის შედეგები",
  unknownOutcome: "შედეგი უცნობია. გადაამოწმეთ სტატუსი მოგვიანებით; ჩაწერის ოპერაცია ავტომატურად არ გაიმეოროთ.",
  online: "ჩართულია",
  offline: "გამორთულია",
  pending: "მოლოდინშია",
  approved: "დამტკიცებულია",
  denied: "უარყოფილია",
  expired: "ვადა გასულია",
  succeeded: "წარმატებულია",
  failed: "ვერ შესრულდა",
  unknown: "უცნობია",
};
const MESSAGES: Record<RemoteLocale, Record<RemoteTextKey, string>> = { en: EN, ka: KA };
export function remoteMessages(language: string): Record<RemoteTextKey, string> {
  return MESSAGES[/^ka(?:[-_]|$)/iu.test(language) ? "ka" : "en"];
}
export function remoteStatusLabel(copy: Record<RemoteTextKey,string>, status: string): string {
  switch (status) {
    case "online": case "offline": case "pending": case "approved": case "denied":
    case "expired": case "succeeded": case "failed": case "unknown": return copy[status];
    default: return copy.unknown; // Never render untrusted raw status strings.
  }
}
