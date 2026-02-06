export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL - uses dev login for demo mode
export const getLoginUrl = () => {
  return `${window.location.origin}/api/auth/dev-login?name=Aventureiro&id=player-${Date.now()}`;
};
