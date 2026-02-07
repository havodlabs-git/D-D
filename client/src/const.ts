export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Login URL - redirects to home page with login form
export const getLoginUrl = () => {
  return `${window.location.origin}/?login=true`;
};
