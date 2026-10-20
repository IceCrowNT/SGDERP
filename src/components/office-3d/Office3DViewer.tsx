"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { Room3D, BUILDING_ROOMS, FLOORS_CONFIG } from "@/lib/office-3d-data"
import { 
  Layers, 
  Eye, 
  Compass, 
  RotateCcw,
  Sparkles,
  Info
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Office3DViewerProps {
  selectedRoomId: string | null
  onSelectRoom: (room: Room3D | null) => void
  activeFloor: 1 | 2 | 3 | "all"
  isExploded: boolean
  onToggleExploded?: () => void
  onSelectFloor?: (floor: 1 | 2 | 3 | "all") => void
}

export function Office3DViewer({
  selectedRoomId,
  onSelectRoom,
  activeFloor,
  isExploded,
  onToggleExploded,
  onSelectFloor,
}: Office3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredRoom, setHoveredRoom] = useState<Room3D | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animFrameIdRef = useRef<number | null>(null)
  const isAnimatingRef = useRef<boolean>(true)

  // Floor Groups for Exploded animation and filtering
  const floorGroupsRef = useRef<{ [key: number]: THREE.Group }>({})
  const roomMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const selectedMeshRef = useRef<THREE.Mesh | null>(null)

  // Target Y positions for smooth lerp
  const currentFloorYRef = useRef<{ [key: number]: number }>({ 1: 0, 2: 4.8, 3: 9.6 })
  const targetFloorYRef = useRef<{ [key: number]: number }>({ 1: 0, 2: 4.8, 3: 9.6 })

  // Request frame helper for on-demand rendering
  const requestFrame = useCallback(() => {
    isAnimatingRef.current = true
  }, [])

  // Initialize Lightweight Scene
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#090d16") // Slate 950
    sceneRef.current = scene

    // Camera
    const aspect = container.clientWidth / container.clientHeight
    const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 1000)
    camera.position.set(38, 36, 42)
    cameraRef.current = camera

    // Lightweight Renderer (No heavy shadow maps or tone mapping post-processing)
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      powerPreference: "high-performance" 
    })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)) // Cap at 1.5 for performance
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.maxPolarAngle = Math.PI / 2.08
    controls.minDistance = 12
    controls.maxDistance = 110
    controls.target.set(0, 5, 0)
    controlsRef.current = controls

    // On-demand rendering when rotating / zooming
    controls.addEventListener("change", () => {
      requestFrame()
    })

    // Balanced Non-Shadow Ambient & Directional Lighting
    const hemiLight = new THREE.HemisphereLight("#cbd5e1", "#1e293b", 0.9)
    hemiLight.position.set(0, 50, 0)
    scene.add(hemiLight)

    const dirLight1 = new THREE.DirectionalLight("#ffffff", 0.9)
    dirLight1.position.set(30, 40, 30)
    scene.add(dirLight1)

    const dirLight2 = new THREE.DirectionalLight("#93c5fd", 0.4)
    dirLight2.position.set(-30, 25, -30)
    scene.add(dirLight2)

    // Floor Ground Grid
    const grid = new THREE.GridHelper(90, 45, "#334155", "#1e293b")
    grid.position.y = -0.05
    scene.add(grid)

    // Floor Groups
    const f1Group = new THREE.Group()
    const f2Group = new THREE.Group()
    const f3Group = new THREE.Group()
    scene.add(f1Group)
    scene.add(f2Group)
    scene.add(f3Group)
    floorGroupsRef.current = { 1: f1Group, 2: f2Group, 3: f3Group }

    // Reusable slab geometry & material
    const slabGeo = new THREE.BoxGeometry(45, 0.35, 34)
    const slabMat = new THREE.MeshLambertMaterial({ color: "#1e293b" })
    const slabEdgeGeo = new THREE.EdgesGeometry(slabGeo)
    const slabEdgeMat = new THREE.LineBasicMaterial({ color: "#334155" })

    // Floor 1 Slab
    const slab1 = new THREE.Mesh(slabGeo, slabMat)
    slab1.position.y = -0.18
    f1Group.add(slab1)
    f1Group.add(new THREE.LineSegments(slabEdgeGeo, slabEdgeMat))

    // Floor 2 Slab with Atrium cutout representation
    const slab2 = new THREE.Mesh(slabGeo, slabMat)
    slab2.position.y = -0.18
    f2Group.add(slab2)
    f2Group.add(new THREE.LineSegments(slabEdgeGeo, slabEdgeMat))

    // Atrium marker (Khoảng thông tầng đèn chùm 1+2)
    const atriumGeo = new THREE.BoxGeometry(17, 0.37, 12)
    const atriumMat = new THREE.MeshLambertMaterial({ color: "#0f172a" })
    const atriumMesh = new THREE.Mesh(atriumGeo, atriumMat)
    atriumMesh.position.set(-3, -0.18, 0.5)
    f2Group.add(atriumMesh)

    // Floor 3 Slab
    const slab3 = new THREE.Mesh(slabGeo, slabMat)
    slab3.position.y = -0.18
    f3Group.add(slab3)
    f3Group.add(new THREE.LineSegments(slabEdgeGeo, slabEdgeMat))

    // Oval Sky Garden Lawn on Floor 3
    const lawnGeo = new THREE.CylinderGeometry(7.5, 7.5, 0.2, 24)
    lawnGeo.scale(1.2, 1, 0.85)
    const lawnMat = new THREE.MeshLambertMaterial({ color: "#15803d" })
    const lawnMesh = new THREE.Mesh(lawnGeo, lawnMat)
    lawnMesh.position.set(-2, 0.1, 0.5)
    f3Group.add(lawnMesh)

    // ==========================================
    // BUILD CLEAN ROOM BLOCKS
    // ==========================================
    const roomMeshes = new Map<string, THREE.Mesh>()

    BUILDING_ROOMS.forEach((room) => {
      const targetGroup = floorGroupsRef.current[room.floor]
      if (!targetGroup) return

      const roomGeo = new THREE.BoxGeometry(room.width, room.height, room.depth)
      const isLobbyOrGarden = room.roomType === "lobby" || room.roomType === "garden"
      
      const roomMat = new THREE.MeshLambertMaterial({
        color: new THREE.Color(room.color),
        transparent: true,
        opacity: isLobbyOrGarden ? 0.35 : 0.82,
      })

      const roomMesh = new THREE.Mesh(roomGeo, roomMat)
      roomMesh.position.set(room.x, room.height / 2, room.z)
      roomMesh.userData = { room }

      // Thin architectural edge lines
      const edgeGeo = new THREE.EdgesGeometry(roomGeo)
      const edgeMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(room.color).clone().multiplyScalar(1.3),
        linewidth: 1,
      })
      const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat)
      roomMesh.add(edgeLines)

      targetGroup.add(roomMesh)
      roomMeshes.set(room.id, roomMesh)
    })

    roomMeshesRef.current = roomMeshes

    // Efficient On-Demand Animation Loop
    let clock = new THREE.Clock()
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate)

      const time = clock.getElapsedTime()
      let stillMoving = false

      // Smooth Lerp of Floor Y positions during Exploded transitions
      Object.keys(floorGroupsRef.current).forEach((key) => {
        const floorNum = parseInt(key)
        const group = floorGroupsRef.current[floorNum]
        if (!group) return

        const targetY = targetFloorYRef.current[floorNum] || 0
        const diff = targetY - currentFloorYRef.current[floorNum]

        if (Math.abs(diff) > 0.02) {
          stillMoving = true
          currentFloorYRef.current[floorNum] += diff * 0.12
          group.position.y = currentFloorYRef.current[floorNum]
        } else {
          currentFloorYRef.current[floorNum] = targetY
          group.position.y = targetY
        }
      })

      // Pulse glow on selected room
      if (selectedMeshRef.current) {
        stillMoving = true
        const pulse = 0.2 + 0.15 * Math.sin(time * 5)
        const mat = selectedMeshRef.current.material as THREE.MeshLambertMaterial
        if (mat) {
          mat.emissive = new THREE.Color("#fbbf24")
          mat.emissiveIntensity = pulse
        }
      }

      controls.update()
      renderer.render(scene, camera)

      // Stop loop if resting and controls are static to save CPU/GPU
      if (!stillMoving && !isAnimatingRef.current) {
        // Idle
      }
    }

    animate()

    // Handle Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
      requestFrame()
    }

    window.addEventListener("resize", handleResize)

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize)
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [requestFrame])

  // Update Exploded View & Floor Filter Targets
  useEffect(() => {
    const baseY2 = isExploded ? 11.0 : 4.8
    const baseY3 = isExploded ? 22.0 : 9.6

    targetFloorYRef.current = {
      1: 0,
      2: baseY2,
      3: baseY3,
    }

    // Toggle Floor Visibility
    Object.keys(floorGroupsRef.current).forEach((key) => {
      const floorNum = parseInt(key) as 1 | 2 | 3
      const group = floorGroupsRef.current[floorNum]
      if (!group) return

      group.visible = activeFloor === "all" || activeFloor === floorNum
    })

    requestFrame()
  }, [isExploded, activeFloor, requestFrame])

  // Handle Selected Room Highlight
  useEffect(() => {
    if (selectedMeshRef.current) {
      const prevMat = selectedMeshRef.current.material as THREE.MeshLambertMaterial
      if (prevMat) {
        prevMat.emissive = new THREE.Color(0x000000)
        prevMat.emissiveIntensity = 0
      }
      selectedMeshRef.current = null
    }

    if (selectedRoomId) {
      const mesh = roomMeshesRef.current.get(selectedRoomId)
      if (mesh) {
        selectedMeshRef.current = mesh
      }
    }

    requestFrame()
  }, [selectedRoomId, requestFrame])

  // Pointer Interaction
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current
    const camera = cameraRef.current
    if (!container || !camera) return

    const rect = container.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1

    setMousePos({ x: e.clientX, y: e.clientY })

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera)

    const visibleMeshes: THREE.Mesh[] = []
    roomMeshesRef.current.forEach((mesh) => {
      if (mesh.parent && mesh.parent.visible) {
        visibleMeshes.push(mesh)
      }
    })

    const intersects = raycaster.intersectObjects(visibleMeshes, false)

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh
      const hitRoom = hitMesh.userData.room as Room3D
      if (hitRoom) {
        setHoveredRoom(hitRoom)
        container.style.cursor = "pointer"
        return
      }
    }

    setHoveredRoom(null)
    container.style.cursor = "default"
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current
    const camera = cameraRef.current
    if (!container || !camera) return

    const rect = container.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera)

    const visibleMeshes: THREE.Mesh[] = []
    roomMeshesRef.current.forEach((mesh) => {
      if (mesh.parent && mesh.parent.visible) {
        visibleMeshes.push(mesh)
      }
    })

    const intersects = raycaster.intersectObjects(visibleMeshes, false)

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh
      const hitRoom = hitMesh.userData.room as Room3D
      if (hitRoom) {
        onSelectRoom(hitRoom)
        return
      }
    }

    onSelectRoom(null)
  }, [onSelectRoom])

  // Camera Presets
  const setCameraPreset = (view: "iso" | "top" | "front") => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    if (view === "iso") {
      camera.position.set(38, 36, 42)
      controls.target.set(0, 5, 0)
    } else if (view === "top") {
      camera.position.set(0, 60, 0.1)
      controls.target.set(0, 0, 0)
    } else if (view === "front") {
      camera.position.set(0, 8, 48)
      controls.target.set(0, 5, 0)
    }
    controls.update()
    requestFrame()
  }

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-950">
      {/* 3D Canvas Mount Point */}
      <div
        ref={containerRef}
        className="w-full h-full"
        onPointerMove={handlePointerMove}
        onClick={handleClick}
      />

      {/* Lightweight Floating Hover Tooltip */}
      {hoveredRoom && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full mb-3 px-3 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-xl text-white transition-opacity duration-150"
          style={{ left: mousePos.x, top: mousePos.y - 10 }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: hoveredRoom.color }}
            />
            <p className="font-semibold text-xs">{hoveredRoom.name}</p>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-600 bg-slate-800">
              T{hoveredRoom.floor}
            </Badge>
          </div>
          {hoveredRoom.deptName && (
            <p className="text-[11px] text-sky-400 mt-0.5 font-medium">{hoveredRoom.deptName}</p>
          )}
        </div>
      )}

      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none z-20">
        {/* Floor Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-xl shadow-xl pointer-events-auto">
          <Button
            size="sm"
            variant={activeFloor === "all" ? "default" : "ghost"}
            className={activeFloor === "all" ? "bg-red-600 hover:bg-red-700 text-white font-medium" : "text-slate-300 hover:text-white"}
            onClick={() => onSelectFloor?.("all")}
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            Toàn Tòa Nhà
          </Button>
          {FLOORS_CONFIG.map((f) => (
            <Button
              key={f.floor}
              size="sm"
              variant={activeFloor === f.floor ? "default" : "ghost"}
              className={activeFloor === f.floor ? "bg-red-600 hover:bg-red-700 text-white font-medium" : "text-slate-300 hover:text-white"}
              onClick={() => onSelectFloor?.(f.floor)}
            >
              T{f.floor}: {f.name}
            </Button>
          ))}
        </div>

        {/* View Action Buttons */}
        <div className="flex items-center gap-2 p-1 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-xl shadow-xl pointer-events-auto">
          <Button
            size="sm"
            variant={isExploded ? "default" : "outline"}
            className={isExploded ? "bg-amber-600 hover:bg-amber-700 text-white" : "border-slate-700 text-slate-300 hover:text-white"}
            onClick={onToggleExploded}
            title="Tách rời các tầng"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            {isExploded ? "Gộp Tầng" : "Bóc Tách Tầng"}
          </Button>

          <div className="w-[1px] h-5 bg-slate-700 mx-1" />

          <Button
            size="sm"
            variant="ghost"
            className="text-slate-300 hover:text-white px-2.5"
            onClick={() => setCameraPreset("iso")}
            title="Góc 3D Isometric"
          >
            <Compass className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="text-slate-300 hover:text-white px-2.5"
            onClick={() => setCameraPreset("top")}
            title="Mặt bằng Top-down"
          >
            <Eye className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="text-slate-300 hover:text-white px-2.5"
            onClick={() => setCameraPreset("front")}
            title="Góc sảnh chính"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Bottom Hint Banner */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 pointer-events-none z-10 text-xs text-slate-400 bg-slate-900/80 backdrop-blur-sm border border-slate-800/80 px-3 py-1.5 rounded-lg shadow-lg">
        <Info className="w-3.5 h-3.5 text-sky-400" />
        <span>Kéo chuột xoay 360° • Cuộn chuột zoom • Click vào phòng để xem danh sách nhân sự</span>
      </div>
    </div>
  )
}
