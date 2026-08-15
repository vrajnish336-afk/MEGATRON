import { ROLE_PERMISSIONS } from './permissionsMatrix.js';
import { logger } from '../core/logger.js';

export function hasPermission(role, permission) {
  if (!role || !permission) return false;
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.includes(permission);
}

export function validateTenantAccess(userOrgId, targetOrgId) {
  if (!userOrgId || !targetOrgId) {
    logger.warn('Tenant access check missing org ID', { userOrgId, targetOrgId });
    return false;
  }
  return String(userOrgId) === String(targetOrgId);
}
