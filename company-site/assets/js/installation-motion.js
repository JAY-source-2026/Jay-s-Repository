// Keep menus, captions and geometry on the same installation clock.
export function installationTimeline(record) {
  let at = 0;
  const steps = record.steps.map(step => {
    const duration = ['opening', 'service', 'glasswool'].includes(step.kind) ? .65
      : step.kind === 'sealant' ? 5.2 : step.kind === 'board' ? 3.6
      : step.kind === 'fixing' && /철선|철사/.test(step.text.replace(/\s/g, '')) ? 4.2
      : step.kind === 'blanket' ? (record.category==='duct'?6.8:4.4) : step.kind === 'jacket' ? (record.steps.some(s=>s.kind==='brackets')?6:10.5)
      : step.kind === 'brackets' ? 4.6 : 2.8;
    const entry = { start: at, end: at + duration, duration };
    at += duration;
    return entry;
  });
  return { steps, complete: at, duration: at + 1 };
}
