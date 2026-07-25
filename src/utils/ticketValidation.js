import { ticketConfig } from '../config/tickets.js';
import { Ticket } from '../database/models/Ticket.js';
import { TicketBlacklist } from '../database/models/TicketBlacklist.js';
import { isMongoConnected } from '../services/mongodb.js';

export function isBlacklistActive(entry) {
  if (!entry || !entry.active) return false;
  if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) return false;
  return true;
}

export async function checkBlacklist(userId, departmentId) {
  if (!isMongoConnected()) return null;

  const globalEntry = await TicketBlacklist.findOne({
    userId,
    departmentId: 'global',
    active: true,
  });
  if (isBlacklistActive(globalEntry)) return globalEntry;

  if (departmentId) {
    const deptEntry = await TicketBlacklist.findOne({
      userId,
      departmentId,
      active: true,
    });
    if (isBlacklistActive(deptEntry)) return deptEntry;
  }

  return null;
}

export async function getActiveTicketCount(creatorId, departmentId, guild = null) {
  if (!isMongoConnected()) return 0;

  return Ticket.countDocuments({
    creatorId,
    departmentId,
    status: { $in: ['creating', 'open', 'closing'] },
  });
}

export async function getUserActiveTickets(creatorId, departmentId, guild = null) {
  if (!isMongoConnected()) return [];

  return Ticket.find({
    creatorId,
    departmentId,
    status: { $in: ['creating', 'open', 'closing'] },
  }).sort({ createdAt: -1 });
}

export function validateAnswerLength(answer, question) {
  if (!question) return { valid: true };
  const len = (answer || '').length;
  if (question.required && len === 0) {
    return { valid: false, error: `"${question.label}" is required.` };
  }
  if (!question.required && len === 0) return { valid: true };
  if (question.minimumLength && len < question.minimumLength) {
    return {
      valid: false,
      error: `"${question.label}" must be at least ${question.minimumLength} characters.`,
    };
  }
  if (question.maximumLength && len > question.maximumLength) {
    return {
      valid: false,
      error: `"${question.label}" must be at most ${question.maximumLength} characters.`,
    };
  }
  return { valid: true };
}

export function validateAllAnswers(answers, questions) {
  for (const q of questions) {
    if (!q.enabled) continue;
    const answer = answers[q.id] || '';
    const result = validateAnswerLength(answer, q);
    if (!result.valid) return result;
  }
  return { valid: true };
}

export function getDeptQuestionsForPage(departmentId, page) {
  const dept = ticketConfig.departments[departmentId];
  if (!dept) return [];
  return dept.questions
    .filter((q) => q.enabled && q.page === page)
    .sort((a, b) => a.order - b.order);
}

export function getTotalPages(departmentId) {
  const dept = ticketConfig.departments[departmentId];
  if (!dept) return 1;
  const pages = dept.questions.filter((q) => q.enabled).map((q) => q.page);
  return Math.max(...pages, 1);
}
