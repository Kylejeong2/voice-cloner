'use client'

import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import AudioVisualizer from '@/components/AudioVisualizer'

type Props = {}

const Dashboard = (props: Props) => {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [ivcTrained, setIvcTrained] = useState(false)
  const [chatHistory, setChatHistory] = useState<string[]>([])
  const [userResponse, setUserResponse] = useState('')
  const [audioData, setAudioData] = useState<Float32Array | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  useEffect(() => {
    if (ivcTrained) {
      startConversation()
    }
  }, [ivcTrained])

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mediaRecorder = new MediaRecorder(stream)
    mediaRecorderRef.current = mediaRecorder

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const sourceNode = audioContext.createMediaStreamSource(stream)
    const analyserNode = audioContext.createAnalyser()
    analyserNode.fftSize = 256 // Reduced for smoother animation
    sourceNode.connect(analyserNode)

    const audioChunks: BlobPart[] = []
    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data)
    }

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
      setAudioBlob(audioBlob)
      trainIVC(audioBlob)
      setAudioData(null)
    }

    mediaRecorder.start()
    setIsRecording(true)

    const updateAudioData = () => {
      const dataArray = new Float32Array(analyserNode.fftSize)
      analyserNode.getFloatTimeDomainData(dataArray)
      setAudioData(dataArray)
      if (isRecording) {
        requestAnimationFrame(updateAudioData)
      }
    }
    updateAudioData()
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const trainIVC = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob)

      const response = await axios.post('https://api.elevenlabs.io/v1/voices/add', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
        },
      })

      if (response.data.voice_id) {
        setIvcTrained(true)
      }
    } catch (error) {
      console.error('Error training IVC:', error)
    }
  }

  const startConversation = async () => {
    const initialMessage = "Hi there! I'm your AI assistant. How are you feeling today?"
    setChatHistory([initialMessage])
    await speakMessage(initialMessage)
  }

  const handleUserResponse = async () => {
    setChatHistory([...chatHistory, `User: ${userResponse}`])
    const aiResponse = await getAIResponse(userResponse)
    setChatHistory([...chatHistory, `User: ${userResponse}`, `AI: ${aiResponse}`])
    await speakMessage(aiResponse)
    setUserResponse('')
  }

  const getAIResponse = async (userMessage: string) => {
    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: userMessage }],
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      })

      return response.data.choices[0].message.content
    } catch (error) {
      console.error('Error getting AI response:', error)
      return 'I apologize, but I encountered an error. Could you please try again?'
    }
  }

  const speakMessage = async (message: string) => {
    try {
      const response = await axios.post('https://api.elevenlabs.io/v1/text-to-speech/your-voice-id', {
        text: message,
      }, {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
        },
        responseType: 'arraybuffer',
      })

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(response.data)
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)
      source.start(0)
    } catch (error) {
      console.error('Error speaking message:', error)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold mb-8">Voice Cloning Dashboard</h1>
      
      {!ivcTrained ? (
        <div className="mb-8 flex flex-col items-center">
          <button
            className={`px-4 py-2 rounded ${isRecording ? 'bg-red-500' : 'bg-blue-500'} text-white mb-4`}
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          {isRecording && <AudioVisualizer audioData={audioData} />}
          {audioBlob && <p className="mt-2">Audio recorded! Training IVC...</p>}
        </div>
      ) : (
        <div className="w-full max-w-md">
          <div className="bg-gray-100 p-4 rounded-lg mb-4 h-64 overflow-y-auto">
            {chatHistory.map((message, index) => (
              <p key={index} className="mb-2">{message}</p>
            ))}
          </div>
          <div className="flex">
            <input
              type="text"
              value={userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              className="flex-grow px-4 py-2 rounded-l border border-gray-300"
              placeholder="Type your response..."
            />
            <button
              onClick={handleUserResponse}
              className="px-4 py-2 rounded-r bg-green-500 text-white"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard