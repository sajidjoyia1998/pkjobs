import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  Search,
  Edit,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  User,
  Calendar,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { toast } from "sonner";
import { calculateAge } from "@/hooks/useProfile";
import { useUserRoles, useAssignExpertRole, useRemoveExpertRole } from "@/hooks/useExperts";

interface AdminProfile {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  education: string | null;
  province: string | null;
  domicile: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

const USERS_PER_PAGE = 15;

const useAllProfiles = () => {
  return useQuery({
    queryKey: ["admin-all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AdminProfile[];
    },
  });
};

const useAdminUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-profiles"] });
      toast.success("Profile updated!");
    },
    onError: (error: Error) => toast.error(error.message),
  });
};

const useAdminDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-profiles"] });
      toast.success("User profile deleted!");
    },
    onError: (error: Error) => toast.error(error.message),
  });
};

const UserManagement = () => {
  const { data: profiles = [], isLoading } = useAllProfiles();
  const { data: roleMap = new Map() } = useUserRoles();
  const updateProfile = useAdminUpdateProfile();
  const deleteUser = useAdminDeleteUser();
  const assignExpert = useAssignExpertRole();
  const removeExpert = useRemoveExpertRole();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<AdminProfile | null>(null);
  const [viewingUser, setViewingUser] = useState<AdminProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<{ userId: string; name: string } | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    date_of_birth: "",
    gender: "",
    province: "",
    domicile: "",
    phone: "",
  });

  const filtered = profiles.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.province?.toLowerCase().includes(search.toLowerCase()) ||
    p.domicile?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search)
  );

  const totalPages = Math.ceil(filtered.length / USERS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE);

  const getUserRoles = (userId: string): string[] => {
    return roleMap.get(userId) || ["user"];
  };

  const isExpert = (userId: string) => getUserRoles(userId).includes("expert");
  const isAdmin = (userId: string) => getUserRoles(userId).includes("admin");

  const openEdit = (user: AdminProfile) => {
    setEditForm({
      full_name: user.full_name || "",
      date_of_birth: user.date_of_birth || "",
      gender: user.gender || "",
      province: user.province || "",
      domicile: user.domicile || "",
      phone: user.phone || "",
    });
    setEditingUser(user);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    await updateProfile.mutateAsync({
      userId: editingUser.user_id,
      updates: {
        full_name: editForm.full_name,
        date_of_birth: editForm.date_of_birth || null,
        gender: editForm.gender || null,
        province: editForm.province || null,
        domicile: editForm.domicile || null,
        phone: editForm.phone || null,
      } as any,
    });
    setEditingUser(null);
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    await deleteUser.mutateAsync(deletingUser.userId);
    setDeletingUser(null);
  };

  const handleToggleExpert = async (userId: string) => {
    if (isExpert(userId)) {
      await removeExpert.mutateAsync(userId);
    } else {
      await assignExpert.mutateAsync(userId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">
            All Users ({profiles.length})
          </h3>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Expert management hint */}
      <div className="flex items-start gap-2 p-2.5 mb-4 rounded-lg bg-accent/50 border border-accent text-xs text-accent-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Use the <strong>green shield</strong> button to <strong>make a user an Expert</strong>, or the <strong>amber shield</strong> to remove the role. Experts handle assigned applications & work requests.
        </p>
      </div>

      {/* Desktop Table */}
      <div className="card-elevated overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium text-foreground text-sm">Name</th>
                <th className="text-left p-3 font-medium text-foreground text-sm">Role</th>
                <th className="text-left p-3 font-medium text-foreground text-sm">Gender</th>
                <th className="text-left p-3 font-medium text-foreground text-sm">Age</th>
                <th className="text-left p-3 font-medium text-foreground text-sm">Province</th>
                <th className="text-left p-3 font-medium text-foreground text-sm">Phone</th>
                <th className="text-left p-3 font-medium text-foreground text-sm">Joined</th>
                <th className="text-right p-3 font-medium text-foreground text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((user) => {
                const roles = getUserRoles(user.user_id);
                return (
                  <tr key={user.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-medium text-foreground text-sm">{user.full_name}</td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {roles.map((r) => (
                          <Badge key={r} variant={r === "admin" ? "default" : r === "expert" ? "secondary" : "outline"} className="text-xs">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground text-sm capitalize">{user.gender || "—"}</td>
                    <td className="p-3 text-muted-foreground text-sm">
                      {user.date_of_birth ? calculateAge(user.date_of_birth) : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground text-sm">{user.province || "—"}</td>
                    <td className="p-3 text-muted-foreground text-sm">{user.phone || "—"}</td>
                    <td className="p-3 text-muted-foreground text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleExpert(user.user_id)}
                          disabled={isAdmin(user.user_id) || assignExpert.isPending || removeExpert.isPending}
                          title={isExpert(user.user_id) ? "Remove Expert Role" : "Make Expert"}
                        >
                          {isExpert(user.user_id) ? (
                            <ShieldX className="h-4 w-4 text-warning" />
                          ) : (
                            <ShieldCheck className="h-4 w-4 text-success" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setViewingUser(user)} title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(user)} title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingUser({ userId: user.user_id, name: user.full_name })}
                          disabled={isAdmin(user.user_id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {paginated.map((user) => {
          const roles = getUserRoles(user.user_id);
          return (
            <div key={user.id} className="card-elevated p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-foreground text-sm truncate">{user.full_name}</h4>
                    {roles.map((r) => (
                      <Badge key={r} variant={r === "admin" ? "default" : r === "expert" ? "secondary" : "outline"} className="text-[10px]">
                        {r}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                    {user.gender && <span className="capitalize">{user.gender}</span>}
                    {user.date_of_birth && <span>{calculateAge(user.date_of_birth)} yrs</span>}
                    {user.province && <span>{user.province}</span>}
                    {user.phone && <span>{user.phone}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Joined: {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button
                    variant={isExpert(user.user_id) ? "outline" : "secondary"}
                    size="sm"
                    onClick={() => handleToggleExpert(user.user_id)}
                    disabled={isAdmin(user.user_id)}
                    className="h-7 px-2 text-[10px] gap-1"
                  >
                    {isExpert(user.user_id) ? (
                      <><ShieldX className="h-3 w-3 text-warning" /> Remove Expert</>
                    ) : (
                      <><ShieldCheck className="h-3 w-3 text-success" /> Make Expert</>
                    )}
                  </Button>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setViewingUser(user)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeletingUser({ userId: user.user_id, name: user.full_name })} disabled={isAdmin(user.user_id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingUser?.name}</strong>'s profile? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View User Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
          </DialogHeader>
          {viewingUser && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <User className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium text-sm">{viewingUser.full_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Shield className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Roles</p>
                  <div className="flex gap-1 mt-1">
                    {getUserRoles(viewingUser.user_id).map((r) => (
                      <Badge key={r} variant={r === "admin" ? "default" : r === "expert" ? "secondary" : "outline"} className="text-xs">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="h-4 w-4 text-primary shrink-0" />
                  <div><p className="text-xs text-muted-foreground">DOB/Age</p><p className="font-medium text-sm">{viewingUser.date_of_birth ? `${viewingUser.date_of_birth} (${calculateAge(viewingUser.date_of_birth)})` : "—"}</p></div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <User className="h-4 w-4 text-primary shrink-0" />
                  <div><p className="text-xs text-muted-foreground">Gender</p><p className="font-medium text-sm capitalize">{viewingUser.gender || "—"}</p></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <div><p className="text-xs text-muted-foreground">Province</p><p className="font-medium text-sm">{viewingUser.province || "—"}</p></div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <div><p className="text-xs text-muted-foreground">Domicile</p><p className="font-medium text-sm">{viewingUser.domicile || "—"}</p></div>
                </div>
              </div>
              {viewingUser.phone && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium text-sm">{viewingUser.phone}</p></div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={editForm.date_of_birth} onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={editForm.gender} onValueChange={(v) => setEditForm({ ...editForm, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Province</Label>
                <Select value={editForm.province} onValueChange={(v) => setEditForm({ ...editForm, province: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Punjab">Punjab</SelectItem>
                    <SelectItem value="Sindh">Sindh</SelectItem>
                    <SelectItem value="Khyber Pakhtunkhwa">KPK</SelectItem>
                    <SelectItem value="Balochistan">Balochistan</SelectItem>
                    <SelectItem value="Islamabad">Islamabad</SelectItem>
                    <SelectItem value="AJK">AJK</SelectItem>
                    <SelectItem value="Gilgit-Baltistan">GB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Domicile</Label>
                <Input value={editForm.domicile} onChange={(e) => setEditForm({ ...editForm, domicile: e.target.value })} placeholder="e.g., Lahore" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+92 300 1234567" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={updateProfile.isPending}>
                {updateProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
