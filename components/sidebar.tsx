"use client"

import { BarChart3, Globe, Building2, ChevronRight, Quote, LogOut, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { deleteCompany } from "@/lib/queries"

const navItems = [
  { id: "visibility", label: "AI Visibility", icon: BarChart3, href: "/dashboard" },
  { id: "geo-audit", label: "Geo Audit", icon: Globe, href: "/dashboard/geo-audit" },
  { id: "citation", label: "Citation Analysis", icon: Quote, href: "/dashboard/geo-audit" },
]

interface SidebarProps {
  companies?: { id: string; name: string }[]
  selectedCompanyId?: string
  onSelectCompany?: (id: string) => void
  onCreateNew?: () => void
  onDeleteCompany?: (id: string) => void
}

export function Sidebar({ companies = [], selectedCompanyId, onSelectCompany, onCreateNew, onDeleteCompany }: SidebarProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleDelete = async (e: React.MouseEvent, companyId: string, companyName: string) => {
    e.stopPropagation()
    if (!confirm(`Delete "${companyName}"? This will remove all tracking data and cannot be undone.`)) return
    setDeletingId(companyId)
    try {
      await deleteCompany(companyId)
      onDeleteCompany?.(companyId)
    } catch (err) {
      console.error("Delete failed:", err)
    } finally {
      setDeletingId(null)
    }
  }

  const name = user?.user_metadata?.name || user?.email?.split("@")[0] || "User"
  const email = user?.email || ""
  const avatarSeed = encodeURIComponent(name)

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Globe className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-card-foreground">Geo Intel</span>
        </div>

        {/* User profile */}
        <div className="flex items-center gap-3">
          <img
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${avatarSeed}`}
            alt={name}
            width={36}
            height={36}
            className="rounded-full bg-muted"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-card-foreground truncate">{name}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
        </div>
      </div>

      {/* Companies */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Companies Tracked</span>
          {onCreateNew && (
            <button onClick={onCreateNew} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-primary transition-colors" title="Add company">
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="mb-6 flex flex-col gap-1">
          {companies.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No companies yet</p>
          ) : companies.length > 0 && (
            companies.map((company) => (
              <div
                key={company.id}
                className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  selectedCompanyId === company.id
                    ? "bg-primary/10 text-primary"
                    : "text-card-foreground hover:bg-muted"
                }`}
                onClick={() => onSelectCompany?.(company.id)}
              >
                <Building2 className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 truncate">{company.name}</span>
                <div className="ml-auto flex flex-shrink-0 items-center gap-1">
                  {selectedCompanyId === company.id && (
                    <ChevronRight className="h-4 w-4 text-primary" />
                  )}
                  <button
                    onClick={(e) => handleDelete(e, company.id, company.name)}
                    disabled={deletingId === company.id}
                    className="hidden rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:block transition-colors disabled:opacity-50"
                    title="Delete company"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Navigation */}
        <div className="mb-2 px-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tools</span>
        </div>
        <div className="flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-card-foreground hover:bg-muted"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="border-t border-border px-4 py-4">
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-card-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
