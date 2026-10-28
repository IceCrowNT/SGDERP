"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import { Room3D } from "@/lib/office-3d-data"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Building2,
  Users,
  Search,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
} from "lucide-react"

export interface DepartmentEmployee {
  id: number
  fullName: string
  employeeCode: string
  position: string | null
  phone: string | null
  email: string | null
  avatarUrl: string | null
  employmentStatus: string
  departmentId: number | null
}

export interface DepartmentWithEmployees {
  id: number
  name: string
  code: string
  parentId: number | null
  employees: DepartmentEmployee[]
}

interface RoomDetailSheetProps {
  room: Room3D | null
  isOpen: boolean
  onClose: () => void
  departments: DepartmentWithEmployees[]
}

export function RoomDetailSheet({
  room,
  isOpen,
  onClose,
  departments,
}: RoomDetailSheetProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Map real users from PostgreSQL database
  const matchedUsers = useMemo(() => {
    if (!room) return []

    // Specific case: Ban Pháp chế + Phòng HCNS
    if (room.id === "t2_hcns_pc") {
      const depts = departments.filter((d) => d.code === "HCNS" || d.code === "PC")
      return depts.flatMap((d) => d.employees)
    }

    if (!room.deptCode) return []

    // Main department
    const mainDept = departments.find((d) => d.code === room.deptCode)
    if (!mainDept) return []

    // Child departments (e.g., KD_SM, KD_CSKH under KD)
    const childDepts = departments.filter((d) => d.parentId === mainDept.id)
    const allRelevantDepts = [mainDept, ...childDepts]

    return allRelevantDepts.flatMap((d) => d.employees)
  }, [room, departments])

  // Filter users
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return matchedUsers
    const q = searchQuery.toLowerCase().trim()
    return matchedUsers.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.employeeCode.toLowerCase().includes(q) ||
        (u.position && u.position.toLowerCase().includes(q))
    )
  }, [matchedUsers, searchQuery])

  if (!room) return null

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-slate-900 border-l border-slate-800 text-slate-100 p-0 flex flex-col shadow-2xl z-50 overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="border-red-500/40 bg-red-500/10 text-red-400 font-semibold text-xs">
              TẦNG {room.floor}
            </Badge>
            {room.areaM2 && (
              <span className="text-xs text-slate-400 ml-auto font-medium">
                Diện tích: <strong className="text-white">{room.areaM2} m²</strong>
              </span>
            )}
          </div>

          <SheetTitle className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: room.color }}
            />
            {room.name}
          </SheetTitle>

          {room.deptName && (
            <p className="text-sm font-medium text-sky-400 mt-1 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 shrink-0" />
              {room.deptName}
            </p>
          )}
        </div>

        {/* Scrollable Body: Personnel List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              Cán Bộ Nhân Sự ({matchedUsers.length})
            </h4>
            {matchedUsers.length > 5 && (
              <span className="text-[11px] text-slate-500">
                Hiển thị {filteredUsers.length}/{matchedUsers.length}
              </span>
            )}
          </div>

          {/* Search Input when there are multiple personnel */}
          {matchedUsers.length > 3 && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, mã NV, chức vụ..."
                className="pl-9 bg-slate-950/60 border-slate-800 text-xs h-9 placeholder:text-slate-500 text-white"
              />
            </div>
          )}

          {/* List of Personnel */}
          {filteredUsers.length > 0 ? (
            <div className="space-y-2.5">
              {filteredUsers.map((user) => {
                const initials = user.fullName
                  .split(" ")
                  .slice(-2)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()

                return (
                  <div
                    key={user.id}
                    className="group p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 transition-all duration-200"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10 border border-slate-600/80 shrink-0">
                        {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
                        <AvatarFallback className="bg-gradient-to-br from-red-600 to-rose-700 text-white font-semibold text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-sky-300 transition-colors">
                            {user.fullName}
                          </p>
                          <span className="text-[11px] font-mono text-slate-400">
                            ({user.employeeCode})
                          </span>
                        </div>

                        <p className="text-xs text-amber-400/90 font-medium truncate mt-0.5">
                          {user.position || "Cán bộ chuyên môn"}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-400">
                          {user.phone && (
                            <a
                              href={`tel:${user.phone}`}
                              className="flex items-center gap-1 hover:text-white transition-colors"
                            >
                              <Phone className="w-3 h-3 text-slate-500" />
                              {user.phone}
                            </a>
                          )}
                          {user.email && (
                            <a
                              href={`mailto:${user.email}`}
                              className="flex items-center gap-1 hover:text-white transition-colors truncate max-w-[180px]"
                            >
                              <Mail className="w-3 h-3 text-slate-500" />
                              {user.email}
                            </a>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/employees/${user.id}`}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-700 hover:bg-sky-600 text-slate-300 hover:text-white transition-all shrink-0"
                        title="Xem hồ sơ chi tiết"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
              <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">
                {searchQuery ? "Không tìm thấy nhân sự phù hợp" : "Khu vực dùng chung"}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-[260px] mx-auto">
                Không gian làm việc mở, phòng họp hoặc khu tiện ích đối ngoại của tập đoàn.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-300 hover:text-white"
            onClick={onClose}
          >
            Đóng
          </Button>
          {room.deptCode && (
            <Link href={`/departments`}>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-medium">
                Sơ đồ phòng ban
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
