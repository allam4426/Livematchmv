import { Router } from "express";
import { AdminLoginBody } from "@workspace/api-zod";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const COOKIE_NAME = "fl_admin";

export function requireAdmin(req: any, res: any, next: any) {
  const token = req.signedCookies?.[COOKIE_NAME];
  if (token !== "authenticated") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

router.post("/admin/login", (req, res) => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  if (parsed.data.password !== ADMIN_PASSWORD) {
    res.status(401).json({ authenticated: false });
    return;
  }
  res.cookie(COOKIE_NAME, "authenticated", {
    signed: true,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: "lax",
  });
  res.json({ authenticated: true });
});

router.post("/admin/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ authenticated: false });
});

router.get("/admin/me", (req, res) => {
  const token = req.signedCookies?.[COOKIE_NAME];
  res.json({ authenticated: token === "authenticated" });
});

export default router;
