import type { Express } from "express";
import { sdk } from "./sdk";
import { getSessionCookieOptions } from "./cookies";
import { COOKIE_NAME } from "../../shared/const";

export function registerDevAuthRoutes(app: Express) {
  // Dev login route - creates a session without Google OAuth
  app.get("/api/auth/dev-login", async (req, res) => {
    try {
      const name = (req.query.name as string) || "Aventureiro";
      const id = (req.query.id as string) || `dev-${Date.now()}`;

      // Create a session token using the SDK
      const token = await sdk.createSessionToken(id, { name });

      // Set the session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
      });

      // Redirect to game
      res.redirect("/game");
    } catch (error) {
      console.error("[DevAuth] Error:", error);
      res.status(500).json({ error: "Failed to create dev session" });
    }
  });
}
