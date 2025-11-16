function parseLrpParts(lrp) {
  const s = (lrp || '').replace(/\s+/g, '').toUpperCase();
  const m = /^K?M?(\d+)(?:\+(\d*(?:\.\d+)?))?$/.exec(s);
  if (!m) return null;
  let km = Number(m[1]);
  let meters = m[2] ? Math.round(Number(m[2])) : 0;
  if (Number.isNaN(km) || Number.isNaN(meters)) return null;
  if (meters >= 1000) {
    km += Math.floor(meters / 1000);
    meters = meters % 1000;
  }
  return { km, meters };
}

export function parseLrpKm(lrp) {
  const parts = parseLrpParts(lrp);
  if (!parts) return null;
  return parts.km + parts.meters / 1000;
}

export function formatLrpKm(kmVal) {
  const k = Math.floor(kmVal);
  const mPart = Math.round((kmVal - k) * 1000);
  return `K0${String(k).padStart(3, '0')} + ${String(mPart).padStart(4, '0')}`;
}

export function formatLRP(km, posts = []) {
  if (!posts.length) return formatLrpKm(km);
  const sorted = posts.slice().sort((a, b) => a.chainageKm - b.chainageKm);
  let prev = sorted[0];
  let next = sorted[sorted.length - 1];
  for (const p of sorted) {
    if (p.chainageKm <= km) prev = p;
    if (p.chainageKm >= km) { next = p; break; }
  }
  const prevLrpKm = parseLrpKm(prev?.lrp);
  const nextLrpKm = parseLrpKm(next?.lrp);
  const EPS = 1e-6;

  if (
    prev.chainageKm <= km &&
    km < next.chainageKm &&
    prevLrpKm != null &&
    nextLrpKm != null
  ) {
    const gapM = (next.chainageKm - prev.chainageKm) * 1000;
    if (gapM > 1000 + EPS) {
      const baseKm = Math.floor(prevLrpKm);
      const baseOffsetM = (prevLrpKm - baseKm) * 1000;
      const offsetM = Math.round(baseOffsetM + (km - prev.chainageKm) * 1000);
      return `K0${String(baseKm).padStart(3, '0')} + ${String(offsetM).padStart(4, '0')}`;
    }
  }

  if (prev.chainageKm <= km && prevLrpKm != null) {
    const lrpKm = prevLrpKm + (km - prev.chainageKm);
    return formatLrpKm(lrpKm);
  }
  if (next.chainageKm >= km && nextLrpKm != null) {
    const lrpKm = nextLrpKm - (next.chainageKm - km);
    return formatLrpKm(lrpKm);
  }
  return formatLrpKm(km);
}

export function lrpToChainageKm(lrp, posts = []) {
  const parts = parseLrpParts(lrp);
  if (!parts) return null;

  const { km, meters } = parts;
  const offsetKm = meters / 1000;

  if (posts.length) {
    const base = posts.find(p => parseLrpParts(p.lrp)?.km === km);
    if (base) return base.chainageKm + offsetKm;

    // Fallback: align using the first kilometer post as baseline
    const sorted = posts.slice().sort((a, b) => a.chainageKm - b.chainageKm);
    const first = sorted[0];
    const baseKm = parseLrpKm(first?.lrp);
    if (baseKm != null) {
      const baselineOffset = first.chainageKm - baseKm;
      return km + offsetKm + baselineOffset;
    }
  }

  return km + offsetKm;
}

export function parseLrpRange(input, posts = []) {
  if (!input) return null;
  const normalized = input
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\bto\b/i, '-')
    .split('-')
    .map(s => s.trim())
    .filter(Boolean);
  if (!normalized.length) return null;
  const start = lrpToChainageKm(normalized[0], posts);
  if (start == null) return null;
  const end = normalized[1] ? lrpToChainageKm(normalized[1], posts) : null;
  return end == null
    ? { startKm: start, endKm: null }
    : { startKm: Math.min(start, end), endKm: Math.max(start, end) };
}
