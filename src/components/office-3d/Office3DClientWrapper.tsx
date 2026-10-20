"use client"

import React, { useState } from "react"
import { Room3D, BUILDING_ROOMS, FLOORS_CONFIG } from "@/lib/office-3d-data"
import { Office3DViewer } from "./Office3DViewer"
import { RoomDetailSheet, DepartmentWithUsers } from "./RoomDetailSheet"
import { 
  Building2, 
  Users, 
  Layers, 
  Sparkles, 
  Compass, 
  MapPin, 
  CheckCircle2,
  ChevronRight,
  Maximize2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Office3DClientWrapperProps {
  departments: DepartmentWithUsers[]
  totalPersonnel: number
}

export function Office3DClientWrapper({
  departments,
  totalPersonnel,
}: Office3DClientWrapperProps) {
  const [selectedRoom, setSelectedRoom] = useState<Room3D | null>(null)
  const [activeFloor, setActiveFloor] = useState<1 | 2 | 3 | "all">("all")
  const [isExploded, setIsExploded] = useState<boolean>(false)

  // Rooms belonging to current floor filter
  const currentFloorRooms = BUILDING_ROOMS.filter(
    (r) => activeFloor === "all" || r.floor === activeFloor
  )

  return (
    <div className="relative flex flex-col h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-950">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 bg-slate-900/95 border-b border-slate-800 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-red-900/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                Mô Hình 3D Digital Twin Tòa Nhà Sao Đỏ
              </h1>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] py-0">
                Live Data
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Sơ đồ không gian 3 tầng • Tích hợp nhân sự & phòng ban thực tế từ hệ thống
            </p>
          </div>
        </div>

        {/* Stats Summary Badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <Layers className="w-4 h-4 text-sky-400" />
            <span className="text-slate-400">Quy mô:</span>
            <strong className="text-white">3 Tầng</strong>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <MapPin className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">Không gian:</span>
            <strong className="text-white">{BUILDING_ROOMS.length} Khu Vực</strong>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">Nhân sự:</span>
            <strong className="text-white">{totalPersonnel} CBNV</strong>
          </div>
        </div>
      </div>

      {/* Main 3D Canvas Area */}
      <div className="relative flex-1 w-full h-full min-h-0">
        <Office3DViewer
          selectedRoomId={selectedRoom?.id ?? null}
          onSelectRoom={setSelectedRoom}
          activeFloor={activeFloor}
          isExploded={isExploded}
          onToggleExploded={() => setIsExploded((prev) => !prev)}
          onSelectFloor={setActiveFloor}
        />

        {/* Bottom Horizontal Quick Room Selector Carousel */}
        <div className="absolute bottom-14 left-4 right-4 pointer-events-none z-10 hidden md:block">
          <div className="flex items-center gap-2 overflow-x-auto py-2 px-3 bg-slate-900/80 backdrop-blur-md border border-slate-800/90 rounded-xl shadow-2xl pointer-events-auto scrollbar-none">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
              <Compass className="w-3.5 h-3.5 text-red-500" />
              Chọn phòng nhanh:
            </span>
            {currentFloorRooms.map((room) => {
              const isSelected = selectedRoom?.id === room.id
              return (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition-all ${
                    isSelected
                      ? "bg-red-600 text-white shadow-md shadow-red-900/30 scale-105"
                      : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: room.color }}
                  />
                  <span>{room.name}</span>
                  <span className="text-[10px] opacity-70">T{room.floor}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Slide-over Room Detail Sheet */}
      <RoomDetailSheet
        room={selectedRoom}
        isOpen={!!selectedRoom}
        onClose={() => setSelectedRoom(null)}
        departments={departments}
      />
    </div>
  )
}
