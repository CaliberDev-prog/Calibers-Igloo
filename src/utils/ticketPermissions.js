import { PermissionFlagsBits } from 'discord.js';
import { ticketConfig } from '../config/tickets.js';

export function isStaff(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return ticketConfig.staffRoles.some((roleId) => member.roles.cache.has(roleId));
}

export function isManagement(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return ticketConfig.managementRoles.some((roleId) => member.roles.cache.has(roleId));
}

export function hasTicketAccess(member, ticket) {
  if (!member || !ticket) return false;
  if (isStaff(member)) return true;
  if (member.id === ticket.creatorId) return true;
  if (ticket.participants?.includes(member.id)) return true;
  return false;
}

export function canCloseTicket(member, ticket) {
  if (!member || !ticket) return false;
  if (isStaff(member)) return true;
  return false;
}

export function canReopenTicket(member) {
  return isStaff(member);
}

export function canDeleteTicket(member) {
  return isStaff(member);
}

export function canManageTicket(member) {
  return isStaff(member);
}

export function canAlertTicket(member) {
  return isStaff(member);
}

export function isTicketCreator(member, ticket) {
  return member?.id === ticket?.creatorId;
}

export function canRequestClose(member, ticket) {
  if (!member || !ticket) return false;
  if (isStaff(member)) return true;
  if (isTicketCreator(member, ticket)) return true;
  if (ticket.participants?.includes(member.id)) return true;
  return false;
}
