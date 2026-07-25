import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { Ticket } from '../database/models/Ticket.js';
import { ticketConfig } from '../config/tickets.js';
import { isMongoConnected } from './mongodb.js';

const BRAND = '#75CFF5';
const BRAND_RGB = '117,207,245';
const GREEN = '#57F287';
const ORANGE = '#FEE75C';
const RED = '#ED4245';
const PURPLE = '#9B59B6';
const BLURPLE = '#5865F2';
const GRAY = '#40444b';
const DARK = '#202225';
const CARD = '#2f3136';
const BG = '#1a1d23';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function fmtDate(d) {
  if (!d) return 'N/A';
  return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtShort(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtDay(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtDur(ms) {
  if (!ms || ms < 0) return 'N/A';
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

function fmtSize(b) {
  if (!b) return 'Unknown';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function isImg(a) {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(a.url || a.proxy_url || '');
}

function deptEmoji(id) {
  const d = ticketConfig.departments[id];
  return d?.emoji || '🎫';
}

function prioColor(p) {
  return { low: GREEN, medium: BRAND, high: ORANGE, urgent: RED }[p] || BRAND;
}

const actionConfig = {
  ticket_opened: { icon: '✅', color: GREEN, label: 'Ticket Created' },
  ticket_closed: { icon: '🔒', color: RED, label: 'Ticket Closed' },
  ticket_reopened: { icon: '🔓', color: GREEN, label: 'Ticket Reopened' },
  ticket_deleted: { icon: '🗑️', color: RED, label: 'Ticket Deleted' },
  ticket_claimed: { icon: '🙋', color: GREEN, label: 'Ticket Claimed' },
  ticket_unclaimed: { icon: '🙋', color: ORANGE, label: 'Ticket Unclaimed' },
  ticket_locked: { icon: '🔒', color: ORANGE, label: 'Ticket Locked' },
  ticket_unlocked: { icon: '🔓', color: GREEN, label: 'Ticket Unlocked' },
  department_moved: { icon: '🔀', color: PURPLE, label: 'Department Changed' },
  user_added: { icon: '👥', color: BRAND, label: 'Participant Added' },
  user_removed: { icon: '➖', color: RED, label: 'Participant Removed' },
  close_requested: { icon: '📋', color: ORANGE, label: 'Close Requested' },
  alert_sent: { icon: '🔔', color: ORANGE, label: 'Alert Sent' },
  role_pinged: { icon: '🔔', color: BRAND, label: 'Support Pinged' },
  messages_purged: { icon: '🧹', color: RED, label: 'Messages Purged' },
  channel_renamed: { icon: '✏️', color: BRAND, label: 'Channel Renamed' },
};

function buildAttachmentHtml(a) {
  const name = esc(a.name || 'Unknown');
  const size = fmtSize(a.size);
  const url = esc(a.url || '');
  if (isImg(a)) {
    return `<div class="att img-att"><img src="${url}" alt="${name}" loading="lazy" onerror="this.outerHTML='<div class=att-fallback>🖼️ <span>${name} · ${size}</span></div>'"><div class="att-meta">${name} · ${size}</div></div>`;
  }
  return `<div class="att file-att"><div class="att-icon">📄</div><div class="att-info"><div class="att-name">${name}</div><div class="att-size">${size}</div>${url ? `<a href="${url}" target="_blank" class="att-link">Open Attachment</a>` : ''}</div></div>`;
}

function buildReplyHtml(ref, msgs) {
  if (!ref?.messageId) return '';
  const rm = msgs.find((m) => m.id === ref.messageId);
  const who = rm ? esc(rm.author?.displayName || rm.author?.username || 'Unknown') : 'Unknown';
  const txt = rm ? esc((rm.content || '').slice(0, 300)) : 'Original message not available';
  return `<div class="reply-block"><div class="reply-bar"></div><div class="reply-inner"><span class="reply-who">Replying to ${who}:</span> <span class="reply-txt">"${txt}"</span></div></div>`;
}

function dateDivider(date) {
  return `<div class="date-divider"><div class="dd-line"></div><span class="dd-text">${fmtDay(date)}</span><div class="dd-line"></div></div>`;
}

function buildMsg(msg, i, msgs, staffIds) {
  const a = msg.author;
  const isBot = a?.bot;
  const isSys = msg.system || (msg.type !== 0 && msg.type !== undefined);
  const name = esc(a?.displayName || a?.username || 'Unknown');
  const av = a?.displayAvatarURL?.({ size: 64 }) || '';
  const ts = fmtShort(msg.timestamp);
  const content = esc(msg.content || '');
  const isStaff = staffIds.has(a?.id);

  const jumpLink = msg.id ? `<a href="#msg-${i}" class="msg-action" title="Jump here">🕒 Jump</a>` : '';

  if (isSys || isBot) {
    const sysTxt = esc(msg.content || 'System message');
    return `<div class="msg sys-msg" id="msg-${i}"><div class="msg-av sys-av">⚙️</div><div class="msg-body"><div class="msg-hdr"><span class="msg-name sys-name">Ticket System</span><span class="msg-ts">${ts}</span>${jumpLink}</div><div class="msg-txt sys-txt">${sysTxt}</div></div></div>`;
  }

  const badge = isStaff ? '<span class="badge badge-staff">STAFF</span>' : '';
  const edited = msg.editedTimestamp ? `<span class="edited">(edited)</span>` : '';
  const replyHtml = (msg.message_reference || msg.referenced_message) ? buildReplyHtml(msg.message_reference || {}, msgs) : '';
  const atts = msg.attachments?.size > 0 ? [...msg.attachments.values()].map(buildAttachmentHtml).join('') : '';
  const embeds = msg.embeds?.length > 0 ? msg.embeds.map((e) => {
    const t = e.title ? `<div class="emb-title">${esc(e.title)}</div>` : '';
    const d = e.description ? `<div class="emb-desc">${esc(e.description)}</div>` : '';
    const c = e.color ? `border-left-color:#${e.color.toString(16).padStart(6, '0')}` : '';
    return `<div class="emb-preview" style="${c}">${t}${d}</div>`;
  }).join('') : '';

  const accentClass = isStaff ? 'msg-staff' : 'msg-user';

  return `<div class="msg ${accentClass}" id="msg-${i}"><div class="msg-av">${av ? `<img src="${av}" width="40" height="40">` : `<div class="av-fb">${name.charAt(0)}</div>`}</div><div class="msg-body"><div class="msg-hdr"><span class="msg-name ${isStaff ? 'name-staff' : ''}">${name}</span>${badge}<span class="msg-ts">${ts}</span>${edited}${jumpLink}</div>${replyHtml}<div class="msg-txt">${content || '<em>[No text content]</em>'}</div>${atts}${embeds}</div></div>`;
}

function buildAuditHtml(history) {
  return (history || []).filter((h) => h.action !== 'message_recorded').map((h) => {
    const cfg = actionConfig[h.action] || { icon: '📋', color: GRAY, label: h.action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) };
    let detail = '';
    if (h.oldValue && h.newValue) detail = `<span class="audit-arrow">${esc(h.oldValue)} → ${esc(h.newValue)}</span>`;
    else if (h.newValue) detail = `<span class="audit-val">${esc(h.newValue)}</span>`;
    const reason = h.reason ? `<span class="audit-reason">"${esc(h.reason)}"</span>` : '';
    return `<div class="audit-card" style="border-left-color:${cfg.color}"><div class="audit-icon" style="color:${cfg.color}">${cfg.icon}</div><div class="audit-body"><div class="audit-title" style="color:${cfg.color}">${cfg.label}</div><div class="audit-meta">by ${esc(h.performedBy)}${reason ? ` - ${reason}` : ''} ${detail ? `<br>${detail}` : ''}</div><div class="audit-ts">${fmtDate(h.timestamp)}</div></div></div>`;
  }).join('');
}

function computeStats(ticket, messages, staffIds) {
  const total = messages.filter((m) => !m.author?.bot).length;
  const staff = messages.filter((m) => !m.author?.bot && staffIds.has(m.author?.id)).length;
  const user = total - staff;
  const duration = ticket.closedAt ? new Date(ticket.closedAt) - new Date(ticket.createdAt) : null;
  const firstResp = ticket.firstStaffResponseAt ? new Date(ticket.firstStaffResponseAt) - new Date(ticket.createdAt) : null;
  const participantSet = new Set();
  messages.forEach((m) => { if (!m.author?.bot) participantSet.add(m.author?.id); });
  if (ticket.creatorId) participantSet.add(ticket.creatorId);
  (ticket.participants || []).forEach((p) => participantSet.add(p));
  let imgCount = 0;
  let fileCount = 0;
  let editCount = 0;
  let mentionCount = 0;
  messages.forEach((m) => {
    if (m.attachments?.size) { m.attachments.forEach((a) => { if (isImg(a)) imgCount++; else fileCount++; }); }
    if (m.editedTimestamp) editCount++;
    const mc = m.content || '';
    mentionCount += (mc.match(/<@!?\d{17,20}>/g) || []).length;
    mentionCount += (mc.match(/<@&\d{17,20}>/g) || []).length;
  });
  return { total, staff, user, duration, firstResp, participants: participantSet.size, images: imgCount, files: fileCount, edits: editCount, mentions: mentionCount };
}

function buildHeader(ticket, dept, stats) {
  const statusColor = ticket.status === 'closed' ? RED : GREEN;
  return `
  <div class="header-card">
    <div class="hdr-brand">Caliber's Igloo</div>
    <div class="hdr-title">${deptEmoji(ticket.departmentId)} Ticket #${String(ticket.ticketId).padStart(4, '0')}</div>
    <div class="hdr-dept">${esc(dept?.name || ticket.departmentId)}</div>
    <div class="hdr-divider"></div>
    <div class="hdr-grid">
      <div class="hdr-col">
        <div class="hdr-row"><span class="hdr-label">Status</span><span class="hdr-val"><span class="status-dot" style="background:${statusColor}"></span> ${ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}</span></div>
        <div class="hdr-row"><span class="hdr-label">Created</span><span class="hdr-val">${fmtDate(ticket.createdAt)}</span></div>
        ${ticket.closedAt ? `<div class="hdr-row"><span class="hdr-label">Closed</span><span class="hdr-val">${fmtDate(ticket.closedAt)}</span></div>` : ''}
      </div>
      <div class="hdr-col">
        <div class="hdr-row"><span class="hdr-label">Opened By</span><span class="hdr-val">${esc(ticket.creatorTag || ticket.creatorId)}</span></div>
        ${ticket.closedBy ? `<div class="hdr-row"><span class="hdr-label">Closed By</span><span class="hdr-val">${esc(ticket.closedBy)}</span></div>` : ''}
        ${ticket.closeReason ? `<div class="hdr-row"><span class="hdr-label">Reason</span><span class="hdr-val reason-val">${esc(ticket.closeReason)}</span></div>` : ''}
      </div>
    </div>
    <div class="stats-row">
      <div class="stat"><div class="stat-n">${stats.total}</div><div class="stat-l">Messages</div></div>
      <div class="stat"><div class="stat-n">${stats.user}</div><div class="stat-l">User</div></div>
      <div class="stat"><div class="stat-n">${stats.staff}</div><div class="stat-l">Staff</div></div>
      <div class="stat"><div class="stat-n">${fmtDur(stats.firstResp)}</div><div class="stat-l">First Response</div></div>
      <div class="stat"><div class="stat-n">${fmtDur(stats.duration)}</div><div class="stat-l">Duration</div></div>
      <div class="stat"><div class="stat-n">${stats.participants}</div><div class="stat-l">Participants</div></div>
      <div class="stat"><div class="stat-n">${stats.images}</div><div class="stat-l">Images</div></div>
      <div class="stat"><div class="stat-n">${stats.edits}</div><div class="stat-l">Edits</div></div>
      <div class="stat"><div class="stat-n">${stats.mentions}</div><div class="stat-l">Mentions</div></div>
    </div>
  </div>`;
}

function buildToc(ticket, hasAnswers, hasAudit) {
  let items = '<a href="#timeline" class="toc-item">📋 Timeline</a>';
  if (hasAnswers) items += '<a href="#submitted" class="toc-item">📝 Submitted Information</a>';
  if (hasAudit) items += '<a href="#audit" class="toc-item">📜 Audit Log</a>';
  items += '<a href="#messages" class="toc-item">💬 Messages</a>';
  return `<div class="toc"><div class="toc-title">Quick Navigation</div><div class="toc-links">${items}</div></div>`;
}

function buildTimeline(ticket, history) {
  const events = (history || []).filter((h) => h.action !== 'message_recorded').map((h) => {
    const cfg = actionConfig[h.action] || { icon: '📋', color: GRAY, label: h.action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) };
    return `<div class="tl-item"><div class="tl-dot" style="background:${cfg.color}"></div><div class="tl-time">${fmtShort(h.timestamp)}</div><div class="tl-content"><span class="tl-icon">${cfg.icon}</span> ${cfg.label}${h.performedBy ? `<span class="tl-by"> by ${esc(h.performedBy)}</span>` : ''}</div></div>`;
  });

  if (ticket.createdAt) {
    events.unshift(`<div class="tl-item"><div class="tl-dot" style="background:${GREEN}"></div><div class="tl-time">${fmtShort(ticket.createdAt)}</div><div class="tl-content"><span class="tl-icon">🎟️</span> Ticket Created</div></div>`);
  }

  return `<div class="timeline">${events.join('')}</div>`;
}

function buildFullHtml(ticket, messages, guild, staff) {
  const dept = ticketConfig.departments[ticket.departmentId];
  const staffIds = new Set([...ticketConfig.staffRoles, ...ticketConfig.managementRoles]);
  const stats = computeStats(ticket, messages, staffIds);

  const msgList = staff ? messages : messages.filter((m) => {
    if (m.system) return false;
    const c = (m.content || '').toLowerCase();
    return !c.includes('[internal]') && !c.includes('[staff-note]');
  });

  const hasAnswers = (ticket.answers || []).length > 0;
  const hasAudit = (ticket.history || []).some((h) => h.action !== 'message_recorded');

  const answersHtml = (ticket.answers || []).map((a) => `<div class="qa-card"><div class="qa-q">${esc(a.question || a.questionId)}</div><div class="qa-a">${esc(a.answer || 'No answer')}</div></div>`).join('');

  let lastDate = '';
  const msgHtml = msgList.map((m, i) => {
    const d = new Date(m.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    let divider = '';
    if (d !== lastDate) { divider = dateDivider(m.timestamp); lastDate = d; }
    return divider + buildMsg(m, i, msgList, staffIds);
  }).join('');

  const auditHtml = staff ? buildAuditHtml(ticket.history) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ticket #${String(ticket.ticketId).padStart(4, '0')} Transcript</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:${BG};color:#dcddde;font-family:'gg sans','Noto Sans','Helvetica Neue',Helvetica,Arial,sans-serif;line-height:1.5}
.w{max-width:900px;margin:0 auto;padding:24px 20px}
a{color:${BRAND};text-decoration:none}a:hover{text-decoration:underline}

.search-bar{position:sticky;top:0;z-index:100;background:${BG};padding:10px 0 14px;border-bottom:1px solid ${GRAY}}
.search-input{width:100%;padding:10px 16px 10px 40px;background:${CARD};border:1px solid ${GRAY};border-radius:8px;color:#dcddde;font-size:14px;outline:none}
.search-input:focus{border-color:${BRAND}}
.search-wrap{position:relative}
.search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#72767d;font-size:16px}
.search-count{color:#72767d;font-size:12px;margin-top:4px}

.header-card{background:${CARD};border-radius:12px;padding:28px 32px;margin-bottom:24px;border-left:5px solid ${BRAND}}
.hdr-brand{color:${BRAND};font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:2px}
.hdr-title{color:#fff;font-size:26px;font-weight:700}
.hdr-dept{color:#b9bbbe;font-size:14px;margin-bottom:12px}
.hdr-divider{height:1px;background:${GRAY};margin-bottom:16px}
.hdr-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 40px}
.hdr-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(64,68,75,0.5)}
.hdr-label{color:#b9bbbe;font-size:13px}
.hdr-val{color:#fff;font-size:13px;text-align:right}
.reason-val{font-size:12px;max-width:260px;text-align:right}
.status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px}

.stats-row{display:flex;gap:12px;margin-top:20px;padding-top:16px;border-top:1px solid ${GRAY};flex-wrap:wrap}
.stat{background:${DARK};border-radius:8px;padding:10px 14px;min-width:80px;text-align:center}
.stat-n{color:#fff;font-size:18px;font-weight:700}
.stat-l{color:#b9bbbe;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-top:2px}

.toc{background:${CARD};border-radius:10px;padding:16px 20px;margin-bottom:24px}
.toc-title{color:${BRAND};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
.toc-links{display:flex;gap:16px;flex-wrap:wrap}
.toc-item{color:#b9bbbe;font-size:13px;padding:4px 10px;background:${DARK};border-radius:6px;transition:background .15s}
.toc-item:hover{background:${GRAY};text-decoration:none;color:#fff}

.timeline{position:relative;padding-left:24px;margin-bottom:28px}
.timeline::before{content:'';position:absolute;left:8px;top:0;bottom:0;width:2px;background:${GRAY}}
.tl-item{position:relative;padding:6px 0 6px 20px;display:flex;align-items:center;gap:12px}
.tl-dot{position:absolute;left:-20px;width:12px;height:12px;border-radius:50%;border:2px solid ${BG}}
.tl-time{color:#72767d;font-size:12px;min-width:60px}
.tl-content{color:#dcddde;font-size:13px}
.tl-icon{margin-right:4px}
.tl-by{color:#72767d}

.sec-title{color:${BRAND};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin:28px 0 12px;padding-bottom:8px;border-bottom:1px solid ${GRAY}}

.qa-card{background:${CARD};border-radius:10px;padding:16px 20px;margin-bottom:10px;border-left:3px solid ${BRAND}}
.qa-q{color:${BRAND};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px}
.qa-a{color:#dcddde;font-size:14px;white-space:pre-wrap;word-break:break-word;line-height:1.5}

.msg{display:flex;gap:16px;padding:8px 12px;margin-bottom:2px;border-radius:6px;transition:background .1s}
.msg:hover{background:#32353b}
.msg.msg-user{border-left:3px solid transparent}
.msg.msg-user:hover{border-left-color:rgba(${BRAND_RGB},0.3)}
.msg.msg-staff{border-left:3px solid ${GREEN}}
.msg.sys-msg{border-left:3px solid ${GRAY};opacity:.75}
.msg-av img{width:40px;height:40px;border-radius:50%}
.av-fb{width:40px;height:40px;border-radius:50%;background:${BLURPLE};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:17px}
.sys-av{width:40px;height:40px;border-radius:50%;background:${GRAY};display:flex;align-items:center;justify-content:center;font-size:18px}
.msg-body{flex:1;min-width:0}
.msg-hdr{display:flex;align-items:baseline;gap:6px;margin-bottom:2px;flex-wrap:wrap}
.msg-name{color:#fff;font-size:14px;font-weight:600}
.name-staff{color:${GREEN}}
.badge{font-size:9px;padding:1px 5px;border-radius:3px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;vertical-align:middle}
.badge-staff{background:rgba(87,242,135,.15);color:${GREEN}}
.msg-ts{color:#72767d;font-size:11px}
.edited{color:#72767d;font-size:10px;font-style:italic}
.msg-action{color:#72767d;font-size:10px;margin-left:6px;opacity:0;transition:opacity .15s}
.msg:hover .msg-action{opacity:1}
.msg-txt{color:#dcddde;font-size:14px;white-space:pre-wrap;word-break:break-word;line-height:1.45}
.sys-name{color:#b9bbbe}
.sys-txt{color:#b9bbbe;font-style:italic;font-size:13px}

.reply-block{display:flex;gap:8px;margin-bottom:4px;padding:4px 0}
.reply-bar{width:3px;background:${GRAY};border-radius:2px;flex-shrink:0}
.reply-inner{font-size:12px;color:#b9bbbe}
.reply-who{font-weight:600}
.reply-txt{font-style:italic}

.att{background:${CARD};border-radius:8px;padding:10px 14px;margin:6px 0;display:flex;align-items:center;gap:12px}
.img-att{flex-direction:column;align-items:flex-start}
.img-att img{max-width:100%;max-height:360px;border-radius:8px;object-fit:contain}
.att-icon{font-size:28px;flex-shrink:0}
.att-info{flex:1;min-width:0}
.att-name{color:#fff;font-size:13px;font-weight:600;word-break:break-all}
.att-size{color:#b9bbbe;font-size:11px}
.att-link{color:${BRAND};font-size:12px}
.att-meta{color:#72767d;font-size:11px;margin-top:4px}
.att-fallback{padding:8px;color:#b9bbbe;font-size:13px}

.emb-preview{background:${CARD};border-left:4px solid ${BLURPLE};border-radius:4px;padding:10px 14px;margin:6px 0}
.emb-title{color:#fff;font-size:14px;font-weight:600;margin-bottom:4px}
.emb-desc{color:#dcddde;font-size:13px}

.audit-card{display:flex;gap:12px;background:${CARD};border-radius:8px;padding:12px 16px;margin-bottom:8px;border-left:3px solid ${GRAY}}
.audit-icon{font-size:20px;flex-shrink:0;margin-top:2px}
.audit-body{flex:1}
.audit-title{font-size:13px;font-weight:700}
.audit-meta{color:#b9bbbe;font-size:12px;margin-top:2px}
.audit-reason{color:${ORANGE};font-style:italic}
.audit-arrow{color:#dcddde;font-size:12px}
.audit-val{color:#dcddde;font-size:12px}
.audit-ts{color:#72767d;font-size:11px;margin-top:4px}

.date-divider{display:flex;align-items:center;gap:12px;margin:16px 0 8px}
.dd-line{flex:1;height:1px;background:${GRAY}}
.dd-text{color:#72767d;font-size:11px;font-weight:600;white-space:nowrap}

.footer{text-align:center;color:#72767d;font-size:12px;margin-top:36px;padding-top:20px;border-top:1px solid ${GRAY};line-height:1.8}
.footer strong{color:#b9bbbe}

.match-highlight{background:rgba(${BRAND_RGB},0.3);border-radius:2px;padding:0 2px}

@media(max-width:640px){.hdr-grid{grid-template-columns:1fr}.stats-row{gap:8px}.stat{min-width:70px;padding:8px 10px}.toc-links{flex-direction:column}}
</style>
</head>
<body>
<div class="w">

  <div class="search-bar">
    <div class="search-wrap">
      <span class="search-icon">🔍</span>
      <input type="text" class="search-input" placeholder="Search transcript..." id="searchBox">
    </div>
    <div class="search-count" id="searchCount"></div>
  </div>

  ${buildHeader(ticket, dept, stats)}

  ${buildToc(ticket, hasAnswers, staff && hasAudit)}

  ${hasAnswers ? `<div class="sec-title" id="submitted">Submitted Information</div>${answersHtml}` : ''}

  ${staff && hasAudit ? `<div class="sec-title" id="audit">Audit Log</div>${buildTimeline(ticket, ticket.history)}<div style="margin-bottom:8px"></div>${auditHtml}` : ''}

  <div class="sec-title" id="messages">Messages</div>
  ${msgHtml || '<div style="color:#72767d;text-align:center;padding:24px">No messages recorded.</div>'}

  <div class="footer">
    <strong>Transcript generated by PENGUUU</strong><br>
    Generated on ${fmtDate(new Date())}<br>
    This transcript contains messages from Ticket #${String(ticket.ticketId).padStart(4, '0')}.<br>
    Do not publicly share private ticket information.
  </div>
</div>

<script>
(function(){
  const box=document.getElementById('searchBox');
  const count=document.getElementById('searchCount');
  if(!box)return;
  const msgs=document.querySelectorAll('.msg');
  box.addEventListener('input',function(){
    const q=this.value.toLowerCase().trim();
    let found=0;
    msgs.forEach(m=>{
      const txt=m.textContent.toLowerCase();
      m.querySelectorAll('.match-highlight').forEach(h=>h.outerHTML=h.textContent);
      if(!q){m.style.display='';return}
      if(txt.includes(q)){
        m.style.display='';
        found++;
        const body=m.querySelector('.msg-txt');
        if(body){
          const re=new RegExp('('+q.replace(/[.*+?^\$\{\}\(\)|[\\]\\\\]/g,'\\\\$&')+')','gi');
          body.innerHTML=body.textContent.replace(re,'<span class="match-highlight">$1</span>');
        }
      }else{
        m.style.display='none';
      }
    });
    count.textContent=q?found+' result'+(found!==1?'s':'')+' found':'';
  });
  document.addEventListener('keydown',function(e){
    if((e.ctrlKey||e.metaKey)&&e.key==='f'){e.preventDefault();box.focus();box.select();}
  });
})();
</script>
</body>
</html>`;
}

function buildFilename(ticket, dept) {
  const deptSlug = (dept?.name || ticket.departmentId).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const creatorSlug = (ticket.creatorTag || ticket.creatorId || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20);
  return `ticket-${String(ticket.ticketId).padStart(4, '0')}-${deptSlug}-${creatorSlug}.html`;
}

export async function generateTranscript(channel, { staff = true } = {}) {
  if (!isMongoConnected()) throw new Error('Database not connected');

  const ticket = await Ticket.findOne({ channelId: channel.id });
  if (!ticket) throw new Error('Ticket not found');

  const dept = ticketConfig.departments[ticket.departmentId];

  let messages = [];
  try {
    let fetched = [];
    let lastId = null;
    while (fetched.length < 500) {
      const batch = await channel.messages.fetch(lastId ? { limit: 100, before: lastId } : { limit: 100 });
      if (batch.size === 0) break;
      fetched.push(...batch.values());
      lastId = batch.last()?.id;
      if (batch.size < 100) break;
    }
    messages = fetched.reverse();
  } catch {
    messages = [];
  }

  const html = buildFullHtml(ticket, messages, channel.guild, staff);
  const buffer = Buffer.from(html, 'utf-8');
  const filename = buildFilename(ticket, dept);
  const attachment = new AttachmentBuilder(buffer, { name: filename });

  return { attachment, ticket, filename, messages };
}

export async function generateStaffTranscript(channel) {
  return generateTranscript(channel, { staff: true });
}

export async function generateUserTranscript(channel) {
  return generateTranscript(channel, { staff: false });
}

export async function sendTranscriptToLogChannel(guild, attachment, ticket) {
  const channelId = ticketConfig.transcriptChannelId || ticketConfig.logChannelId;
  if (!channelId) return null;

  const channel = guild.channels.cache.get(channelId);
  if (!channel) return null;

  const dept = ticketConfig.departments[ticket.departmentId];
  const embed = new EmbedBuilder()
    .setTitle(`📝 Transcript - Ticket #${String(ticket.ticketId).padStart(4, '0')}`)
    .setDescription(`${deptEmoji(ticket.departmentId)} ${dept?.name || ticket.departmentId}\nCreator: <@${ticket.creatorId}>`)
    .setColor(ticketConfig.colors.primary)
    .setTimestamp();

  const sent = await channel.send({ embeds: [embed], files: [attachment] }).catch(() => null);
  return sent;
}

export async function sendTranscriptDM(guild, creatorId, attachment, ticket) {
  let t = ticket;
  if (typeof ticket === 'number' || typeof ticket === 'string') {
    t = await Ticket.findOne({ ticketId: ticket });
    if (!t) return { delivered: false, reason: 'Ticket not found' };
  }

  const member = await guild.members.fetch(creatorId).catch(() => null);
  if (!member) return { delivered: false, reason: 'User not found in server' };

  const dept = ticketConfig.departments[t.departmentId];

  const embed = new EmbedBuilder()
    .setTitle('🔒 Your Ticket Has Been Closed')
    .setDescription(
      'Thank you for reaching out to **Caliber\'s Igloo** Support.\n\n' +
      'Your request has been marked as resolved.\n\n' +
      'We\'ve attached a full transcript of your conversation below for your records.\n' +
      'If you need anything else, feel free to open a new ticket - we\'re always happy to help!'
    )
    .addFields(
      { name: 'Ticket', value: `#${String(t.ticketId).padStart(4, '0')}`, inline: true },
      { name: 'Department', value: `${deptEmoji(t.departmentId)} ${dept?.name || t.departmentId}`, inline: true },
      { name: 'Closed By', value: t.closedBy || 'Unknown', inline: true },
      { name: 'Close Reason', value: (t.closeReason || 'No reason provided').slice(0, 1024), inline: false },
      { name: 'Opened', value: fmtDate(t.createdAt), inline: true },
      { name: 'Closed', value: fmtDate(t.closedAt), inline: true }
    )
    .setColor(0x75cff5)
    .setFooter({ text: 'Thank you for contacting Caliber\'s Igloo Support.' })
    .setTimestamp();

  const result = await member.send({ embeds: [embed], files: [attachment] }).catch((err) => ({ error: err }));
  if (result?.error) return { delivered: false, reason: 'User has DMs disabled or blocked the bot' };
  return { delivered: true };
}

export async function saveTranscriptInfo(ticketId, guild, filename, generatedBy, logMessageId, dmDelivered) {
  if (!isMongoConnected()) return;
  await Ticket.findOneAndUpdate({ ticketId }, {
    transcript: { generated: true, filename, generatedAt: new Date(), generatedBy, logMessageId: logMessageId || '', dmDelivered },
  });
}
