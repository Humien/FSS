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
  Priority,
  Status,
  SubCategory,
  SubTask,
  Task,
  User,
  WorkCategory,
} from "./types";

const uid = (p: string, n: number) => `${p}-${n.toString().padStart(4, "0")}`;
const today = new Date();
const addDays = (d: number) => {
  const x = new Date(today);
  x.setDate(x.getDate() + d);
  return x.toISOString();
};

export const seedUsers: User[] = [
  { id: "u-1", email: "admin@fss.local", name: "Alex Morgan", role: "SystemAdmin", entityIds: ["e-1", "e-2", "e-3", "e-4", "e-5", "e-6"], createdAt: addDays(-200) },
  { id: "u-2", email: "manager@fss.local", name: "Priya Sharma", role: "Manager", entityIds: ["e-1", "e-4"], createdAt: addDays(-180) },
  { id: "u-3", email: "user@fss.local", name: "Marco Rossi", role: "StandardUser", entityIds: ["e-5"], createdAt: addDays(-160) },
  { id: "u-4", email: "viewer@fss.local", name: "Sofia Müller", role: "ReadOnly", entityIds: ["e-1"], createdAt: addDays(-140) },
  { id: "u-5", email: "thomas@fss.local", name: "Thomas Becker", role: "StandardUser", entityIds: ["e-1"], createdAt: addDays(-120) },
  { id: "u-6", email: "amelie@fss.local", name: "Amelie Dubois", role: "StandardUser", entityIds: ["e-3"], createdAt: addDays(-110) },
  { id: "u-7", email: "raj@fss.local", name: "Raj Patel", role: "Manager", entityIds: ["e-4"], createdAt: addDays(-100) },
  { id: "u-8", email: "lucia@fss.local", name: "Lucía García", role: "StandardUser", entityIds: ["e-6"], createdAt: addDays(-90) },
];

export const seedEntities: Entity[] = [
  { id: "e-1", code: "GER", name: "Germany" },
  { id: "e-2", code: "UK", name: "United Kingdom" },
  { id: "e-3", code: "FRA", name: "France" },
  { id: "e-4", code: "IND", name: "India" },
  { id: "e-5", code: "ITA", name: "Italy" },
  { id: "e-6", code: "ESP", name: "Spain" },
];

export const seedCategories: WorkCategory[] = [
  { id: "c-1", code: "DOP", name: "Daily Operations" },
  { id: "c-2", code: "MEC", name: "Month-End Closing" },
  { id: "c-3", code: "ADH", name: "Ad-Hoc Requests" },
  { id: "c-4", code: "LTI", name: "Long-Term Initiatives" },
];

export const seedSubCategories: SubCategory[] = [
  { id: "s-1", categoryId: "c-1", name: "Coupa" },
  { id: "s-2", categoryId: "c-1", name: "Bank Postings" },
  { id: "s-3", categoryId: "c-1", name: "Vendor Master" },
  { id: "s-4", categoryId: "c-1", name: "Payments" },
  { id: "s-5", categoryId: "c-1", name: "Invoice Processing" },
  { id: "s-6", categoryId: "c-2", name: "FCRS" },
  { id: "s-7", categoryId: "c-2", name: "Blackline" },
  { id: "s-8", categoryId: "c-2", name: "Reconciliations" },
  { id: "s-9", categoryId: "c-2", name: "Asset Accounting" },
  { id: "s-10", categoryId: "c-2", name: "Intercompany" },
  { id: "s-11", categoryId: "c-2", name: "Reporting" },
  { id: "s-12", categoryId: "c-3", name: "General" },
  { id: "s-13", categoryId: "c-4", name: "Bank Automation" },
  { id: "s-14", categoryId: "c-4", name: "Power BI" },
  { id: "s-15", categoryId: "c-4", name: "Process Improvement" },
  { id: "s-16", categoryId: "c-4", name: "System Migration" },
  { id: "s-17", categoryId: "c-4", name: "RPA" },
];

const TASK_NAMES: Record<string, string[]> = {
  "c-1": [
    "Process Coupa requisitions",
    "Post overnight bank statements",
    "Update vendor master records",
    "Release payment proposal",
    "Scan and code supplier invoices",
    "Review duplicate invoice exceptions",
  ],
  "c-2": [
    "Run FCRS package upload",
    "Complete Blackline reconciliations",
    "GL account reconciliation",
    "Asset depreciation run",
    "Intercompany matching & netting",
    "Submit MEC reporting deliverable",
  ],
  "c-3": [
    "Auditor request: PO sample 2024-Q3",
    "Treasury cash forecast input",
    "Ad-hoc vendor refund analysis",
  ],
  "c-4": [
    "Bank automation rollout — phase 2",
    "Build Power BI close dashboard",
    "Document Coupa process improvements",
    "SAP S/4 migration cutover plan",
    "RPA bot: invoice routing",
  ],
};

const priorities: Priority[] = ["Low", "Medium", "High", "Critical"];
const statuses: Status[] = ["Not Started", "In Progress", "Completed"];

export const seedTasks: Task[] = (() => {
  const out: Task[] = [];
  const ownerIds = seedUsers.filter((u) => u.role !== "ReadOnly").map((u) => u.id);
  const seqByKey: Record<string, number> = {};
  let id = 1;
  for (const cat of seedCategories) {
    const names = TASK_NAMES[cat.id] ?? ["Generic task"];
    for (let i = 0; i < 14; i++) {
      const entity = seedEntities[(i + cat.id.charCodeAt(0)) % seedEntities.length];
      const subs = seedSubCategories.filter((s) => s.categoryId === cat.id);
      const sub = subs[i % subs.length];
      const owner = ownerIds[(i + cat.id.length) % ownerIds.length];
      const priority = priorities[(i * 3) % priorities.length];
      const status = statuses[(i + cat.id.charCodeAt(1)) % statuses.length];
      const dueOffset = ((i * 7) % 21) - 7;
      const key = `${cat.code}-${entity.code}`;
      seqByKey[key] = (seqByKey[key] ?? 0) + 1;
      const num = `FSS-${cat.code}-${entity.code}-${seqByKey[key].toString().padStart(6, "0")}`;
      const created = addDays(-30 - (id % 30));
      out.push({
        id: `t-${id++}`,
        number: num,
        name: `${names[i % names.length]} — ${entity.code}`,
        description: `Standard operating procedure for ${names[i % names.length].toLowerCase()} in ${entity.name}.`,
        categoryId: cat.id,
        subCategoryId: sub.id,
        entityId: entity.id,
        ownerId: owner,
        priority,
        status,
        frequency: cat.code === "MEC" ? "Monthly" : cat.code === "DOP" ? "Daily" : cat.code === "LTI" ? "One Time" : "One Time",
        dueDate: addDays(dueOffset),
        createdAt: created,
        updatedAt: created,
      });
    }
  }
  return out;
})();

// Add a deterministic MEC test task to assist UI verification
(() => {
  const extra: Task = {
    id: `t-extra-1`,
    number: `FSS-MEC-TEST-000001`,
    name: `MEC Test Task — ITA`,
    description: `Automated seed task for MEC phase verification.`,
    categoryId: "c-2",
    subCategoryId: "s-8",
    entityId: "e-5",
    ownerId: "u-5",
    priority: "Medium",
    status: "Not Started",
    frequency: "Monthly",
    phase: "Day 2",
    dueDate: new Date(2026, 6, 3).toISOString(),
    createdAt: addDays(-1),
    updatedAt: addDays(-1),
  } as Task;
  // push near the start so it appears in lists
  (seedTasks as Task[]).unshift(extra);
})();

export const seedSubTasks: SubTask[] = seedTasks.slice(0, 30).flatMap((t, i) => [
  { id: uid("st", i * 3 + 1), taskId: t.id, title: "Download source file", done: true },
  { id: uid("st", i * 3 + 2), taskId: t.id, title: "Validate data integrity", done: t.status !== "Not Started" },
  { id: uid("st", i * 3 + 3), taskId: t.id, title: "Upload to target system", done: t.status === "Completed" },
]);

export const seedComments: Comment[] = seedTasks.slice(0, 12).map((t, i) => ({
  id: uid("cm", i + 1),
  taskId: t.id,
  authorId: seedUsers[(i + 1) % seedUsers.length].id,
  body:
    i % 2 === 0
      ? "Reviewed the source file — looks clean. Proceeding to next step."
      : "@Priya Sharma flagging an exception on row 142, please advise.",
  createdAt: addDays(-1),
  parentId: null,
}));

export const seedAttachments: Attachment[] = seedTasks.slice(0, 6).map((t, i) => ({
  id: uid("at", i + 1),
  taskId: t.id,
  name: `evidence-${t.number}.xlsx`,
  size: 240_000 + i * 12_000,
  mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  uploadedBy: t.ownerId,
  uploadedAt: addDays(-2),
}));

export const seedAudit: AuditEntry[] = seedTasks.slice(0, 20).map((t, i) => ({
  id: uid("au", i + 1),
  taskId: t.id,
  actorId: t.ownerId,
  action: "TASK_CREATED",
  detail: `Task ${t.number} created`,
  createdAt: t.createdAt,
}));

export const seedAvailability: Availability[] = seedUsers.flatMap((u, i) =>
  [-2, -1, 0, 1, 2].map((d, j) => ({
    id: uid("av", i * 10 + j),
    userId: u.id,
    type: j === 1 && i % 3 === 0 ? "WFH" : j === 2 && i % 4 === 0 ? "Leave" : "Available",
    date: addDays(d).slice(0, 10),
  })),
);

export const seedFolders: KnowledgeFolder[] = [
  { id: "f-1", name: "Daily Operations", parentId: null },
  { id: "f-2", name: "Month-End Close", parentId: null },
  { id: "f-3", name: "Coupa SOPs", parentId: "f-1" },
  { id: "f-4", name: "Reconciliations", parentId: "f-2" },
];

export const seedArticles: KnowledgeArticle[] = [
  { id: "a-1", folderId: "f-3", code: "AI021", title: "Coupa Requisition Approval", currentVersion: "v2.0" },
  { id: "a-2", folderId: "f-4", code: "AI104", title: "GL Reconciliation Standard", currentVersion: "v1.1" },
  { id: "a-3", folderId: "f-2", code: "AI220", title: "FCRS Package Upload", currentVersion: "v1.0" },
];

export const seedVersions: KnowledgeVersion[] = [
  { id: "v-1", articleId: "a-1", version: "v1.0", body: "Initial Coupa SOP.", authorId: "u-1", createdAt: addDays(-90) },
  { id: "v-2", articleId: "a-1", version: "v1.1", body: "Added screenshots.", authorId: "u-1", createdAt: addDays(-60) },
  { id: "v-3", articleId: "a-1", version: "v2.0", body: "Reworked for new Coupa UI. Use this version going forward.", authorId: "u-2", createdAt: addDays(-10) },
  { id: "v-4", articleId: "a-2", version: "v1.0", body: "Standard reconciliation procedure.", authorId: "u-1", createdAt: addDays(-80) },
  { id: "v-5", articleId: "a-2", version: "v1.1", body: "Added Blackline cross-reference.", authorId: "u-2", createdAt: addDays(-15) },
  { id: "v-6", articleId: "a-3", version: "v1.0", body: "FCRS upload checklist.", authorId: "u-1", createdAt: addDays(-30) },
];

export const seedNotifications: Notification[] = [
  { id: "n-1", userId: "u-1", type: "TASK_ASSIGNED", title: "New task assigned", body: "FSS-MEC-GER-000001 is now yours.", read: false, createdAt: addDays(-1), taskId: "t-15" },
  { id: "n-2", userId: "u-1", type: "DUE_TODAY", title: "Due today", body: "3 tasks due today.", read: false, createdAt: addDays(0) },
  { id: "n-3", userId: "u-1", type: "OVERDUE", title: "Overdue", body: "FSS-DOP-IND-000002 is overdue.", read: true, createdAt: addDays(-2), taskId: "t-3" },
];

export const seedHolidays: Holiday[] = [
  { id: "h-1", date: "2026-01-01", name: "New Year's Day" },
  { id: "h-2", date: "2026-07-04", name: "Independence Day" },
  { id: "h-3", date: "2026-12-25", name: "Christmas Day" },
];

export const seedFavorites: Favorite[] = [
  { id: "fv-1", userId: "u-1", refType: "task", refId: "t-1", label: "FSS-DOP-GER-000001" },
  { id: "fv-2", userId: "u-1", refType: "article", refId: "a-1", label: "Coupa Requisition SOP" },
  { id: "fv-3", userId: "u-1", refType: "report", refId: "exec", label: "Executive Dashboard" },
];
