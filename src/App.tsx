import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core@4.2.0/dist/tf-core.min.js'
import 'https://unpkg.com/@tensorflow/tfjs-backend-webgl@3.7.0/dist/tf-backend-webgl.min.js'
import 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/hands.min.js'
import 'https://cdn.jsdelivr.net/npm/@tensorflow-models/hand-pose-detection@2.0.0/dist/hand-pose-detection.min.js'
import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.5.0/dist/tf.min.js'
import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tfdf/dist/tf-tfdf.min.js'

import { useEffect, useRef } from 'react'

export function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frame = useRef(0)
  let detector: any
  let librasModel: any

  const FINGER_LOOKUP_INDICES: any = {
    thumb: [0, 1, 2, 3, 4],
    indexFinger: [0, 5, 6, 7, 8],
    middleFinger: [0, 9, 10, 11, 12],
    ringFinger: [0, 13, 14, 15, 16],
    pinky: [0, 17, 18, 19, 20],
  }

  const drawHands = (hands: any, ctx: any, showNames = false) => {
    if (hands.length <= 0) {
      return
    }

    hands.sort((hand1: any, hand2: any) => {
      if (hand1.handedness < hand2.handedness) return 1
      if (hand1.handedness > hand2.handedness) return -1
      return 0
    })

    for (let i = 0; i < hands.length; i++) {
      ctx.fillStyle = hands[i].handedness === 'Left' ? 'black' : 'Blue'
      ctx.strokeStyle = 'White'
      ctx.lineWidth = 2

      for (let y = 0; y < hands[i].keypoints.length; y++) {
        const keypoint = hands[i].keypoints[y]
        ctx.beginPath()
        ctx.arc(keypoint.x, keypoint.y, 4, 0, 2 * Math.PI)
        ctx.fill()

        if (showNames) {
          drawInvertedText(keypoint, ctx)
        }
      }

      const fingers = Object.keys(FINGER_LOOKUP_INDICES)
      for (let z = 0; z < fingers.length; z++) {
        const finger = fingers[z]
        const points = FINGER_LOOKUP_INDICES[finger].map(
          (idx: any) => hands[i].keypoints[idx],
        )
        drawPath(points, ctx)
      }
    }
  }

  const drawInvertedText = (keypoint: any, ctx: any) => {
    ctx.save()
    ctx.translate(keypoint.x - 10, keypoint.y)
    ctx.rotate(-Math.PI / 1)
    ctx.scale(1, -1)
    ctx.fillText(keypoint.name, 0, 0)
    ctx.restore()
  }

  const drawPath = (points: any, ctx: any, closePath = false) => {
    const region = new Path2D()
    region.moveTo(points[0]?.x, points[0]?.y)
    for (let i = 1; i < points.length; i++) {
      const point = points[i]
      region.lineTo(point?.x, point?.y)
    }

    if (closePath) {
      region.closePath()
    }

    ctx.stroke(region)
  }

  function browserSupportMediaDevices() {
    return navigator?.mediaDevices || navigator?.mediaDevices.getUserMedia
  }

  function getCamera() {
    return videoRef.current as HTMLVideoElement
  }

  function getCanvas() {
    return canvasRef.current as HTMLCanvasElement
  }

  async function setupCamera() {
    const camera = getCamera()

    const videoConfig = {
      audio: false,
      video: {
        frameRate: {
          ideal: 60,
        },
      },
    }

    const stream = await navigator.mediaDevices.getUserMedia(videoConfig)
    camera.srcObject = stream

    await new Promise((resolve) => {
      camera.onloadedmetadata = () => {
        resolve(videoRef.current)
      }
    })

    camera.width = camera.videoWidth
    camera.height = camera.videoHeight

    camera.play()
  }

  function setupCanvas() {
    const canvas = getCanvas()
    const camera = getCamera()

    canvas.width = camera.width
    canvas.height = camera.height
  }

  async function loadHandPoseDetectionModel() {
    if (!detector) {
      const handsVersion = window.VERSION
      const detectorConfig = {
        runtime: 'mediapipe',
        solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${handsVersion}`,
        modelType: 'lite',
        maxHands: 2,
      }

      detector = await window.handPoseDetection.createDetector(
        window.handPoseDetection.SupportedModels.MediaPipeHands,
        detectorConfig,
      )
    }
  }

  async function loadTFDFModel() {
    librasModel = await window.tfdf.loadTFDFModel(
      'https://cdn.jsdelivr.net/gh/arrudadev/tf-decision-forests-libras/model.json',
    )
  }

  function landmarksToTensor(landmarks: any) {
    const inputData = {} as any

    landmarks.forEach((landmark: any) => {
      inputData[`${landmark.name}_x`] = window.tf.tensor1d([landmark.x])
      inputData[`${landmark.name}_y`] = window.tf.tensor1d([landmark.y])
    })

    return inputData
  }

  async function estimateHands() {
    const camera = getCamera()
    const canvas = getCanvas()
    const ctx = canvas.getContext('2d')

    const handsPredictions = await detector.estimateHands(camera, {
      flipHorizontal: false,
    })

    ctx?.clearRect(0, 0, camera.videoWidth, camera.videoHeight)
    ctx?.drawImage(camera, 0, 0, camera.videoWidth, camera.videoHeight)

    if (handsPredictions?.length) {
      drawHands(handsPredictions, ctx)
      const inputData = landmarksToTensor(handsPredictions[0].keypoints)
      const prediction = await librasModel.executeAsync(inputData)
      console.log(prediction)
    }

    estimateHandsFrameLoop()
  }

  function estimateHandsFrameLoop() {
    // eslint-disable-next-line
    // @ts-ignore
    frame.current = requestAnimationFrame(estimateHands)
  }

  async function init() {
    if (!browserSupportMediaDevices()) {
      throw new Error(
        `Browser API navigator.mediaDevices.getUserMedia not available`,
      )
    }

    await setupCamera()
    setupCanvas()
    await loadHandPoseDetectionModel()
    await loadTFDFModel()
    estimateHandsFrameLoop()
  }

  useEffect(() => {
    init()

    return () => cancelAnimationFrame(frame.current)
  }, [])

  return (
    <main className="px-8">
      <div className="min-h-screen py-8 flex-grow flex flex-col items-center">
        <h1 className="text-4xl text-black font-bold mb-8">
          Libras interpreter
        </h1>

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
      </div>
    </main>
  )
}
