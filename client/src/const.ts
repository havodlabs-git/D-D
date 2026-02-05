export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL - now uses Google OAuth
export const getLoginUrl = () => {
  // Redirect to our Google OAuth endpoint
  return `${window.location.origin}/api/oauth/google`;
};
