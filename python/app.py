import os
import asyncio
import aiohttp

from pipecat.frames.frames import EndFrame, TextFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.task import PipelineTask
from pipecat.pipeline.runner import PipelineRunner
from pipecat.services.elevenlabs import ElevenLabsTTSService
from pipecat.transports.services.daily import DailyParams, DailyTransport

from dotenv import load_dotenv

load_dotenv()

async def main():
  async with aiohttp.ClientSession() as session:
    # Use Daily as a real-time media transport (WebRTC)
    transport = DailyTransport(
      room_url=os.getenv("DAILY_ROOM_URL"),
      token=os.getenv("DAILY_TOKEN"),
      bot_name="Hello Bot",
      params=DailyParams(audio_out_enabled=True))

    # Use Eleven Labs for Text-to-Speech
    tts = ElevenLabsTTSService(
      aiohttp_session=session,
      api_key=os.getenv("ELEVENLABS_API_KEY"),
      voice_id="21m00Tcm4TlvDq8ikWAM",  # Updated voice ID
      )

    # Simple pipeline that will process text to speech and output the result
    pipeline = Pipeline([tts, transport.output()])

    # Create Pipecat processor that can run one or more pipelines tasks
    runner = PipelineRunner()

    # Assign the task callable to run the pipeline
    task = PipelineTask(pipeline)

    # Register an event handler to play audio when a
    # participant joins the transport WebRTC session
    @transport.event_handler("on_participant_joined")
    async def on_new_participant_joined(transport, participant):
      participant_name = participant["info"]["userName"] or ''
      # Queue a TextFrame that will get spoken by the TTS service (Eleven Labs)
      await task.queue_frames([TextFrame(f"Hello there, {participant_name}!"), EndFrame()])

    # Run the pipeline task
    await runner.run(task)

if __name__ == "__main__":
  asyncio.run(main())