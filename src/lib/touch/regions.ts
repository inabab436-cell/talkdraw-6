/**
 * Geometric hit map only — it names WHERE the finger landed.
 * It never decides the reaction; that is entirely the AI's job.
 */
export function resolveRegion(x: number, y: number): string {
  const centered = Math.abs(x - 0.5) < 0.18;
  if (y < 0.12) return "hair / top of head";
  if (y < 0.2) return centered ? "forehead" : "side of hair";
  if (y < 0.3) return centered ? "face" : "cheek";
  if (y < 0.36) return "chin / jaw";
  if (y < 0.45) return centered ? "neck" : "shoulder";
  if (y < 0.6) return centered ? "chest" : "upper arm";
  if (y < 0.75) return centered ? "waist" : "forearm";
  if (y < 0.88) return centered ? "hip" : "hand";
  return "legs";
}
