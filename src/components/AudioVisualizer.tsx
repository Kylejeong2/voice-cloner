import React, { useRef, useEffect } from 'react'

interface AudioVisualizerProps {
  audioData: Float32Array | null
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !audioData) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2

    // Calculate the average amplitude
    const average = audioData.reduce((sum, value) => sum + Math.abs(value), 0) / audioData.length
    
    // Map the average to a radius between 20 and 50
    const radius = 20 + average * 60

    // Clear the canvas
    ctx.clearRect(0, 0, width, height)

    // Draw the circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(59, 130, 246, 0.5)' // Semi-transparent blue
    ctx.fill()

    // Draw the outer ring
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.strokeStyle = '#3B82F6' // Solid blue
    ctx.lineWidth = 2
    ctx.stroke()

  }, [audioData])

  return <canvas ref={canvasRef} width={200} height={200} className="mt-4" />
}

export default AudioVisualizer