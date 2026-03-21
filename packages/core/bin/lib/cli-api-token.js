export const CLI_API_TOKEN_ENV_VAR = "JANT_API_TOKEN";

export function getCliApiToken(env = process.env, fallbackToken) {
  const envToken = env[CLI_API_TOKEN_ENV_VAR];
  return envToken || fallbackToken;
}
