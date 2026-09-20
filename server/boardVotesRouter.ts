import { TRPCError } from "@trpc/server";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";
import { getPool } from "./db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_MEETINGS = process.env.EMAIL_FROM_MEETINGS ?? "Synergie Dour Réunions <reunions@synergiedour.be>";
const APP_URL = process.env.APP_URL ?? "https://www.synergiedour.be";

let boardTablesReady = false;

async function ensureBoardTables() {
  if (boardTablesReady) return;
  const pool = await getPool();
  if (!pool) throw new Error("Database unavailable");

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS board_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NULL,
      fullName VARCHAR(255) NOT NULL,
      email VARCHAR(320) NOT NULL UNIQUE,
      roleTitle VARCHAR(120) NULL,
      isPresident TINYINT(1) NOT NULL DEFAULT 0,
      canCalendar TINYINT(1) NOT NULL DEFAULT 1,
      canVotes TINYINT(1) NOT NULL DEFAULT 1,
      canMinutes TINYINT(1) NOT NULL DEFAULT 1,
      active TINYINT(1) NOT NULL DEFAULT 1,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_board_member_user (userId),
      INDEX idx_board_member_active (active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS board_meetings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      meetingDate DATETIME NOT NULL,
      location VARCHAR(255) NULL,
      notes TEXT NULL,
      status ENUM('draft','open','closed') NOT NULL DEFAULT 'draft',
      consultationDays INT NOT NULL DEFAULT 3,
      createdBy INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_board_meeting_date (meetingDate),
      INDEX idx_board_meeting_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS board_agenda_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      meetingId INT NOT NULL,
      position INT NOT NULL DEFAULT 1,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      kind ENUM('information','discussion','vote','urgent') NOT NULL DEFAULT 'discussion',
      status ENUM('draft','open','closed') NOT NULL DEFAULT 'draft',
      consultationDeadline DATETIME NULL,
      outcome ENUM('pending','adopted','rejected','not_applicable') NOT NULL DEFAULT 'pending',
      closedAt DATETIME NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_board_agenda_meeting (meetingId),
      INDEX idx_board_agenda_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS board_attendance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      meetingId INT NOT NULL,
      memberId INT NOT NULL,
      attendance ENUM('pending','present','represented','absent','excused') NOT NULL DEFAULT 'pending',
      proxyMemberId INT NULL,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_board_attendance (meetingId, memberId),
      INDEX idx_board_attendance_meeting (meetingId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS board_votes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      agendaItemId INT NOT NULL,
      memberId INT NOT NULL,
      choice ENUM('for','against','abstain') NOT NULL,
      phase ENUM('official','deferred') NOT NULL,
      source ENUM('self','proxy','admin') NOT NULL DEFAULT 'self',
      castByUserId INT NULL,
      castByMemberId INT NULL,
      castAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_board_vote (agendaItemId, memberId),
      INDEX idx_board_vote_item (agendaItemId),
      INDEX idx_board_vote_member (memberId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS board_minutes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      meetingId INT NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      content MEDIUMTEXT NOT NULL,
      status ENUM('draft','published') NOT NULL DEFAULT 'draft',
      publishedAt DATETIME NULL,
      updatedBy INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_board_minutes_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS board_reminder_log (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      meetingId INT NOT NULL,
      memberId INT NOT NULL,
      reminderType ENUM('d3','day0') NOT NULL,
      sentAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_board_reminder (meetingId, memberId, reminderType)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS board_vote_audit (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      action VARCHAR(100) NOT NULL,
      entityType VARCHAR(60) NOT NULL,
      entityId INT NULL,
      actorUserId INT NULL,
      payload JSON NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_board_audit_entity (entityType, entityId),
      INDEX idx_board_audit_created (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const permissionColumns = [
    ["canCalendar", "TINYINT(1) NOT NULL DEFAULT 1"],
    ["canVotes", "TINYINT(1) NOT NULL DEFAULT 1"],
    ["canMinutes", "TINYINT(1) NOT NULL DEFAULT 1"],
  ] as const;
  for (const [column, definition] of permissionColumns) {
    try {
      await pool.execute(`ALTER TABLE board_members ADD COLUMN \`${column}\` ${definition}`);
    } catch (error: any) {
      if (!String(error?.message || "").toLowerCase().includes("duplicate column")) throw error;
    }
  }

  boardTablesReady = true;
}

function cleanText(value: unknown, max = 255) {
  return String(value ?? "").trim().slice(0, max);
}

function asId(value: unknown, label = "Identifiant") {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${label} invalide` });
  }
  return id;
}

function asChoice(value: unknown): "for" | "against" | "abstain" {
  if (value === "for" || value === "against" || value === "abstain") return value;
  throw new TRPCError({ code: "BAD_REQUEST", message: "Choix de vote invalide" });
}

function toMysqlDate(value: unknown, label = "Date") {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${label} invalide` });
  }
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function deadlineFromMeeting(meetingDate: unknown, days = 3) {
  const date = new Date(meetingDate instanceof Date ? meetingDate : String(meetingDate ?? ""));
  if (Number.isNaN(date.getTime())) throw new Error("Date de réunion invalide");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 19).replace("T", " ");
}

async function audit(action: string, entityType: string, entityId: number | null, actorUserId: number | null, payload?: any) {
  const pool = await getPool();
  if (!pool) return;
  await pool.execute(
    "INSERT INTO board_vote_audit (action, entityType, entityId, actorUserId, payload) VALUES (?, ?, ?, ?, ?)",
    [action, entityType, entityId, actorUserId, payload === undefined ? null : JSON.stringify(payload)],
  );
}

function permissionSnapshot(member: any) {
  return {
    canCalendar: Number(member?.canCalendar) === 1,
    canVotes: Number(member?.canVotes) === 1,
    canMinutes: Number(member?.canMinutes) === 1,
  };
}

function requireMemberPermission(member: any, key: "canCalendar" | "canVotes" | "canMinutes") {
  if (!member || Number(member[key]) !== 1) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Accès non autorisé par l'administrateur" });
  }
}

async function findBoardMemberForUser(user: any) {
  await ensureBoardTables();
  const pool = await getPool();
  if (!pool) return null;
  const email = String(user?.email || "").trim().toLowerCase();
  const [rows] = await pool.execute(
    `SELECT * FROM board_members
     WHERE active=1 AND ((userId IS NOT NULL AND userId=?) OR LOWER(email)=?)
     ORDER BY CASE WHEN userId=? THEN 0 ELSE 1 END, id ASC LIMIT 1`,
    [user?.id ?? 0, email, user?.id ?? 0],
  );
  return (rows as any[])[0] || null;
}

async function boardSnapshot() {
  await ensureBoardTables();
  const pool = await getPool();
  if (!pool) throw new Error("Database unavailable");

  const [memberRows] = await pool.execute("SELECT * FROM board_members ORDER BY active DESC, isPresident DESC, fullName ASC");
  const [meetingRows] = await pool.execute("SELECT * FROM board_meetings ORDER BY meetingDate DESC, id DESC");
  const [itemRows] = await pool.execute("SELECT * FROM board_agenda_items ORDER BY meetingId DESC, position ASC, id ASC");
  const [attendanceRows] = await pool.execute("SELECT * FROM board_attendance ORDER BY meetingId DESC, memberId ASC");
  const [voteRows] = await pool.execute("SELECT * FROM board_votes ORDER BY agendaItemId DESC, memberId ASC");

  const members = memberRows as any[];
  const meetings = meetingRows as any[];
  const items = itemRows as any[];
  const attendance = attendanceRows as any[];
  const votes = voteRows as any[];

  const activeMembers = members.filter((m) => Number(m.active) === 1);
  const now = Date.now();

  const hydratedMeetings = meetings.map((meeting) => {
    const meetingAttendance = attendance.filter((a) => Number(a.meetingId) === Number(meeting.id));
    const presentCount = meetingAttendance.filter((a) => a.attendance === "present").length;
    const representedCount = meetingAttendance.filter((a) => a.attendance === "represented").length;
    const absentCount = meetingAttendance.filter((a) => a.attendance === "absent" || a.attendance === "excused").length;
    const quorumRequired = Math.ceil(activeMembers.length / 2);
    const quorumReached = presentCount >= quorumRequired;

    const agenda = items
      .filter((item) => Number(item.meetingId) === Number(meeting.id))
      .map((item) => {
        const itemVotes = votes.filter((vote) => Number(vote.agendaItemId) === Number(item.id));
        const officialVotes = itemVotes.filter((vote) => vote.phase === "official");
        const deferredVotes = itemVotes.filter((vote) => vote.phase === "deferred");
        const counts = (rows: any[]) => ({
          for: rows.filter((v) => v.choice === "for").length,
          against: rows.filter((v) => v.choice === "against").length,
          abstain: rows.filter((v) => v.choice === "abstain").length,
        });

        const deferredEligibleIds = meetingAttendance
          .filter((a) => a.attendance === "absent" || a.attendance === "excused")
          .map((a) => Number(a.memberId));
        const deferredVotedIds = new Set(deferredVotes.map((v) => Number(v.memberId)));
        const deadlineMs = item.consultationDeadline ? new Date(item.consultationDeadline).getTime() : 0;
        const pendingDeferred = deferredEligibleIds.filter((id) => !deferredVotedIds.has(id) && (!deadlineMs || now <= deadlineMs)).length;
        const nullDeferred = deferredEligibleIds.filter((id) => !deferredVotedIds.has(id) && deadlineMs && now > deadlineMs).length;

        return {
          ...item,
          votes: itemVotes,
          official: counts(officialVotes),
          deferred: counts(deferredVotes),
          pendingDeferred,
          nullDeferred,
        };
      });

    return {
      ...meeting,
      attendance: meetingAttendance,
      agenda,
      stats: {
        activeBoardMembers: activeMembers.length,
        present: presentCount,
        represented: representedCount,
        absent: absentCount,
        quorumRequired,
        quorumReached,
      },
    };
  });

  return { members, meetings: hydratedMeetings };
}

async function resolveVoteContext(itemId: number, memberId: number) {
  await ensureBoardTables();
  const pool = await getPool();
  if (!pool) throw new Error("Database unavailable");
  const [rows] = await pool.execute(
    `SELECT
       i.*, m.meetingDate, m.status AS meetingStatus, m.consultationDays,
       a.attendance, a.proxyMemberId
     FROM board_agenda_items i
     JOIN board_meetings m ON m.id=i.meetingId
     LEFT JOIN board_attendance a ON a.meetingId=i.meetingId AND a.memberId=?
     WHERE i.id=? LIMIT 1`,
    [memberId, itemId],
  );
  const context = (rows as any[])[0];
  if (!context) throw new TRPCError({ code: "NOT_FOUND", message: "Point d'ordre du jour introuvable" });
  return context;
}

function votePhaseForAttendance(context: any, allowAdminProxy = false): "official" | "deferred" {
  if (context.status !== "open") {
    throw new TRPCError({ code: "CONFLICT", message: "Le vote n'est pas ouvert" });
  }
  if (context.kind !== "vote" && context.kind !== "urgent") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Ce point n'est pas soumis au vote" });
  }

  if (context.attendance === "present") return "official";
  if (context.attendance === "represented") {
    if (allowAdminProxy) return "official";
    throw new TRPCError({ code: "FORBIDDEN", message: "Votre voix est exercée via la procuration enregistrée" });
  }
  if (context.attendance === "absent" || context.attendance === "excused") {
    if (!context.consultationDeadline) {
      throw new TRPCError({ code: "CONFLICT", message: "Aucune consultation différée n'est ouverte" });
    }
    if (Date.now() > new Date(context.consultationDeadline).getTime()) {
      throw new TRPCError({ code: "CONFLICT", message: "Le délai de 3 jours est expiré : réponse non exprimée / nulle" });
    }
    return "deferred";
  }

  throw new TRPCError({ code: "CONFLICT", message: "La présence doit être enregistrée avant le vote" });
}

export const boardVotesRouter = router({
  snapshot: adminProcedure.query(async () => boardSnapshot()),

  myAccess: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "admin" || ctx.user.role === "super_admin") {
      return { isBoardMember: true, isAdmin: true, canCalendar: true, canVotes: true, canMinutes: true };
    }
    const member = await findBoardMemberForUser(ctx.user);
    if (!member) return { isBoardMember: false, isAdmin: false, canCalendar: false, canVotes: false, canMinutes: false };
    return { isBoardMember: true, isAdmin: false, ...permissionSnapshot(member) };
  }),

  myCalendar: protectedProcedure.query(async ({ ctx }) => {
    await ensureBoardTables();
    const pool = await getPool();
    const isAdmin = ctx.user.role === "admin" || ctx.user.role === "super_admin";
    const member = isAdmin ? null : await findBoardMemberForUser(ctx.user);
    if (!isAdmin) requireMemberPermission(member, "canCalendar");
    const [rows] = await pool.execute(
      `SELECT id, title, meetingDate, location, status, consultationDays
       FROM board_meetings
       WHERE meetingDate >= DATE_SUB(NOW(), INTERVAL 60 DAY)
       ORDER BY meetingDate ASC`
    );
    return { member, meetings: rows as any[] };
  }),

  myMinutes: protectedProcedure.query(async ({ ctx }) => {
    await ensureBoardTables();
    const pool = await getPool();
    const isAdmin = ctx.user.role === "admin" || ctx.user.role === "super_admin";
    const member = isAdmin ? null : await findBoardMemberForUser(ctx.user);
    if (!isAdmin) requireMemberPermission(member, "canMinutes");
    const where = isAdmin ? "" : "WHERE mn.status='published'";
    const [rows] = await pool.execute(
      `SELECT mn.*, m.title AS meetingTitle, m.meetingDate, m.location
       FROM board_minutes mn JOIN board_meetings m ON m.id=mn.meetingId
       ${where}
       ORDER BY m.meetingDate DESC`
    );
    return rows as any[];
  }),

  saveMinutes: adminProcedure.input((value: any) => value ?? {}).mutation(async ({ input, ctx }) => {
    await ensureBoardTables();
    const pool = await getPool();
    const meetingId = asId(input.meetingId, "Réunion");
    const title = cleanText(input.title, 255) || "Procès-verbal";
    const content = cleanText(input.content, 60000);
    const status = input.status === "published" ? "published" : "draft";
    if (!content) throw new TRPCError({ code: "BAD_REQUEST", message: "Le contenu du PV est requis" });
    await pool.execute(
      `INSERT INTO board_minutes (meetingId, title, content, status, publishedAt, updatedBy)
       VALUES (?, ?, ?, ?, IF(?='published',NOW(),NULL), ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), content=VALUES(content), status=VALUES(status),
         publishedAt=IF(VALUES(status)='published',COALESCE(publishedAt,NOW()),NULL), updatedBy=VALUES(updatedBy)`,
      [meetingId, title, content, status, status, ctx.user.id]
    );
    await audit("minutes_saved", "board_meeting", meetingId, ctx.user.id, { status });
    return { success: true };
  }),

  myQueue: protectedProcedure.query(async ({ ctx }) => {
    await ensureBoardTables();
    const pool = await getPool();
    if (!pool) throw new Error("Database unavailable");
    const member = await findBoardMemberForUser(ctx.user);
    if (!member) return { member: null, items: [] };
    requireMemberPermission(member, "canVotes");

    const [rows] = await pool.execute(
      `SELECT
         i.id, i.meetingId, i.position, i.title, i.description, i.kind, i.status,
         i.consultationDeadline, i.outcome,
         m.title AS meetingTitle, m.meetingDate, m.location,
         a.attendance, a.proxyMemberId,
         v.choice, v.phase, v.castAt
       FROM board_agenda_items i
       JOIN board_meetings m ON m.id=i.meetingId
       LEFT JOIN board_attendance a ON a.meetingId=i.meetingId AND a.memberId=?
       LEFT JOIN board_votes v ON v.agendaItemId=i.id AND v.memberId=?
       WHERE i.kind IN ('vote','urgent')
       ORDER BY m.meetingDate DESC, i.position ASC`,
      [member.id, member.id],
    );

    const items = (rows as any[]).map((row) => {
      let phase: "official" | "deferred" | null = null;
      let canVote = false;
      let state = "closed";

      if (row.status === "open") {
        if (row.attendance === "present") {
          phase = "official";
          canVote = true;
          state = "official_open";
        } else if (row.attendance === "represented") {
          state = "represented";
        } else if (row.attendance === "absent" || row.attendance === "excused") {
          phase = "deferred";
          const deadline = row.consultationDeadline ? new Date(row.consultationDeadline).getTime() : 0;
          if (deadline && Date.now() <= deadline) {
            canVote = true;
            state = "deferred_open";
          } else {
            state = row.choice ? "deferred_voted" : "non_expressed_null";
          }
        } else {
          state = "attendance_pending";
        }
      }

      if (row.choice) {
        canVote = row.status === "open" && state !== "represented" && state !== "non_expressed_null";
        state = row.phase === "official" ? "official_voted" : "deferred_voted";
      }

      return { ...row, phase, canVote, state };
    });

    return { member, items };
  }),

  upsertMember: adminProcedure
    .input((value: any) => value ?? {})
    .mutation(async ({ input, ctx }) => {
      await ensureBoardTables();
      const pool = await getPool();
      if (!pool) throw new Error("Database unavailable");

      const id = input.id ? asId(input.id) : null;
      const fullName = cleanText(input.fullName, 255);
      const email = cleanText(input.email, 320).toLowerCase();
      const roleTitle = cleanText(input.roleTitle, 120) || null;
      const isPresident = input.isPresident ? 1 : 0;
      const canCalendar = input.canCalendar === false ? 0 : 1;
      const canVotes = input.canVotes === false ? 0 : 1;
      const canMinutes = input.canMinutes === false ? 0 : 1;
      if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nom et email valides requis" });
      }

      const [userRows] = await pool.execute("SELECT id FROM users WHERE LOWER(email)=? LIMIT 1", [email]);
      const userId = Number((userRows as any[])[0]?.id || 0) || null;

      if (isPresident) {
        await pool.execute("UPDATE board_members SET isPresident=0 WHERE active=1");
      }

      if (id) {
        await pool.execute(
          "UPDATE board_members SET fullName=?, email=?, roleTitle=?, isPresident=?, canCalendar=?, canVotes=?, canMinutes=?, userId=?, active=1 WHERE id=?",
          [fullName, email, roleTitle, isPresident, canCalendar, canVotes, canMinutes, userId, id],
        );
        await audit("member_updated", "board_member", id, ctx.user.id, { fullName, email, roleTitle, isPresident: !!isPresident, canCalendar: !!canCalendar, canVotes: !!canVotes, canMinutes: !!canMinutes });
        return { id };
      }

      const [result] = await pool.execute(
        `INSERT INTO board_members (userId, fullName, email, roleTitle, isPresident, canCalendar, canVotes, canMinutes, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           userId=VALUES(userId), fullName=VALUES(fullName), roleTitle=VALUES(roleTitle),
           isPresident=VALUES(isPresident), canCalendar=VALUES(canCalendar), canVotes=VALUES(canVotes),
           canMinutes=VALUES(canMinutes), active=1`,
        [userId, fullName, email, roleTitle, isPresident, canCalendar, canVotes, canMinutes],
      );
      const insertedId = Number((result as any).insertId || 0);
      const [row] = await pool.execute("SELECT id FROM board_members WHERE email=? LIMIT 1", [email]);
      const memberId = insertedId || Number((row as any[])[0]?.id);
      await audit("member_saved", "board_member", memberId, ctx.user.id, { fullName, email, roleTitle, isPresident: !!isPresident, canCalendar: !!canCalendar, canVotes: !!canVotes, canMinutes: !!canMinutes });
      return { id: memberId };
    }),

  deactivateMember: adminProcedure
    .input((value: any) => ({ id: asId(value?.id ?? value) }))
    .mutation(async ({ input, ctx }) => {
      await ensureBoardTables();
      const pool = await getPool();
      await pool.execute("UPDATE board_members SET active=0, isPresident=0 WHERE id=?", [input.id]);
      await audit("member_deactivated", "board_member", input.id, ctx.user.id);
      return { success: true };
    }),

  createMeeting: adminProcedure
    .input((value: any) => value ?? {})
    .mutation(async ({ input, ctx }) => {
      await ensureBoardTables();
      const pool = await getPool();
      const title = cleanText(input.title, 255);
      if (!title) throw new TRPCError({ code: "BAD_REQUEST", message: "Titre de réunion requis" });
      const meetingDate = toMysqlDate(input.meetingDate, "Date de réunion");
      const location = cleanText(input.location, 255) || null;
      const notes = cleanText(input.notes, 5000) || null;
      const [result] = await pool.execute(
        "INSERT INTO board_meetings (title, meetingDate, location, notes, consultationDays, createdBy) VALUES (?, ?, ?, ?, 3, ?)",
        [title, meetingDate, location, notes, ctx.user.id],
      );
      const meetingId = Number((result as any).insertId);
      const [members] = await pool.execute("SELECT id FROM board_members WHERE active=1");
      for (const member of members as any[]) {
        await pool.execute(
          "INSERT IGNORE INTO board_attendance (meetingId, memberId, attendance) VALUES (?, ?, 'pending')",
          [meetingId, member.id],
        );
      }
      await audit("meeting_created", "board_meeting", meetingId, ctx.user.id, { title, meetingDate, consultationDays: 3 });
      return { id: meetingId };
    }),

  updateMeetingStatus: adminProcedure
    .input((value: any) => value ?? {})
    .mutation(async ({ input, ctx }) => {
      await ensureBoardTables();
      const id = asId(input.id);
      const status = input.status;
      if (status !== "draft" && status !== "open" && status !== "closed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Statut de réunion invalide" });
      }
      const pool = await getPool();
      await pool.execute("UPDATE board_meetings SET status=? WHERE id=?", [status, id]);
      await audit("meeting_status", "board_meeting", id, ctx.user.id, { status });
      return { success: true };
    }),

  addAgendaItem: adminProcedure
    .input((value: any) => value ?? {})
    .mutation(async ({ input, ctx }) => {
      await ensureBoardTables();
      const pool = await getPool();
      const meetingId = asId(input.meetingId, "Réunion");
      const title = cleanText(input.title, 255);
      const description = cleanText(input.description, 10000) || null;
      const kind = ["information", "discussion", "vote", "urgent"].includes(input.kind) ? input.kind : "discussion";
      if (!title) throw new TRPCError({ code: "BAD_REQUEST", message: "Titre du point requis" });
      const [positionRows] = await pool.execute("SELECT COALESCE(MAX(position),0)+1 AS nextPos FROM board_agenda_items WHERE meetingId=?", [meetingId]);
      const position = Number((positionRows as any[])[0]?.nextPos || 1);
      const [result] = await pool.execute(
        "INSERT INTO board_agenda_items (meetingId, position, title, description, kind) VALUES (?, ?, ?, ?, ?)",
        [meetingId, position, title, description, kind],
      );
      const itemId = Number((result as any).insertId);
      await audit("agenda_item_created", "board_agenda_item", itemId, ctx.user.id, { meetingId, title, kind });
      return { id: itemId };
    }),

  setAttendance: adminProcedure
    .input((value: any) => value ?? {})
    .mutation(async ({ input, ctx }) => {
      await ensureBoardTables();
      const pool = await getPool();
      const meetingId = asId(input.meetingId, "Réunion");
      const memberId = asId(input.memberId, "Membre");
      const attendance = input.attendance;
      if (!["pending", "present", "represented", "absent", "excused"].includes(attendance)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Présence invalide" });
      }
      let proxyMemberId: number | null = null;
      if (attendance === "represented") {
        proxyMemberId = asId(input.proxyMemberId, "Mandataire");
        if (proxyMemberId === memberId) throw new TRPCError({ code: "BAD_REQUEST", message: "Un membre ne peut pas être son propre mandataire" });
        const [proxyRows] = await pool.execute(
          "SELECT COUNT(*) AS cnt FROM board_attendance WHERE meetingId=? AND attendance='represented' AND proxyMemberId=? AND memberId<>?",
          [meetingId, proxyMemberId, memberId]
        );
        if (Number((proxyRows as any[])[0]?.cnt || 0) >= 3) {
          throw new TRPCError({ code: "CONFLICT", message: "Ce mandataire détient déjà trois procurations" });
        }
      }
      await pool.execute(
        `INSERT INTO board_attendance (meetingId, memberId, attendance, proxyMemberId)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE attendance=VALUES(attendance), proxyMemberId=VALUES(proxyMemberId)`,
        [meetingId, memberId, attendance, proxyMemberId],
      );
      await audit("attendance_set", "board_meeting", meetingId, ctx.user.id, { memberId, attendance, proxyMemberId });
      return { success: true };
    }),

  openAgendaVote: adminProcedure
    .input((value: any) => ({ id: asId(value?.id ?? value, "Point") }))
    .mutation(async ({ input, ctx }) => {
      await ensureBoardTables();
      const pool = await getPool();
      const [rows] = await pool.execute(
        `SELECT i.*, m.meetingDate, m.consultationDays
         FROM board_agenda_items i JOIN board_meetings m ON m.id=i.meetingId
         WHERE i.id=? LIMIT 1`,
        [input.id],
      );
      const item = (rows as any[])[0];
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Point introuvable" });
      if (item.kind !== "vote" && item.kind !== "urgent") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ce point n'est pas de type vote" });
      }
      const deadline = deadlineFromMeeting(item.meetingDate, 3);
      await pool.execute(
        "UPDATE board_agenda_items SET status='open', consultationDeadline=?, outcome='pending', closedAt=NULL WHERE id=?",
        [deadline, input.id],
      );
      await pool.execute("UPDATE board_meetings SET status='open' WHERE id=?", [item.meetingId]);
      await audit("vote_opened", "board_agenda_item", input.id, ctx.user.id, { consultationDeadline: deadline, deferredDays: 3 });
      return { success: true, consultationDeadline: deadline };
    }),

  closeAgendaVote: adminProcedure
    .input((value: any) => value ?? {})
    .mutation(async ({ input, ctx }) => {
      await ensureBoardTables();
      const id = asId(input.id, "Point");
      const outcome = ["adopted", "rejected", "not_applicable"].includes(input.outcome) ? input.outcome : "pending";
      const pool = await getPool();
      await pool.execute(
        "UPDATE board_agenda_items SET status='closed', outcome=?, closedAt=NOW() WHERE id=?",
        [outcome, id],
      );
      await audit("vote_closed", "board_agenda_item", id, ctx.user.id, { outcome });
      return { success: true };
    }),

  recordVote: adminProcedure
    .input((value: any) => value ?? {})
    .mutation(async ({ input, ctx }) => {
      await ensureBoardTables();
      const itemId = asId(input.itemId, "Point");
      const memberId = asId(input.memberId, "Membre");
      const choice = asChoice(input.choice);
      const context = await resolveVoteContext(itemId, memberId);
      const phase = votePhaseForAttendance(context, true);
      const source = context.attendance === "represented" ? "proxy" : "admin";
      const castByMemberId = context.attendance === "represented" ? Number(context.proxyMemberId || 0) || null : null;
      const pool = await getPool();
      await pool.execute(
        `INSERT INTO board_votes (agendaItemId, memberId, choice, phase, source, castByUserId, castByMemberId, castAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE choice=VALUES(choice), phase=VALUES(phase), source=VALUES(source),
           castByUserId=VALUES(castByUserId), castByMemberId=VALUES(castByMemberId), castAt=NOW()`,
        [itemId, memberId, choice, phase, source, ctx.user.id, castByMemberId],
      );
      await audit("vote_recorded_admin", "board_agenda_item", itemId, ctx.user.id, { memberId, choice, phase, source });
      return { success: true, phase };
    }),

  castMyVote: protectedProcedure
    .input((value: any) => value ?? {})
    .mutation(async ({ input, ctx }) => {
      await ensureBoardTables();
      const member = await findBoardMemberForUser(ctx.user);
      if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "Votre compte n'est pas associé à l'Organe d'Administration" });
      requireMemberPermission(member, "canVotes");
      const itemId = asId(input.itemId, "Point");
      const choice = asChoice(input.choice);
      const context = await resolveVoteContext(itemId, member.id);
      const phase = votePhaseForAttendance(context, false);
      const pool = await getPool();
      await pool.execute(
        `INSERT INTO board_votes (agendaItemId, memberId, choice, phase, source, castByUserId, castAt)
         VALUES (?, ?, ?, ?, 'self', ?, NOW())
         ON DUPLICATE KEY UPDATE choice=VALUES(choice), phase=VALUES(phase), source='self',
           castByUserId=VALUES(castByUserId), castByMemberId=NULL, castAt=NOW()`,
        [itemId, member.id, choice, phase, ctx.user.id],
      );
      await audit("vote_cast", "board_agenda_item", itemId, ctx.user.id, { memberId: member.id, choice, phase });
      return { success: true, phase };
    }),
});


function brusselsNowParts() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const values = Object.fromEntries(formatter.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour || 0),
    minute: Number(values.minute || 0),
  };
}

function brusselsDate(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function minusCalendarDays(iso: string, days: number) {
  const [y,m,d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0,10);
}

function meetingTimeLabel(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-BE", { timeZone: "Europe/Brussels", hour: "2-digit", minute: "2-digit" });
}

function meetingDateLabel(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-BE", { timeZone: "Europe/Brussels", weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

export async function runBoardMeetingReminders() {
  try {
    await ensureBoardTables();
    if (!process.env.RESEND_API_KEY) {
      console.warn("[BOARD REMINDERS] RESEND_API_KEY absente");
      return;
    }
    const now = brusselsNowParts();
    if (now.hour < 9) return;

    const pool = await getPool();
    if (!pool) return;
    const [meetings] = await pool.execute(
      "SELECT id, title, meetingDate, location FROM board_meetings WHERE status<>'closed' AND meetingDate BETWEEN DATE_SUB(NOW(), INTERVAL 1 DAY) AND DATE_ADD(NOW(), INTERVAL 4 DAY)"
    );

    for (const meeting of meetings as any[]) {
      const meetingDate = brusselsDate(meeting.meetingDate);
      const type = now.date === meetingDate ? "day0" : now.date === minusCalendarDays(meetingDate, 3) ? "d3" : null;
      if (!type) continue;

      const [members] = await pool.execute(
        "SELECT id, fullName, email FROM board_members WHERE active=1 AND canCalendar=1 AND email IS NOT NULL AND email<>''"
      );
      for (const member of members as any[]) {
        const [existing] = await pool.execute(
          "SELECT id FROM board_reminder_log WHERE meetingId=? AND memberId=? AND reminderType=? LIMIT 1",
          [meeting.id, member.id, type]
        );
        if ((existing as any[]).length) continue;

        const when = `${meetingDateLabel(meeting.meetingDate)} à ${meetingTimeLabel(meeting.meetingDate)}`;
        const subject = type === "d3"
          ? `Rappel J-3 — ${meeting.title}`
          : `Aujourd'hui — ${meeting.title}`;
        const html = `<!doctype html><html lang="fr"><body style="font-family:Arial,sans-serif;color:#1f2937;background:#f5f6f8;padding:24px">
          <div style="max-width:620px;margin:auto;background:white;border-radius:14px;padding:28px;border:1px solid #e5e7eb">
            <h2 style="color:#001a3d;margin-top:0">${type === "d3" ? "Rappel de réunion du Conseil" : "Réunion du Conseil aujourd'hui"}</h2>
            <p>Bonjour ${member.fullName},</p>
            <p>La réunion <strong>${meeting.title}</strong> est prévue <strong>${when}</strong>.</p>
            ${meeting.location ? `<p><strong>Lieu :</strong> ${meeting.location}</p>` : ""}
            <p>Retrouvez l'ordre du jour, les votes et les documents autorisés depuis votre espace Conseil & Votes.</p>
            <p style="margin-top:24px"><a href="${APP_URL}/dashboard/board" style="background:#D4AF37;color:#001a3d;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Ouvrir Conseil & Votes</a></p>
            <p style="font-size:12px;color:#64748b;margin-top:28px">Synergie Dour ASBL · Rappel automatique</p>
          </div></body></html>`;

        const result = await resend.emails.send({ from: FROM_MEETINGS, to: member.email, subject, html });
        if ((result as any).error) {
          console.error("[BOARD REMINDERS] email", member.email, (result as any).error);
          continue;
        }
        await pool.execute(
          "INSERT IGNORE INTO board_reminder_log (meetingId, memberId, reminderType) VALUES (?, ?, ?)",
          [meeting.id, member.id, type]
        );
      }
    }
  } catch (error) {
    console.error("[BOARD REMINDERS]", error);
  }
}
