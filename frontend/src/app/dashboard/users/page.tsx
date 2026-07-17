'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { authService, User } from '../../../services/authService'
import { ShieldAlert, Loader2, Sparkles, UserCheck, ShieldX } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function UsersManagementPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  const isAdmin = (session as any)?.user?.role === 'admin'

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await authService.getUsers()
      if (res.success && res.data) {
        setUsers(res.data)
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to load users list.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    }
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <div className="border border-destructive/20 bg-destructive/10 text-destructive p-5 rounded-2xl max-w-[500px] mx-auto text-center space-y-3 mt-12">
        <ShieldAlert className="w-8 h-8 mx-auto" />
        <h3 className="font-bold text-lg">Access Denied</h3>
        <p className="text-xs">You do not have administrative privileges to access this user management portal.</p>
      </div>
    )
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingUserId(userId)
    try {
      const res = await authService.updateUserRole(userId, newRole)
      if (res.success) {
        toast.success('User role updated successfully!')
        setUsers(prev => prev.map(user => user._id === userId ? { ...user, role: newRole as any } : user))
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err?.response?.data?.error || 'Failed to update user role.')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleToggleStatus = async (userId: string, newStatus: boolean) => {
    setUpdatingUserId(userId)
    try {
      const res = await authService.updateUserStatus(userId, newStatus)
      if (res.success) {
        toast.success(newStatus ? 'User login access enabled! ✅' : 'User login access disabled! 🛑')
        setUsers(prev => prev.map(user => user._id === userId ? { ...user, isActive: newStatus } : user))
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err?.response?.data?.error || 'Failed to update user status.')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const formatRole = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin'
      case 'project_manager': return 'Project Manager'
      case 'qa': return 'QA Engineer'
      case 'developer': return 'Developer'
      case 'pending': return 'Pending Selection'
      default: return role
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">User Management</h1>
        <p className="text-xs text-muted-foreground mt-0.5">View all system users and manage their login access and roles.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Loading accounts...</p>
        </div>
      ) : (
        <div className="border border-border bg-card rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                  <th className="p-4">User</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Access Role</th>
                  <th className="p-4">Registered Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((user) => {
                  const initials = user.username.substring(0, 2).toUpperCase()
                  const isSelf = user._id === (session as any)?.user?.id
                  const isUserActive = user.isActive !== false

                  return (
                    <tr key={user._id} className={`hover:bg-muted/10 transition-colors ${!isUserActive ? 'opacity-70 bg-rose-50/5 dark:bg-rose-950/5' : ''}`}>
                      {/* User Info */}
                      <td className="p-4 flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className={`${!isUserActive ? 'bg-rose-500/10 text-rose-500' : 'bg-primary/10 text-primary'} font-bold text-xs`}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            {user.username}
                            {isSelf && (
                              <span className="text-[9px] bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                You
                              </span>
                            )}
                            {!isUserActive && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                <ShieldX className="w-2.5 h-2.5" /> Banned
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="p-4 text-muted-foreground">{user.email}</td>

                      {/* Role Badge */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                          user.role === 'admin' 
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                            : user.role === 'project_manager'
                              ? 'bg-violet-500/10 text-violet-500 border-violet-500/20'
                              : user.role === 'qa'
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : user.role === 'developer'
                                  ? 'bg-sky-500/10 text-sky-500 border-sky-500/20'
                                  : 'bg-muted/40 text-muted-foreground border-border/80'
                        }`}>
                          {formatRole(user.role)}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="p-4 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        {isSelf ? (
                          <span className="text-[10px] text-muted-foreground/60 italic">Managed in profile</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2.5">
                            {updatingUserId === user._id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                            ) : (
                              <>
                                <select
                                  value={user.role}
                                  onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                  disabled={!isUserActive}
                                  className="h-8 border border-border bg-card px-2.5 rounded-lg text-xs outline-none focus:border-primary cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="developer">Developer</option>
                                  <option value="qa">QA Engineer</option>
                                  <option value="project_manager">Project Manager</option>
                                  <option value="admin">Administrator</option>
                                </select>
                                <button
                                  onClick={() => handleToggleStatus(user._id, !isUserActive)}
                                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                                    !isUserActive
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20'
                                      : 'bg-rose-500/10 border-rose-500/30 text-rose-600 hover:bg-rose-500/20'
                                  }`}
                                >
                                  {isUserActive ? 'Disable Login' : 'Enable Login'}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
