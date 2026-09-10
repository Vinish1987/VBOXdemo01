// Placeholder poster/thumbnail art: a gradient per series colour. (Real
// artwork/thumbnails replace this once video + uploads are wired up.)
const G: Record<string, [string, string]> = {
  rose: ["#ff3d71", "#3a0d1e"],
  gold: ["#ffc24b", "#2e2308"],
  violet: ["#9b7bff", "#241141"],
  teal: ["#25c9b0", "#062724"],
  blue: ["#4d8cff", "#0a1738"],
  ember: ["#ff8a3d", "#2c1006"],
  plum: ["#c94dff", "#280a2e"],
  ice: ["#5ec8ff", "#0c2436"],
};

export function gradient(color: string, deg = 120): string {
  const [a, b] = G[color] ?? G.rose;
  return `linear-gradient(${deg}deg, ${a}, ${b})`;
}
