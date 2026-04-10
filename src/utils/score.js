export function scoreColor(score) {
  if (score == null) return '#999';
  const hue = Math.round((score / 10) * 120);
  return `hsl(${hue}, 90%, 55%)`;
}
