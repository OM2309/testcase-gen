'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ProjectsListView } from '@/components/ProjectsListView'

export default function ProjectsPage() {
  const router = useRouter()

  const handleSelectProject = (projectId: string) => {
    router.push(`/dashboard/${projectId}/modules`)
  }

  return (
    <ProjectsListView onSelectProject={handleSelectProject} />
  )
}
