export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.startsWith('your-') || value.startsWith('replace-') || value.startsWith('generate-')) {
    throw new Error(`Missing configuration: ${key}`);
  }
  return value;
}
export function isConfigured(): boolean {
  return ["DATABASE_URL", "R2_ACCOUNT_ID", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "ADMIN_EMAIL", "ADMIN_PASSWORD_HASH", "AUTH_SECRET"].every(key => {
    const value = process.env[key];
    return !!value && !/^(your-|replace-|generate-)/.test(value);
  });
}
