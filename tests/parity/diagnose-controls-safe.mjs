// Fixed-schema diagnostic classification for potentially untrusted UI labels.
// Never return, interpolate, or log any raw label, error, URL, or path.
export function categoricalControls(input) {
  const labels = Array.isArray(input)
    ? input.slice(0, 60).map(x => typeof x === "string" ? x.slice(0, 256) : "")
    : [];
  const has = pattern => labels.some(s => pattern.test(s));
  return {
    observedControls: labels.length,
    projectsControl: has(/\bprojects?\b/i),
    newThreadControl: has(/\bnew thread\b/i),
    providerPickerControl: has(/\bprovider\b|\bmodel\b/i),
    helloControl: has(/\bsuliko hello\b/i),
    filesOrDiffControl: has(/\bfiles\b|\bchanges\b|\bdiff\b/i),
    terminalControl: has(/\bterminal\b/i),
    requiresCodexInstall: has(/install codex before starting a thread/i),
  };
}
