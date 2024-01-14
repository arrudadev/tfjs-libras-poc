import { useEffect, useRef } from 'react'

export function Video() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frame = useRef(0)

  async function setup() {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const constraints = {
      audio: false,
      video: {
        frameRate: { ideal: 60 },
      },
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    video.srcObject = stream

    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        resolve(videoRef.current)
      }
    })

    video.play()
    drawVideoInCanvas()
  }

  function drawVideoInCanvas() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const width = video.videoWidth
    const height = video.videoHeight
    canvas.width = width
    canvas.height = height
    context.clearRect(0, 0, width, height)
    context.drawImage(video, 0, 0, width, height)

    frame.current = requestAnimationFrame(drawVideoInCanvas)
  }

  useEffect(() => {
    setup()

    return () => {
      cancelAnimationFrame(frame.current)
    }
  }, [])

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          transform: 'scaleX(-1)',
          zIndex: 1,
          borderRadius: '1rem',
          boxShadow: '0 3px 10px rgb(0 0 0)',
          maxWidth: '85vw',
        }}
        id="canvas"
      ></canvas>

      <video
        ref={videoRef}
        style={{
          visibility: 'hidden',
          transform: 'scaleX(-1)',
          position: 'absolute',
          top: 0,
          left: 0,
          width: 0,
          height: 0,
        }}
        id="video"
        playsInline
      ></video>
    </>
  )
}
