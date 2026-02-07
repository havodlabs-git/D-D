import type { Express } from "express";
import bcrypt from "bcryptjs";
import { sdk } from "./sdk";
import { getSessionCookieOptions } from "./cookies";
import { COOKIE_NAME } from "../../shared/const";
import * as db from "../db";
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";

const SALT_ROUNDS = 10;

export function registerEmailAuthRoutes(app: Express) {
  // ============================================
  // REGISTER - Create new account with email/password
  // ============================================
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ error: "Email e password são obrigatórios" });
      }

      if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ error: "Dados inválidos" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Formato de email inválido" });
      }

      // Validate password length
      if (password.length < 6) {
        return res.status(400).json({ error: "A password deve ter pelo menos 6 caracteres" });
      }

      if (password.length > 128) {
        return res.status(400).json({ error: "A password é demasiado longa" });
      }

      const playerName = (typeof name === "string" && name.trim()) ? name.trim() : "Aventureiro";

      // Check if DB is available
      const database = await getDb();
      if (!database) {
        return res.status(503).json({ error: "Base de dados indisponível. Tente novamente mais tarde." });
      }

      // Check if email already exists
      const existingUsers = await database.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
      if (existingUsers.length > 0) {
        return res.status(409).json({ error: "Este email já está registado. Tente fazer login." });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create unique openId from email
      const openId = `email_${Buffer.from(email.toLowerCase().trim()).toString("base64url").slice(0, 40)}`;

      // Insert user into DB
      await database.insert(users).values({
        openId,
        name: playerName,
        email: email.toLowerCase().trim(),
        passwordHash,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      // Create session token
      const token = await sdk.createSessionToken(openId, { name: playerName });

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
      });

      console.log(`[EmailAuth] User registered: ${email} (${openId})`);
      return res.json({ success: true, redirect: "/game" });
    } catch (error: any) {
      console.error("[EmailAuth] Register error:", error);
      
      // Handle duplicate key error
      if (error?.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "Este email já está registado." });
      }
      
      return res.status(500).json({ error: "Erro ao criar conta. Tente novamente." });
    }
  });

  // ============================================
  // LOGIN - Authenticate with email/password
  // ============================================
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ error: "Email e password são obrigatórios" });
      }

      if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ error: "Dados inválidos" });
      }

      // Check if DB is available
      const database = await getDb();
      if (!database) {
        return res.status(503).json({ error: "Base de dados indisponível. Tente novamente mais tarde." });
      }

      // Find user by email
      const foundUsers = await database.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
      if (foundUsers.length === 0) {
        return res.status(401).json({ error: "Email ou password incorretos" });
      }

      const user = foundUsers[0];

      // Check if user has a password (might have registered via OAuth)
      if (!user.passwordHash) {
        return res.status(401).json({ error: "Esta conta foi criada com Google. Use o login com Google." });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Email ou password incorretos" });
      }

      // Update last signed in
      await database.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

      // Create session token
      const token = await sdk.createSessionToken(user.openId, { name: user.name || "Aventureiro" });

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
      });

      console.log(`[EmailAuth] User logged in: ${email} (${user.openId})`);
      return res.json({ success: true, redirect: "/game" });
    } catch (error) {
      console.error("[EmailAuth] Login error:", error);
      return res.status(500).json({ error: "Erro ao fazer login. Tente novamente." });
    }
  });
}
