export function newTreeId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = () => alphabet[Math.floor(Math.random() * alphabet.length)];
  return `TG-${pick()}${pick()}${pick()}${pick()}${pick()}`;
}
