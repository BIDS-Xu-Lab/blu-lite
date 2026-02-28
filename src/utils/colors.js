const PRESET_COLORS = [
  { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },  // blue
  { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' },  // pink
  { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },  // green
  { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },  // amber
  { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },  // violet
  { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },  // orange
  { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },  // indigo
  { bg: '#ccfbf1', text: '#115e59', border: '#5eead4' },  // teal
  { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },  // red
  { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },  // purple
  { bg: '#ecfccb', text: '#3f6212', border: '#bef264' },  // lime
  { bg: '#e0f2fe', text: '#075985', border: '#7dd3fc' },  // sky
]

export function generateEntityColors(entityNames) {
  const map = {}
  entityNames.forEach((name, i) => {
    if (i < PRESET_COLORS.length) {
      map[name] = PRESET_COLORS[i]
    } else {
      const hue = (i * 137.508) % 360
      map[name] = {
        bg: `hsl(${Math.round(hue)}, 40%, 90%)`,
        text: `hsl(${Math.round(hue)}, 60%, 30%)`,
        border: `hsl(${Math.round(hue)}, 40%, 70%)`,
      }
    }
  })
  return map
}
