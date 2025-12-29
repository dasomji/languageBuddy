"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import {
  Users,
  Activity,
  Mail,
  Shield,
  UserCheck,
  UserX,
  Clock,
  Send,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type UserFilter = "all" | "waitlist" | "approved" | "admin";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, sessions, and invitations
        </p>
      </div>

      <StatsCards />

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <Activity className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="invitations" className="gap-2">
            <Mail className="h-4 w-4" />
            Invite
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionsTab />
        </TabsContent>

        <TabsContent value="invitations">
          <InvitationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatsCards() {
  const { data: stats, isLoading } = api.admin.getStats.useQuery();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="bg-muted h-4 w-24 animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="bg-muted h-8 w-16 animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      title: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "On Waitlist",
      value: stats?.waitlistUsers ?? 0,
      icon: Clock,
      color: "text-amber-600",
    },
    {
      title: "Approved",
      value: stats?.approvedUsers ?? 0,
      icon: UserCheck,
      color: "text-emerald-600",
    },
    {
      title: "Active Sessions",
      value: stats?.activeSessions ?? 0,
      icon: Activity,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {statItems.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <item.icon className={`h-4 w-4 ${item.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function UsersTab() {
  const [filter, setFilter] = useState<UserFilter>("all");
  const utils = api.useUtils();

  const { data, isLoading } = api.admin.listUsers.useQuery({
    limit: 50,
    offset: 0,
    filter,
  });

  const approveUser = api.admin.approveUser.useMutation({
    onSuccess: () => {
      toast.success("User approved successfully");
      void utils.admin.listUsers.invalidate();
      void utils.admin.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const banUser = api.admin.banUser.useMutation({
    onSuccess: () => {
      toast.success("User moved to waitlist");
      void utils.admin.listUsers.invalidate();
      void utils.admin.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const setUserRole = api.admin.setUserRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated");
      void utils.admin.listUsers.invalidate();
      void utils.admin.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              View and manage all users on the platform
            </CardDescription>
          </div>
          <Select
            value={filter}
            onValueChange={(value) => setFilter(value as UserFilter)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="waitlist">Waitlist</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.users.length ? (
          <div className="py-8 text-center text-muted-foreground">
            No users found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.banned ? (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" />
                        Waitlist
                      </Badge>
                    ) : (
                      <Badge
                        variant="default"
                        className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Approved
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.role === "admin" ? (
                      <Badge variant="outline" className="gap-1">
                        <Shield className="h-3 w-3" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline">User</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(user.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.banned ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => approveUser.mutate({ userId: user.id })}
                          disabled={approveUser.isPending}
                        >
                          {approveUser.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <UserCheck className="h-3 w-3" />
                          )}
                          Approve
                        </Button>
                      ) : user.role !== "admin" ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-amber-600 hover:text-amber-700"
                            >
                              <UserX className="h-3 w-3" />
                              Waitlist
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Move to Waitlist?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will revoke access for {user.name}. They
                                will see the beta message until approved again.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  banUser.mutate({ userId: user.id })
                                }
                              >
                                Move to Waitlist
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : null}
                      {user.role !== "admin" && !user.banned && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-1">
                              <Shield className="h-3 w-3" />
                              Make Admin
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Promote to Admin?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will give {user.name} full admin privileges.
                                They will be able to manage all users and
                                invitations.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  setUserRole.mutate({
                                    userId: user.id,
                                    role: "admin",
                                  })
                                }
                              >
                                Promote to Admin
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {data && data.total > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {data.users.length} of {data.total} users
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SessionsTab() {
  const { data, isLoading } = api.admin.listSessions.useQuery({
    limit: 50,
    offset: 0,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Sessions</CardTitle>
        <CardDescription>View all currently active user sessions</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.sessions.length ? (
          <div className="py-8 text-center text-muted-foreground">
            No active sessions
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>User Agent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {session.userName ?? "Unknown"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {session.userEmail ?? "Unknown"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(session.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(session.expiresAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {session.ipAddress ?? "-"}
                  </TableCell>
                  <TableCell
                    className="max-w-[200px] truncate text-sm text-muted-foreground"
                    title={session.userAgent ?? undefined}
                  >
                    {session.userAgent
                      ? session.userAgent.substring(0, 50) + "..."
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {data && data.total > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {data.sessions.length} of {data.total} sessions
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InvitationsTab() {
  const [email, setEmail] = useState("");
  const [sentEmails, setSentEmails] = useState<string[]>([]);

  const sendInvitation = api.admin.sendInvitation.useMutation({
    onSuccess: () => {
      toast.success(`Invitation sent to ${email}`);
      setSentEmails((prev) => [email, ...prev]);
      setEmail("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      sendInvitation.mutate({ email: email.trim() });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Send Invitation</CardTitle>
          <CardDescription>
            Invite new users to join the EdgeLang beta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
                disabled={sendInvitation.isPending}
              />
              <Button
                type="submit"
                disabled={!email.trim() || sendInvitation.isPending}
                className="gap-2"
              >
                {sendInvitation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              The user will receive an email with a link to sign up. Once they
              create an account, you can approve them from the Users tab.
            </p>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recently Sent</CardTitle>
          <CardDescription>
            Invitations sent during this session
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sentEmails.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No invitations sent yet
            </div>
          ) : (
            <div className="space-y-2">
              {sentEmails.map((sentEmail, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg border p-3"
                >
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span className="flex-1 text-sm">{sentEmail}</span>
                  <Badge variant="secondary">Sent</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

