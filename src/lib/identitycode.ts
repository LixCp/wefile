export function generate8DigitAlphanumericId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const randomBytes = new Uint8Array(8);
  crypto.getRandomValues(randomBytes);
  
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(randomBytes[i] % chars.length);
  }
  return result;
}