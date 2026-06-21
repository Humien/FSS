import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth, addAccount } from "@/lib/auth";
import { Eye, EyeOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { useTheme, THEMES } from "@/lib/theme";
import type { Entity, Holiday, Role, SubCategory, User, WorkCategory } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, updateProfile, hasRole } = useAuth();
  const {
    data,
    reset,
    addEntity,
    updateEntity,
    deleteEntity,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubCategory,
    updateSubCategory,
    deleteSubCategory,
    addUser,
    updateUser,
    deleteUser,
    addHoliday,
    deleteHoliday,
  } = useStore();
  const { resetPasswordForUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(user?.name ?? "");
  const [newEntityOpen, setNewEntityOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [entityCode, setEntityCode] = useState("");
  const [entityName, setEntityName] = useState("");
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<WorkCategory | null>(null);
  const [categoryCode, setCategoryCode] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [newSubCategoryOpen, setNewSubCategoryOpen] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [subCategoryCategoryId, setSubCategoryCategoryId] = useState("");
  const [subCategoryName, setSubCategoryName] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [editingUserEmail, setEditingUserEmail] = useState("");
  const [editingUserName, setEditingUserName] = useState("");
  const [editingUserRole, setEditingUserRole] = useState<Role>("StandardUser");
  const [editingUserEntityIds, setEditingUserEntityIds] = useState<string[]>([]);
  const [editingUserPassword, setEditingUserPassword] = useState("");
  const [editingUserPasswordVisible, setEditingUserPasswordVisible] = useState(false);
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const isAdmin = hasRole("SystemAdmin");
  const canManageUsers = isAdmin || hasRole("Manager");

  function resetEntityForm() {
    setEntityCode("");
    setEntityName("");
    setEditingEntity(null);
  }

  function startEditEntity(entity: Entity) {
    setEditingEntity(entity);
    setEntityCode(entity.code);
    setEntityName(entity.name);
    setNewEntityOpen(true);
  }

  function handleSaveEntity() {
    const code = entityCode.trim().toUpperCase();
    const name = entityName.trim();
    if (!code || !name) {
      toast.error("Entity code and name are required");
      return;
    }
    if (editingEntity) {
      updateEntity(editingEntity.id, { code, name });
      toast.success("Entity updated");
    } else {
      addEntity({ code, name });
      toast.success("Entity added");
    }
    setNewEntityOpen(false);
    resetEntityForm();
  }

  function handleDeleteEntity(id: string) {
    if (!deleteEntity(id)) {
      toast.error("Cannot delete entity while it is still in use");
      return;
    }
    toast.success("Entity deleted");
  }

  function resetCategoryForm() {
    setCategoryCode("");
    setCategoryName("");
    setEditingCategory(null);
  }

  function startEditCategory(category: WorkCategory) {
    setEditingCategory(category);
    setCategoryCode(category.code);
    setCategoryName(category.name);
    setNewCategoryOpen(true);
  }

  function handleSaveCategory() {
    const code = categoryCode.trim().toUpperCase();
    const name = categoryName.trim();
    if (!code || !name) {
      toast.error("Category code and name are required");
      return;
    }
    if (editingCategory) {
      if (!updateCategory(editingCategory.id, { code, name })) {
        toast.error("Cannot change category code while tasks exist");
        return;
      }
      toast.success("Category updated");
    } else {
      addCategory({ code, name });
      toast.success("Category added");
    }
    setNewCategoryOpen(false);
    resetCategoryForm();
  }

  function handleDeleteCategory(id: string) {
    if (!deleteCategory(id)) {
      toast.error("Cannot delete category while it has tasks or subcategories");
      return;
    }
    toast.success("Category deleted");
  }

  function resetSubCategoryForm() {
    setSubCategoryCategoryId("");
    setSubCategoryName("");
    setEditingSubCategory(null);
  }

  function startEditSubCategory(subCategory: SubCategory) {
    setEditingSubCategory(subCategory);
    setSubCategoryCategoryId(subCategory.categoryId);
    setSubCategoryName(subCategory.name);
    setNewSubCategoryOpen(true);
  }

  function handleSaveSubCategory() {
    const categoryId = subCategoryCategoryId;
    const name = subCategoryName.trim();
    if (!categoryId || !name) {
      toast.error("Subcategory name and parent category are required");
      return;
    }
    if (editingSubCategory) {
      updateSubCategory(editingSubCategory.id, { name });
      toast.success("Subcategory updated");
    } else {
      addSubCategory({ categoryId, name });
      toast.success("Subcategory added");
    }
    setNewSubCategoryOpen(false);
    resetSubCategoryForm();
  }

  function handleDeleteSubCategory(id: string) {
    if (!deleteSubCategory(id)) {
      toast.error("Cannot delete subcategory while it has assigned tasks");
      return;
    }
    toast.success("Subcategory deleted");
  }

  function resetUserForm() {
    setEditingUser(null);
    setEditingUserEmail("");
    setEditingUserName("");
    setEditingUserRole("StandardUser");
    setEditingUserEntityIds([]);
    setNewUserOpen(false);
    setEditingUserPassword("");
    setEditingUserPasswordVisible(false);
  }

  function startEditUser(user: User) {
    setEditingUser(user);
    setEditingUserEmail(user.email);
    setEditingUserName(user.name);
    setEditingUserRole(user.role);
    setEditingUserEntityIds(user.entityIds ?? []);
    setEditingUserPassword("");
  }

  function startNewUser() {
    resetUserForm();
    setNewUserOpen(true);
  }

  async function handleSaveUser() {
    if (!editingUserName.trim()) {
      toast.error("User name is required");
      return;
    }

    if (editingUser) {
      const patch = {
        name: editingUserName.trim(),
        role: editingUserRole,
        entityIds: editingUserEntityIds,
      } as const;
      if (updateUser(editingUser.id, patch)) {
        toast.success("User updated");
        if (editingUserPassword.trim()) {
          await addAccount(editingUser.email, editingUserPassword.trim(), editingUser.id);
          toast.success("Password updated");
        }
      } else {
        toast.error("Unable to update user");
      }
    } else {
      if (!editingUserEmail.trim()) {
        toast.error("Email is required for new users");
        return;
      }
      const email = editingUserEmail.trim().toLowerCase();
      if (data.users.some((u) => u.email === email)) {
        toast.error("A user with that email already exists");
        return;
      }
      const addInput = {
        email,
        name: editingUserName.trim(),
        role: editingUserRole,
        entityIds: editingUserEntityIds,
      } as const;
      const created = addUser(addInput);
      if (editingUserPassword.trim()) {
        await addAccount(email, editingUserPassword.trim(), created.id);
      }
      toast.success("User created");
    }

    resetUserForm();
  }

  async function handleResetPassword(userId: string) {
    const result = await resetPasswordForUser(userId);
    if (result.ok) {
      toast.success(`Password reset to default: ${result.password}`);
    } else {
      toast.error(result.error ?? "Unable to reset password");
    }
  }

  function handleDeleteUser(userId: string) {
    if (!deleteUser(userId)) {
      toast.error("Cannot delete user assigned to tasks");
      return;
    }
    toast.success("User deleted");
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Profile, preferences, and configuration</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">My Profile</TabsTrigger>
          <TabsTrigger value="prefs">Preferences</TabsTrigger>
          <TabsTrigger value="users" disabled={!canManageUsers}>Users</TabsTrigger>
          <TabsTrigger value="roles" disabled={!isAdmin}>Roles</TabsTrigger>
          <TabsTrigger value="entities" disabled={!isAdmin}>Entities</TabsTrigger>
          <TabsTrigger value="categories" disabled={!isAdmin}>Categories</TabsTrigger>
          <TabsTrigger value="holidays" disabled={!canManageUsers}>Holidays</TabsTrigger>
          <TabsTrigger value="system" disabled={!isAdmin}>System</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card><CardContent className="grid max-w-xl gap-3 p-5">
            <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
            <div className="space-y-1.5"><Label>Role</Label><div><Badge variant="outline">{user?.role}</Badge></div></div>
            <div><Button onClick={() => { updateProfile({ name }); toast.success("Profile updated"); }}>Save changes</Button></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="prefs" className="mt-4">
          <Card><CardContent className="p-5">
            <div className="mb-3 text-sm font-medium">Theme</div>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`rounded-md border p-3 text-left text-sm ${theme === t.id ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/40"}`}
                >
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.isDark ? "Dark mode" : "Light mode"}</div>
                </button>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Users</h2>
              <p className="text-sm text-muted-foreground">Create, edit, and remove users.</p>
            </div>
            <Button onClick={startNewUser} disabled={!canManageUsers}>New user</Button>
          </div>

          <Card><CardContent className="p-0"><Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Entities</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>{data.users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.name}</TableCell>
                <TableCell className="text-xs">{u.email}</TableCell>
                <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                <TableCell className="text-xs">{u.entityIds.map((id) => data.entities.find((e) => e.id === id)?.code).join(", ")}</TableCell>
                <TableCell className="text-right text-sm space-x-3">
                  <button
                    type="button"
                    onClick={() => startEditUser(u)}
                    className="text-primary hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetPassword(u.id)}
                    className="text-amber-600 hover:underline"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(u.id)}
                    className="text-destructive hover:underline"
                  >
                    Delete
                  </button>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table></CardContent></Card>

          <Dialog open={Boolean(editingUser) || newUserOpen} onOpenChange={(open) => { if (!open) resetUserForm(); }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingUser ? "Edit user" : "New user"}</DialogTitle>
                <DialogDescription>{editingUser ? "Update user name, role, and entity assignment." : "Create a new user account for task assignment and availability."}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {!editingUser && (
                  <div className="space-y-1.5">
                    <Label htmlFor="user-email">Email</Label>
                    <Input id="user-email" value={editingUserEmail} onChange={(e) => setEditingUserEmail(e.target.value)} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="user-name">Name</Label>
                  <Input id="user-name" value={editingUserName} onChange={(e) => setEditingUserName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="user-password">Password</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="user-password"
                      type={editingUserPasswordVisible ? "text" : "password"}
                      placeholder={editingUser ? "Leave blank to keep" : "Set password (optional)"}
                      value={editingUserPassword}
                      onChange={(e) => setEditingUserPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={editingUserPasswordVisible ? "Hide password" : "Show password"}
                      onClick={() => setEditingUserPasswordVisible((v) => !v)}
                      className="rounded-md p-2 hover:bg-accent"
                    >
                      {editingUserPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="user-role">Role</Label>
                  <select
                    id="user-role"
                    value={editingUserRole}
                    onChange={(e) => setEditingUserRole(e.target.value as Role)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                  >
                    <option value="SystemAdmin">System Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="StandardUser">Standard User</option>
                    <option value="ReadOnly">Read Only</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="user-entities">Entities</Label>
                  <select
                    id="user-entities"
                    value={editingUserEntityIds}
                    onChange={(e) => setEditingUserEntityIds(Array.from(e.target.selectedOptions, (opt) => opt.value))}
                    multiple
                    className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                  >
                    {(data.entities || []).map((e) => (
                      <option key={e.id} value={e.id}>{`${e.code} — ${e.name}`}</option>
                    ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => resetUserForm()}>Cancel</Button>
                <Button onClick={handleSaveUser}>{editingUser ? "Save changes" : "Create user"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <Card><CardContent className="p-5 space-y-2 text-sm">
            <div><Badge>System Admin</Badge> — full access to every module, user and entity management, system configuration.</div>
            <div><Badge>Manager</Badge> — manages tasks and people across assigned entities, can reassign and bulk-update.</div>
            <div><Badge>Standard User</Badge> — works own tasks, comments, attachments, knowledge contributions.</div>
            <div><Badge>Read Only</Badge> — views dashboards, reports and tasks; no edits.</div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="entities" className="mt-4">
          <Card>
            <CardContent className="p-5">
              <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto] items-end">
                <div>
                  <h2 className="text-lg font-semibold">Entities</h2>
                  <p className="text-sm text-muted-foreground">Create and manage entities used across tasks and users.</p>
                </div>
                <Button onClick={() => { resetEntityForm(); setNewEntityOpen(true); }}>New entity</Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.entities || []).map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs">{e.code}</TableCell>
                        <TableCell>{e.name}</TableCell>
                        <TableCell className="text-right text-sm">
                          <button
                            type="button"
                            onClick={() => startEditEntity(e)}
                            className="mr-2 text-primary hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntity(e.id)}
                            className="text-destructive hover:underline"
                          >
                            Delete
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={newEntityOpen} onOpenChange={(open) => { if (!open) resetEntityForm(); setNewEntityOpen(open); }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingEntity ? "Edit entity" : "New entity"}</DialogTitle>
                <DialogDescription>{editingEntity ? "Update the entity code or display name." : "Create a new entity for task and user assignments."}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="entity-code">Entity code</Label>
                  <Input id="entity-code" value={entityCode} onChange={(e) => setEntityCode(e.target.value)} autoComplete="off" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="entity-name">Entity name</Label>
                  <Input id="entity-name" value={entityName} onChange={(e) => setEntityName(e.target.value)} autoComplete="off" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewEntityOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveEntity}>{editingEntity ? "Save changes" : "Create entity"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <Card>
            <CardContent className="p-5">
              <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto] items-end">
                <div>
                  <h2 className="text-lg font-semibold">Categories</h2>
                  <p className="text-sm text-muted-foreground">Manage categories and subcategories used by tasks.</p>
                </div>
                <Button onClick={() => { resetCategoryForm(); setNewCategoryOpen(true); }}>New category</Button>
                <Button variant="outline" onClick={() => { resetSubCategoryForm(); setNewSubCategoryOpen(true); }}>New subcategory</Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Subcategories</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.categories || []).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.code}</TableCell>
                        <TableCell>{c.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {data.subCategories
                              .filter((s) => s.categoryId === c.id)
                              .map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => startEditSubCategory(s)}
                                  className="rounded-md border border-border px-2 py-1 text-xs text-left text-muted-foreground transition hover:bg-accent"
                                >
                                  {s.name}
                                </button>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          <button
                            type="button"
                            onClick={() => startEditCategory(c)}
                            className="mr-2 text-primary hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(c.id)}
                            className="text-destructive hover:underline"
                          >
                            Delete
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holidays" className="mt-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Holidays</h2>
                  <p className="text-sm text-muted-foreground">Maintain the holiday master that affects MEC working-day scheduling.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <div className="space-y-2">
                  <Label htmlFor="holiday-name">Holiday name</Label>
                  <Input
                    id="holiday-name"
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    disabled={!canManageUsers}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="holiday-date">Date</Label>
                  <Input
                    id="holiday-date"
                    type="date"
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    disabled={!canManageUsers}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={!canManageUsers || !holidayName.trim() || !holidayDate}
                  onClick={() => {
                    addHoliday({ date: holidayDate, name: holidayName.trim() });
                    setHolidayName("");
                    setHolidayDate("");
                    toast.success("Holiday added");
                  }}
                >
                  Add holiday
                </Button>
                <span className="text-sm text-muted-foreground">Only System Admin and Manager can change holidays.</span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.holidays || []).map((holiday) => (
                      <TableRow key={holiday.id}>
                        <TableCell>{holiday.date}</TableCell>
                        <TableCell>{holiday.name}</TableCell>
                        <TableCell className="text-right text-sm">
                          <button
                            type="button"
                            onClick={() => {
                              if (deleteHoliday(holiday.id)) {
                                toast.success("Holiday deleted");
                              } else {
                                toast.error("Unable to delete holiday");
                              }
                            }}
                            className="text-destructive hover:underline"
                            disabled={!canManageUsers}
                          >
                            Delete
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.holidays.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                          No holidays defined.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-4">
          <Card><CardContent className="space-y-3 p-5">
            <div className="text-sm">Reset the local demo data to its seeded state. This clears any task edits, comments, attachments, and availability you've added in this browser.</div>
            <Button variant="destructive" onClick={() => { reset(); toast.success("Demo data reset"); }}>Reset demo data</Button>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={newCategoryOpen} onOpenChange={(open) => { if (!open) resetCategoryForm(); setNewCategoryOpen(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>{editingCategory ? "Update the category code or display name." : "Create a new task category."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="category-code">Category code</Label>
              <Input id="category-code" value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category-name">Category name</Label>
              <Input id="category-name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} autoComplete="off" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCategoryOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory}>{editingCategory ? "Save changes" : "Create category"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newSubCategoryOpen} onOpenChange={(open) => { if (!open) resetSubCategoryForm(); setNewSubCategoryOpen(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSubCategory ? "Edit subcategory" : "New subcategory"}</DialogTitle>
            <DialogDescription>{editingSubCategory ? "Update the subcategory name." : "Add a new subcategory for a category."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="subcategory-category">Parent category</Label>
              <select
                id="subcategory-category"
                value={subCategoryCategoryId}
                onChange={(e) => setSubCategoryCategoryId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
              >
                <option value="">Select category</option>
                {(data.categories || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subcategory-name">Subcategory name</Label>
              <Input id="subcategory-name" value={subCategoryName} onChange={(e) => setSubCategoryName(e.target.value)} autoComplete="off" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewSubCategoryOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSubCategory}>{editingSubCategory ? "Save changes" : "Create subcategory"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
