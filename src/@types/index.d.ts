export {}

declare global {
  interface Window {
    VERSION: string
    handPoseDetection: any
    fp: any
    tf: any
    tfdf: any
  }
}
