import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { addAccount, deleteAccountByUserId, defaultPasswordFor } from "./auth";
import {
  seedArticles,
  seedAttachments,
  seedAudit,
  seedAvailability,
  seedCategories,
  seedComments,
  seedEntities,
  seedFavorites,
  seedFolders,
  seedHolidays,
  seedNotifications,
  seedSubCategories,
  seedSubTasks,
  seedTasks,
  seedUsers,
  seedVersions,
} from "./seed";
import type {
  Attachment,
  AuditEntry,
  Availability,
  Comment,
  Entity,
  Favorite,
  Holiday,
  KnowledgeArticle,
  KnowledgeFolder,
  KnowledgeVersion,
  Notification,
  Status,
  SubCategory,
  SubTask,
  Task,
  User,
  Weekday,
  WorkCategory,
} from "./types";

const STORAGE_KEY = "fss:data:v1";

interface DataShape {
  users: User[];
  entities: Entity[];
  categories: WorkCategory[];
  subCategories: SubCategory[];
  tasks: Task[];
  subTasks: SubTask[];
  comments: Comment[];
  attachments: Attachment[];
  audit: AuditEntry[];
  availability: Availability[];
  holidays: Holiday[];
  folders: KnowledgeFolder[];
  articles: KnowledgeArticle[];
  versions: KnowledgeVersion[];
  notifications: Notification[];
  favorites: Favorite[];
}

function seed(): DataShape {
  const tasksWithAssignee = seedTasks.map((task) => ({
    ...task,
    assigneeId: resolveAssignee(task, seedAvailability, seedHolidays),
  }));

  return {
    users: seedUsers,
    entities: seedEntities,
    categories: seedCategories,
    subCategories: seedSubCategories,
    tasks: tasksWithAssignee,
    subTasks: seedSubTasks,
    comments: seedComments,
    attachments: seedAttachments,
    audit: seedAudit,
    availability: seedAvailability,
    holidays: seedHolidays,
    folders: seedFolders,
    articles: seedArticles,
    versions: seedVersions,
    notifications: seedNotifications,
    favorites: seedFavorites,
  };
}

function load(): DataShape {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DataShape;
  } catch {
    /* ignore */
  }
  const fresh = seed();
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    /* ignore */
  }
  return fresh;
}

function isAvailable(
  availability: Availability[],
  holidays: Holiday[],
  userId: string,
  date: string,
) {
  const parsed = new Date(date);
  if (isHoliday(holidays, parsed)) return false;
  const entry = availability.find((a) => a.userId === userId && a.date === date);
  if (!entry) return true;
  return entry.type === "Available" || entry.type === "WFH";
}

function resolveAssignee(
  task: Pick<Task, "ownerId" | "backup1Id" | "backup2Id" | "dueDate">,
  availability: Availability[],
  holidays: Holiday[],
) {
  const date = task.dueDate.slice(0, 10);
  if (isAvailable(availability, holidays, task.ownerId, date)) return task.ownerId;
  if (task.backup1Id && isAvailable(availability, holidays, task.backup1Id, date)) return task.backup1Id;
  if (task.backup2Id && isAvailable(availability, holidays, task.backup2Id, date)) return task.backup2Id;
  return task.ownerId;
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isHoliday(holidays: Holiday[], date: Date) {
  return holidays.some((h) => h.date === date.toISOString().slice(0, 10));
}

function isWorkingDay(date: Date, holidays: Holiday[]) {
  return !isWeekend(date) && !isHoliday(holidays, date);
}

function ensureWorkingDay(date: Date, holidays: Holiday[]) {
  const next = new Date(date);
  while (!isWorkingDay(next, holidays)) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

function previousMonth(year: number, month: number) {
  return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
}

function nextMonth(year: number, month: number) {
  return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
}

function getLastWorkingDayOfMonth(year: number, month: number, holidays: Holiday[]) {
  const date = new Date(year, month + 1, 0);
  while (!isWorkingDay(date, holidays)) {
    date.setDate(date.getDate() - 1);
  }
  return date;
}

function getNthWorkingDayOfMonth(year: number, month: number, n: number, holidays: Holiday[]) {
  const date = new Date(year, month, 1);
  let count = 0;
  while (true) {
    if (isWorkingDay(date, holidays)) count += 1;
    if (count === n) break;
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function getMecPhaseDueDate(referenceDate: string, phase: Task["phase"], holidays: Holiday[]) {
  const date = new Date(referenceDate);
  if (!phase) return new Date(referenceDate).toISOString();

  if (phase === "Pre-Close") {
    const year = date.getFullYear();
    const month = date.getMonth();
    return getLastWorkingDayOfMonth(year, month, holidays).toISOString();
  }

  const target = nextMonth(date.getFullYear(), date.getMonth());
  const n = phase === "Post-Close" ? 6 : Number(phase.replace("Day ", ""));
  return getNthWorkingDayOfMonth(target.year, target.month, n, holidays).toISOString();
}

function getNextDueDate(
  dueDate: string,
  frequency: Task["frequency"],
  holidays: Holiday[],
  weeklyDay?: Weekday | null,
) {
  const next = new Date(dueDate);
  switch (frequency) {
    case "Daily":
      next.setDate(next.getDate() + 1);
      break;
    case "Weekly": {
      if (!weeklyDay) {
        next.setDate(next.getDate() + 7);
        break;
      }
      const dayIndex = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ].indexOf(weeklyDay);
      next.setDate(next.getDate() + 1);
      while (next.getDay() !== dayIndex) {
        next.setDate(next.getDate() + 1);
      }
      break;
    }
    case "Monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "Quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "Half Yearly":
      next.setMonth(next.getMonth() + 6);
      break;
    case "Yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      return dueDate;
  }
  return ensureWorkingDay(next, holidays).toISOString();
}

function getCycleMonthYear(task: Task) {
  const due = new Date(task.dueDate);
  if (task.phase === "Pre-Close") {
    return { year: due.getFullYear(), month: due.getMonth() };
  }
  return previousMonth(due.getFullYear(), due.getMonth());
}

function getNextMecCycleDueDate(task: Task, holidays: Holiday[]) {
  const cycle = getCycleMonthYear(task);
  const nextCycle = nextMonth(cycle.year, cycle.month);
  if (task.phase === "Pre-Close") {
    return getLastWorkingDayOfMonth(nextCycle.year, nextCycle.month, holidays).toISOString();
  }
  const n = task.phase === "Post-Close" ? 6 : Number(task.phase?.replace("Day ", ""));
  return getNthWorkingDayOfMonth(nextCycle.year, nextCycle.month, n, holidays).toISOString();
}

function getNextTaskDueDate(task: Task, holidays: Holiday[]) {
  if (task.categoryId === "c-2" && task.phase) {
    return getNextMecCycleDueDate(task, holidays);
  }
  return getNextDueDate(task.dueDate, task.frequency, holidays, task.weeklyDay ?? null);
}

function createRecurringTask(
  task: Task,
  availability: Availability[],
  categories: WorkCategory[],
  holidays: Holiday[],
  dueDate?: string,
) {
  const nextDueDate = dueDate ?? getNextTaskDueDate(task, holidays);
  const category = categories.find((c) => c.id === task.categoryId);
  return {
    ...task,
    id: `t-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    number: task.number.replace(/-\d{6}$/, (match) => {
      const prefix = task.number.slice(0, -match.length);
      const seq = Number(match.slice(1)) + 1;
      return `-${seq.toString().padStart(6, "0")}`;
    }),
    status: "Not Started" as Status,
    dueDate: nextDueDate,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    assigneeId: resolveAssignee({
      ownerId: task.ownerId,
      backup1Id: task.backup1Id,
      backup2Id: task.backup2Id,
      dueDate: nextDueDate,
    }, availability, holidays),
    recurrenceId: task.recurrenceId ?? task.id,
    phase: task.phase,
  };
}

function synchronizeRecurringTasks(data: DataShape) {
  const tasks = [...data.tasks];
  const groups = new Map<string, Task[]>();

  for (const task of tasks) {
    if (task.frequency === "One Time") continue;
    const seriesId = task.recurrenceId ?? task.id;
    groups.set(seriesId, [...(groups.get(seriesId) ?? []), task]);
  }

  for (const [seriesId, group] of groups.entries()) {
    const latest = group.reduce((current, next) =>
      new Date(current.dueDate) > new Date(next.dueDate) ? current : next,
    );
    const nextDueDate = getNextTaskDueDate(latest, data.holidays);
    const alreadyExists = group.some(
      (task) => task.dueDate.slice(0, 10) === nextDueDate.slice(0, 10),
    );
    if (alreadyExists) continue;
    if (new Date(nextDueDate) <= new Date()) {
      tasks.push(
        createRecurringTask(latest, data.availability, data.categories, data.holidays, nextDueDate),
      );
    }
  }

  return { ...data, tasks };
}

interface StoreCtx {
  data: DataShape;
  reset: () => void;
  addTask: (
    input: Pick<
      Task,
      | "name"
      | "description"
      | "categoryId"
      | "subCategoryId"
      | "entityId"
      | "ownerId"
      | "backup1Id"
      | "backup2Id"
      | "priority"
      | "frequency"
      | "weeklyDay"
      | "phase"
      | "dueDate"
    >,
  ) => Task;
  updateTaskStatus: (taskId: string, status: Status) => void;
  updateTask: (taskId: string, patch: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  addEntity: (input: Pick<Entity, "code" | "name">) => Entity;
  updateEntity: (entityId: string, patch: Partial<Pick<Entity, "code" | "name">>) => void;
  deleteEntity: (entityId: string) => boolean;
  addCategory: (input: Pick<WorkCategory, "code" | "name">) => WorkCategory;
  updateCategory: (categoryId: string, patch: Partial<Pick<WorkCategory, "code" | "name">>) => boolean;
  deleteCategory: (categoryId: string) => boolean;
  addSubCategory: (input: Pick<SubCategory, "categoryId" | "name">) => SubCategory;
  updateSubCategory: (subCategoryId: string, patch: Partial<Pick<SubCategory, "name">>) => boolean;
  deleteSubCategory: (subCategoryId: string) => boolean;
  addUser: (input: Pick<User, "email" | "name" | "role" | "entityIds">) => User;
  updateUser: (userId: string, patch: Partial<Pick<User, "name" | "role" | "entityIds">>) => boolean;
  deleteUser: (userId: string) => boolean;
  addComment: (taskId: string, authorId: string, body: string) => void;
  toggleSubTask: (subTaskId: string) => void;
  addSubTask: (taskId: string, title: string) => void;
  addAttachment: (taskId: string, file: File, userId: string) => void;
  markNotificationRead: (id: string) => void;
  toggleFavorite: (
    userId: string,
    refType: Favorite["refType"],
    refId: string,
    label: string,
  ) => void;
  setAvailability: (userId: string, date: string, type: Availability["type"]) => void;
  addHoliday: (input: Pick<Holiday, "date" | "name">) => Holiday;
  deleteHoliday: (holidayId: string) => boolean;
  addArticleVersion: (articleId: string, body: string, authorId: string) => void;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DataShape>(() =>
    typeof window === "undefined" ? seed() : seed(),
  );

  useEffect(() => {
    setData(load());
  }, []);

  const persist = useCallback((next: DataShape) => {
    const normalized = synchronizeRecurringTasks(next);
    setData(normalized);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const value = useMemo<StoreCtx>(() => {
    const auditLog = (
      action: string,
      detail: string,
      actorId = "u-1",
      taskId?: string,
    ): AuditEntry => ({
      id: `au-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action,
      detail,
      actorId,
      taskId,
      createdAt: new Date().toISOString(),
    });

    return {
      data,
      reset: () => {
        if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
        persist(seed());
      },
      addTask: (input) => {
        const now = new Date().toISOString();
        const category = data.categories.find((c) => c.id === input.categoryId);
        const entity = data.entities.find((e) => e.id === input.entityId);
        const categoryCode = category?.code ?? "GEN";
        const entityCode = entity?.code ?? "ENT";
        const prefix = `FSS-${categoryCode}-${entityCode}-`;
        const seq =
          data.tasks
            .filter((t) => t.number.startsWith(prefix))
            .map((t) => Number(t.number.slice(prefix.length)))
            .filter(Number.isFinite)
            .reduce((max, n) => Math.max(max, n), 0) + 1;
        const id = `t-${Date.now()}`;
        const dueDate = new Date(input.dueDate).toISOString();
        const task: Task = {
          ...input,
          id,
          number: `${prefix}${seq.toString().padStart(6, "0")}`,
          status: "Not Started",
          dueDate,
          phase: input.phase ?? null,
          assigneeId: resolveAssignee({
            ownerId: input.ownerId,
            backup1Id: input.backup1Id,
            backup2Id: input.backup2Id,
            dueDate,
          }, data.availability, data.holidays),
          recurrenceId: input.frequency === "One Time" ? null : id,
          createdAt: now,
          updatedAt: now,
        };
        persist({
          ...data,
          tasks: [task, ...data.tasks],
          audit: [
            auditLog("TASK_CREATED", `Task ${task.number} created`, input.ownerId, task.id),
            ...data.audit,
          ],
        });
        return task;
      },
      updateTaskStatus: (taskId, status) => {
        const now = new Date().toISOString();
        const tasks = data.tasks.map((t) =>
          t.id === taskId ? { ...t, status, updatedAt: now } : t,
        );

        const task = data.tasks.find((t) => t.id === taskId);
        const recurringTasks: Task[] = [];

        if (task && task.status !== "Completed" && status === "Completed" && task.frequency !== "One Time") {
          const next = createRecurringTask(task, data.availability, data.categories);
          recurringTasks.push(next);
        }

        persist({
          ...data,
          tasks: [...tasks, ...recurringTasks],
          audit: [
            auditLog("STATUS_CHANGED", `Status → ${status}`, "u-1", taskId),
            ...recurringTasks.map((next) =>
              auditLog(
                "RECURRING_TASK_CREATED",
                `Recurring task ${next.number} generated for ${next.frequency}`,
                "u-1",
                next.id,
              ),
            ),
            ...data.audit,
          ],
        });
      },
      updateTask: (taskId, patch) => {
        const tasks = data.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const updated = { ...t, ...patch, updatedAt: new Date().toISOString() } as Task;
          if (
            "ownerId" in patch ||
            "backup1Id" in patch ||
            "backup2Id" in patch ||
            "dueDate" in patch ||
            updated.assigneeId == null
          ) {
            updated.assigneeId = resolveAssignee(updated, data.availability, data.holidays);
          }
          return updated;
        });
        persist({
          ...data,
          tasks,
          audit: [
            auditLog("TASK_UPDATED", Object.keys(patch).join(", "), "u-1", taskId),
            ...data.audit,
          ],
        });
      },
      deleteTask: (taskId) => {
        persist({
          ...data,
          tasks: data.tasks.filter((t) => t.id !== taskId),
          subTasks: data.subTasks.filter((s) => s.taskId !== taskId),
          comments: data.comments.filter((c) => c.taskId !== taskId),
          attachments: data.attachments.filter((a) => a.taskId !== taskId),
          audit: data.audit.filter((a) => a.taskId !== taskId),
          favorites: data.favorites.filter((f) => !(f.refType === "task" && f.refId === taskId)),
        });
      },
      addEntity: (input) => {
        const entity: Entity = {
          id: `e-${Date.now()}`,
          code: input.code,
          name: input.name,
        };
        persist({
          ...data,
          entities: [...data.entities, entity],
          audit: [auditLog("ENTITY_CREATED", `Entity ${entity.code} created`, "u-1"), ...data.audit],
        });
        return entity;
      },
      updateEntity: (entityId, patch) => {
        const entities = data.entities.map((e) =>
          e.id === entityId ? { ...e, ...patch } : e,
        );
        persist({
          ...data,
          entities,
          audit: [auditLog("ENTITY_UPDATED", `Entity ${entityId} updated`, "u-1"), ...data.audit],
        });
      },
      deleteEntity: (entityId) => {
        const usedByTask = data.tasks.some((t) => t.entityId === entityId);
        const usedByUser = data.users.some((u) => u.entityIds.includes(entityId));
        if (usedByTask || usedByUser) return false;
        persist({
          ...data,
          entities: data.entities.filter((e) => e.id !== entityId),
          audit: [auditLog("ENTITY_DELETED", `Entity ${entityId} deleted`, "u-1"), ...data.audit],
        });
        return true;
      },
      addCategory: (input) => {
        const category: WorkCategory = {
          id: `c-${Date.now()}`,
          code: input.code,
          name: input.name,
        };
        persist({
          ...data,
          categories: [...data.categories, category],
          audit: [auditLog("CATEGORY_CREATED", `Category ${category.code} created`, "u-1"), ...data.audit],
        });
        return category;
      },
      updateCategory: (categoryId, patch) => {
        const hasTasks = data.tasks.some((t) => t.categoryId === categoryId);
        if (patch.code && hasTasks) {
          return false;
        }
        const categories = data.categories.map((c) =>
          c.id === categoryId ? { ...c, ...patch } : c,
        );
        persist({
          ...data,
          categories,
          audit: [auditLog("CATEGORY_UPDATED", `Category ${categoryId} updated`, "u-1"), ...data.audit],
        });
        return true;
      },
      deleteCategory: (categoryId) => {
        const usedByTask = data.tasks.some((t) => t.categoryId === categoryId);
        const hasSubCategories = data.subCategories.some((s) => s.categoryId === categoryId);
        if (usedByTask || hasSubCategories) return false;
        persist({
          ...data,
          categories: data.categories.filter((c) => c.id !== categoryId),
          audit: [auditLog("CATEGORY_DELETED", `Category ${categoryId} deleted`, "u-1"), ...data.audit],
        });
        return true;
      },
      addSubCategory: (input) => {
        const subCategory: SubCategory = {
          id: `s-${Date.now()}`,
          categoryId: input.categoryId,
          name: input.name,
        };
        persist({
          ...data,
          subCategories: [...data.subCategories, subCategory],
          audit: [auditLog("SUBCATEGORY_CREATED", `Subcategory ${subCategory.name} created`, "u-1"), ...data.audit],
        });
        return subCategory;
      },
      updateSubCategory: (subCategoryId, patch) => {
        const subCategories = data.subCategories.map((s) =>
          s.id === subCategoryId ? { ...s, ...patch } : s,
        );
        persist({
          ...data,
          subCategories,
          audit: [auditLog("SUBCATEGORY_UPDATED", `Subcategory ${subCategoryId} updated`, "u-1"), ...data.audit],
        });
        return true;
      },
      deleteSubCategory: (subCategoryId) => {
        const usedByTask = data.tasks.some((t) => t.subCategoryId === subCategoryId);
        if (usedByTask) return false;
        persist({
          ...data,
          subCategories: data.subCategories.filter((s) => s.id !== subCategoryId),
          audit: [auditLog("SUBCATEGORY_DELETED", `Subcategory ${subCategoryId} deleted`, "u-1"), ...data.audit],
        });
        return true;
      },
      addUser: (input) => {
        const now = new Date().toISOString();
        const user: User = {
          id: `u-${Date.now()}`,
          email: input.email.toLowerCase(),
          name: input.name,
          role: input.role,
          entityIds: input.entityIds,
          createdAt: now,
        };
        persist({
          ...data,
          users: [...data.users, user],
          audit: [auditLog("USER_CREATED", `User ${user.email} created`, "u-1"), ...data.audit],
        });
        void addAccount(user.email, defaultPasswordFor(user.email), user.id);
        return user;
      },
      updateUser: (userId, patch) => {
        const exists = data.users.some((u) => u.id === userId);
        if (!exists) return false;
        const users = data.users.map((u) => (u.id === userId ? { ...u, ...patch } : u));
        persist({
          ...data,
          users,
          audit: [auditLog("USER_UPDATED", `User ${userId} updated`, "u-1"), ...data.audit],
        });
        return true;
      },
      deleteUser: (userId) => {
        const hasTask = data.tasks.some(
          (t) => t.ownerId === userId || t.backup1Id === userId || t.backup2Id === userId || t.assigneeId === userId,
        );
        if (hasTask) return false;
        deleteAccountByUserId(userId);
        persist({
          ...data,
          users: data.users.filter((u) => u.id !== userId),
          audit: [auditLog("USER_DELETED", `User ${userId} deleted`, "u-1"), ...data.audit],
        });
        return true;
      },
      addComment: (taskId, authorId, body) => {
        const c: Comment = {
          id: `cm-${Date.now()}`,
          taskId,
          authorId,
          body,
          createdAt: new Date().toISOString(),
          parentId: null,
        };
        persist({
          ...data,
          comments: [...data.comments, c],
          audit: [auditLog("COMMENT_ADDED", body.slice(0, 60), authorId, taskId), ...data.audit],
        });
      },
      toggleSubTask: (subTaskId) => {
        const subTasks = data.subTasks.map((s) =>
          s.id === subTaskId ? { ...s, done: !s.done } : s,
        );
        persist({ ...data, subTasks });
      },
      addSubTask: (taskId, title) => {
        const s: SubTask = { id: `st-${Date.now()}`, taskId, title, done: false };
        persist({ ...data, subTasks: [...data.subTasks, s] });
      },
      addAttachment: (taskId, file, userId) => {
        const a: Attachment = {
          id: `at-${Date.now()}`,
          taskId,
          name: file.name,
          size: file.size,
          mime: file.type,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
        };
        persist({
          ...data,
          attachments: [...data.attachments, a],
          audit: [auditLog("ATTACHMENT_ADDED", file.name, userId, taskId), ...data.audit],
        });
      },
      markNotificationRead: (id) => {
        persist({
          ...data,
          notifications: data.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        });
      },
      toggleFavorite: (userId, refType, refId, label) => {
        const existing = data.favorites.find(
          (f) => f.userId === userId && f.refType === refType && f.refId === refId,
        );
        const favorites = existing
          ? data.favorites.filter((f) => f.id !== existing.id)
          : [...data.favorites, { id: `fv-${Date.now()}`, userId, refType, refId, label }];
        persist({ ...data, favorites });
      },
      setAvailability: (userId, date, type) => {
        const existing = data.availability.find((a) => a.userId === userId && a.date === date);
        const availability = existing
          ? data.availability.map((a) => (a.id === existing.id ? { ...a, type } : a))
          : [...data.availability, { id: `av-${Date.now()}`, userId, date, type }];
        const tasks = data.tasks.map((task) => {
          if (task.dueDate.slice(0, 10) !== date) return task;
          const nextAssigneeId = resolveAssignee(task, availability, data.holidays);
          if (task.assigneeId === nextAssigneeId) return task;
          return { ...task, assigneeId: nextAssigneeId, updatedAt: new Date().toISOString() };
        });
        persist({ ...data, availability, tasks });
      },
      addHoliday: (input) => {
        const holiday: Holiday = {
          id: `h-${Date.now()}`,
          date: input.date,
          name: input.name,
        };
        persist({
          ...data,
          holidays: [...data.holidays, holiday],
          audit: [auditLog("HOLIDAY_CREATED", `Holiday ${holiday.name} added`, "u-1"), ...data.audit],
        });
        return holiday;
      },
      deleteHoliday: (holidayId) => {
        if (!data.holidays.some((h) => h.id === holidayId)) return false;
        persist({
          ...data,
          holidays: data.holidays.filter((h) => h.id !== holidayId),
          audit: [auditLog("HOLIDAY_DELETED", `Holiday ${holidayId} deleted`, "u-1"), ...data.audit],
        });
        return true;
      },
      addArticleVersion: (articleId, body, authorId) => {
        const article = data.articles.find((a) => a.id === articleId);
        if (!article) return;
        const [maj, min] = article.currentVersion.replace("v", "").split(".").map(Number);
        const next = `v${maj}.${(min ?? 0) + 1}`;
        const versions = [
          ...data.versions,
          {
            id: `v-${Date.now()}`,
            articleId,
            version: next,
            body,
            authorId,
            createdAt: new Date().toISOString(),
          },
        ];
        const articles = data.articles.map((a) =>
          a.id === articleId ? { ...a, currentVersion: next } : a,
        );
        persist({ ...data, articles, versions });
      },
    };
  }, [data, persist]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}
