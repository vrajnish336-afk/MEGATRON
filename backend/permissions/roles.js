export const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
  VIEWER: 'VIEWER',
};

export const ROLE_HIERARCHY = {
  [ROLES.OWNER]: 50,
  [ROLES.ADMIN]: 40,
  [ROLES.MANAGER]: 30,
  [ROLES.EMPLOYEE]: 20,
  [ROLES.VIEWER]: 10,
};

export function hasRoleLevel(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}
