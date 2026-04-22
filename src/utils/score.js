export function proficiencyColor(proficiency) {
  if (proficiency == null) return '#999';
  const hue = Math.round((proficiency / 10) * 120);
  return `hsl(${hue}, 90%, 55%)`;
}
