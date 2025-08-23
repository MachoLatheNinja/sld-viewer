function parseLrpParts(lrp) {
  const s = (lrp || '').replace(/\s+/g, '').toUpperCase();
  const m = /^K?M?(\d+)(?:\+(\d+))?$/.exec(s);
  if (!m) return null;
  return { km: Number(m[1]), meters: m[2] ? Number(m[2]) : 0 };
}

export function parseLrpKm(lrp) {
  const parts = parseLrpParts(lrp);
  if (!parts) return null;
  return parts.km + parts.meters / 1000;
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
