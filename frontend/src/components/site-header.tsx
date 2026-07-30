'use client'

import React, { useState } from "react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Loader2, Gauge, Bell, Check, MailOpen } from "lucide-react"
import { useRouter } from "next/navigation"
import { useProject } from "../contexts/ProjectContext"
import { UrlTatChecker } from "./UrlTatChecker"
import { useNotificationsQuery } from "../queries/notification.query"
import { useMarkNotificationReadMutation, useMarkAllNotificationsReadMutation } from "../mutations/notification.mutation"

interface SiteHeaderProps {
  title?: string
}

export function SiteHeader({ title = 'Documents' }: SiteHeaderProps) {
  const { agentRunning, figmaSyncing } = useProject()
  const [tatModalOpen, setTatModalOpen] = useState(false)

  const { data: notifications = [] } = useNotificationsQuery()
  const markReadMutation = useMarkNotificationReadMutation()
  const markAllReadMutation = useMarkAllNotificationsReadMutation()
  const router = useRouter()
  const [notifOpen, setNotifOpen] = useState(false)

  const unreadCount = notifications.filter((n: any) => !n.isRead).length

  const handleNotifClick = (notif: any) => {
    markReadMutation.mutate(notif._id)
    setNotifOpen(false)
    if (notif.projectId?._id && notif.testSuiteId?._id) {
      const srsId = notif.testSuiteId?.srsDocumentId || ''
      const param = srsId ? `?srsId=${srsId}` : ''
      router.push(`/dashboard/${notif.projectId._id}/test-cases${param}`)
    }
  }

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    markAllReadMutation.mutate()
  }

  return (
    <>
      <UrlTatChecker open={tatModalOpen} onOpenChange={setTatModalOpen} />
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
        <div className="flex w-full items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-1">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mx-2 h-4 data-vertical:self-auto"
            />
            <h1 className="text-base font-medium">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTatModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary cursor-pointer transition-all shadow-sm"
              title="Check page landing TAT speed and latency"
            >
              <Gauge className="w-3.5 h-3.5" />
              Check URL TAT
            </button>

            {/* In-App Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className={`relative p-2 text-muted-foreground hover:text-foreground border border-border/60 bg-card rounded-xl transition-all cursor-pointer ${
                  notifOpen ? 'text-primary ring-1 ring-primary/40' : ''
                }`}
                title="View Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[9px] font-bold bg-primary text-primary-foreground rounded-full shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotifOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fadeIn max-h-[420px] flex flex-col">
                    <div className="p-3 border-b border-border flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" /> Mark all read
                        </button>
                      )}
                    </div>
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground italic flex flex-col items-center gap-2">
                          <MailOpen className="w-6 h-6 text-muted-foreground/60" />
                          <span>No notifications yet</span>
                        </div>
                      ) : (
                        <div className="divide-y divide-border/60">
                          {notifications.map((notif: any) => (
                            <div
                              key={notif._id}
                              onClick={() => handleNotifClick(notif)}
                              className={`p-3 text-left text-xs cursor-pointer hover:bg-muted/50 transition-colors flex gap-2.5 items-start ${
                                !notif.isRead ? 'bg-primary/5 font-medium' : ''
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                !notif.isRead ? 'bg-primary' : 'bg-transparent'
                              }`} />
                              <div className="min-w-0 flex-grow">
                                <p className="text-foreground leading-normal">{notif.message}</p>
                                <span className="text-[9px] text-muted-foreground block mt-1">
                                  {new Date(notif.createdAt).toLocaleDateString()} at{' '}
                                  {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {figmaSyncing && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded bg-purple-500/10 text-purple-500 border border-purple-500/20">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Syncing Figma Design...
              </span>
            )}

            {agentRunning && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded bg-primary/10 text-primary border border-primary/20">
                <Loader2 className="w-3 h-3 animate-spin" />
                {agentRunning === 'agent1'
                  ? 'Extracting requirements...'
                  : agentRunning === 'agent2'
                    ? 'Generating test cases...'
                    : 'Analyzing requirement gaps...'}
              </span>
            )}
          </div>
        </div>
      </header>
    </>
  )
}
