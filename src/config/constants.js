export const COLORS = {
  primary: 0x75cff5,
  secondary: 0x1e90ff,
  success: 0x2ecc71,
  error: 0xed4245,
  warn: 0xf39c12,
  info: 0x3498db,
  dark: 0x2c2f33,
  light: 0x99aab5,
  white: 0xffffff,
};

export const COMPONENTS_V2 = 1 << 15;

export const MOD_ROLE_IDS = ['1530531573332447324', '1530531568605597718'];

export function hasModRole(member) {
  return member.roles.cache.some((r) => MOD_ROLE_IDS.includes(r.id));
}
