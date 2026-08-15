import { Router } from 'express';
import { z } from 'zod';
import { orgRepo } from '../../database/repositories/orgRepo.js';
import { userRepo } from '../../database/repositories/userRepo.js';
import { auditRepo } from '../../database/repositories/auditRepo.js';
import { hashPassword, comparePassword, generateToken } from '../../security/crypto.js';
import { BadRequestError, UnauthorizedError, ConflictError } from '../../core/errors.js';
import { authenticate } from '../middleware/auth.js';
import { ROLES } from '../../permissions/roles.js';

const router = Router();

const RegisterSchema = z.object({
  orgName: z.string().min(2).max(100),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Register new Organization & Owner
router.post('/register', async (req, res, next) => {
  try {
    const data = RegisterSchema.parse(req.body);
    
    // Check if user email already exists
    const existingUser = userRepo.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists');
    }

    // Generate unique slug for org
    const baseSlug = data.orgName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'org';
    let slug = baseSlug;
    let counter = 1;
    while (orgRepo.findBySlug(slug)) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Create Org
    const org = orgRepo.create({
      name: data.orgName,
      slug,
      plan: 'business',
      settings: {
        currency: 'USD',
        timezone: 'UTC',
        aiEnabled: true,
      }
    });

    // Create Owner User
    const passwordHash = await hashPassword(data.password);
    const user = userRepo.create({
      orgId: org.id,
      name: data.name,
      email: data.email,
      passwordHash,
      role: ROLES.OWNER,
    });

    // Audit log
    auditRepo.create({
      orgId: org.id,
      userId: user.id,
      action: 'ORGANIZATION_REGISTERED',
      resourceType: 'ORGANIZATION',
      resourceId: org.id,
      details: { orgName: org.name, ownerEmail: user.email },
      ipAddress: req.ip,
    });

    // Generate token
    const token = generateToken({ userId: user.id, orgId: org.id });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        organization: org,
      }
    });
  } catch (err) {
    next(err);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const data = LoginSchema.parse(req.body);
    const user = userRepo.findByEmail(data.email);

    if (!user || !user.is_active) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await comparePassword(data.password, user.password_hash);
    if (!isValid) {
      auditRepo.create({
        orgId: user.org_id,
        userId: user.id,
        action: 'USER_LOGIN_FAILED',
        resourceType: 'USER',
        resourceId: user.id,
        status: 'DENIED',
        details: { reason: 'Incorrect password' },
        ipAddress: req.ip,
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    const org = orgRepo.findById(user.org_id);
    const token = generateToken({ userId: user.id, orgId: user.org_id });

    auditRepo.create({
      orgId: user.org_id,
      userId: user.id,
      action: 'USER_LOGIN_SUCCESS',
      resourceType: 'USER',
      resourceId: user.id,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        organization: org,
      }
    });
  } catch (err) {
    next(err);
  }
});

// Get Current Authenticated User & Org
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = userRepo.findById(req.user.id);
    const org = orgRepo.findById(req.user.orgId);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.created_at,
        },
        organization: org,
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
