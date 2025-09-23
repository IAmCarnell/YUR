export interface AppInfo {
  id: string
  label: string
  icon: string
  color: string
  description: string
  launchUrl?: string
}

export interface SpatialPosition {
  x: number
  y: number
  z: number
}

export interface MandalaNode {
  app: AppInfo
  position: SpatialPosition
  angle: number
  radius: number
}

export interface ZoomLevel {
  scale: number
  focus: SpatialPosition
  label: string
}