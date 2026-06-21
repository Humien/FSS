export type Role = "SystemAdmin" | "Manager" | "StandardUser" | "ReadOnly";
export type ThemeId = "dark-pro" | "light-pro" | "corporate-blue" | "emerald" | "purple";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string;
  entityIds: string[];
  createdAt: string;
}

export interface Entity {
  id: string;
  code: string;
  name: string;
}

export type WorkCategoryCode = "DOP" | "MEC" | "ADH" | "LTI";
export interface WorkCategory {
  id: string;
  code: WorkCategoryCode;
  name: string;
}

export interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
}

export type Priority = "Low" | "Medium" | "High" | "Critical";
export type Status = "Not Started" | "In Progress" | "Completed";
export type Frequency =
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Quarterly"
  | "Half Yearly"
  | "Yearly"
  | "One Time";

export type Weekday =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export type TaskPhase =
  | "Pre-Close"
  | "Day 1"
  | "Day 2"
  | "Day 3"
  | "Day 4"
  | "Day 5"
  | "Post-Close";

export interface SubTask {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
  parentId?: string | null;
}

export interface Attachment {
  id: string;
  taskId: string;
  name: string;
  size: number;
  mime: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Task {
  id: string;
  number: string;
  name: string;
  description?: string;
  categoryId: string;
  subCategoryId: string;
  entityId: string;
  ownerId: string;
  backup1Id?: string | null;
  backup2Id?: string | null;
  assigneeId?: string | null;
  recurrenceId?: string | null;
  priority: Priority;
  status: Status;
  frequency: Frequency;
  weeklyDay?: Weekday | null;
  phase?: TaskPhase | null;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  taskId?: string;
  actorId: string;
  action: string;
  detail: string;
  createdAt: string;
}

export type AvailabilityType = "Available" | "WFH" | "Leave" | "Training" | "Business Travel";
export interface Availability {
  id: string;
  userId: string;
  type: AvailabilityType;
  date: string;
  note?: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
}

export interface KnowledgeFolder {
  id: string;
  name: string;
  parentId?: string | null;
}
export interface KnowledgeArticle {
  id: string;
  folderId: string;
  code: string;
  title: string;
  currentVersion: string;
}
export interface KnowledgeVersion {
  id: string;
  articleId: string;
  version: string;
  body: string;
  authorId: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  taskId?: string;
}

export interface Favorite {
  id: string;
  userId: string;
  refType: "task" | "report" | "article" | "entity";
  refId: string;
  label: string;
}
