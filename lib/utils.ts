/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Generate a hexadecimal color code based on a given string. This can be used
 * to create a repeatable but unique color for each user/ancestor ID.
 *
 * Uses a basic hash function to convert the string into a hue value. The hue
 * is then converted to an HSL color with fixed saturation and lightness for
 * consistency.
 *
 * @param input - Unique string (e.g. user ID)
 */
export function generateColorFromString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * Create a CSS radial gradient to represent the halo of a node. The halo fades
 * from the generated color at the center to transparent at the edges.
 *
 * @param id - Unique string for the node
 */
export function getHaloStyle(id: string): React.CSSProperties {
  const color = generateColorFromString(id);
  return {
    background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)`,
  };
}