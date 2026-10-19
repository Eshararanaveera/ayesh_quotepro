import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { parse } from '../../lib/validate.js';
import { badRequest, notFound, unauthorized } from '../../lib/http-error.js';
import { requireAuth, signToken } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

const passwordRules = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[a-z]/, 'Needs a lowercase letter')
  .regex(/[A-Z]/, 'Needs an uppercase letter')
  .regex(/\d/, 'Needs a number');

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: passwordRules,
});

const publicUser = (u: { id: string; email: string; name: string; role: 'admin' | 'staff'; mustChangePassword: boolean }) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  mustChangePassword: u.mustChangePassword,
});

// A real hash to compare against when the email doesn't exist, so the response
// time doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

// 10 failed attempts per 15 minutes per IP; a successful sign-in resets the count.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
});

/** POST /api/auth/login → { token, user } */
authRouter.post(
  '/login',
  loginLimiter,
  async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw unauthorized('Incorrect email or password.');
    loginLimiter.reset(req);

    const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    res.json({ token, user: publicUser(user) });
  },
);

/** GET /api/auth/me → current user (used to restore a session on page load) */
authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw unauthorized('Your account no longer exists.');
  res.json({ user: publicUser(user) });
});

/** POST /api/auth/change-password */
authRouter.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = parse(changePasswordSchema, req.body);
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw notFound('User');

  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw badRequest('Current password is incorrect.', { currentPassword: 'Current password is incorrect.' });
  }
  if (currentPassword === newPassword) {
    throw badRequest('New password must be different.', { newPassword: 'New password must be different.' });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 12), mustChangePassword: false },
  });
  res.json({ user: publicUser(updated) });
});
