from flask import Flask, request, send_file
from twilio.twiml.voice_response import VoiceResponse, Gather
import openai
from elevenlabs import generate, save
import os
from dotenv import load_dotenv
import logging

load_dotenv()

app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

# Initialize APIs
openai.api_key = os.getenv('OPENAI_API_KEY')
elevenlabs_api_key = os.getenv('ELEVENLABS_API_KEY')

def generate_response(input_text):
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",  # or "gpt-4" if you have access
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": input_text}
            ]
        )
        return response.choices[0].message['content']
    except Exception as e:
        logging.error(f"Error generating response: {str(e)}")
        return "I'm sorry, I'm having trouble thinking right now. Can you please try again?"

def text_to_speech(text):
    try:
        audio = generate(text=text, voice="Josh", api_key=elevenlabs_api_key)
        save(audio, "response.mp3")
        return "response.mp3"
    except Exception as e:
        logging.error(f"Error generating speech: {str(e)}")
        return None

@app.route("/incoming_call", methods=['POST'])
def incoming_call():
    response = VoiceResponse()
    gather = Gather(input='speech', action='/process_speech', method='POST', language='en-US', speechTimeout='auto')
    gather.say("Hello, this is an AI assistant. How can I help you today?")
    response.append(gather)
    return str(response)

@app.route("/process_speech", methods=['POST'])
def process_speech():
    user_speech = request.values.get('SpeechResult', '')
    logging.info(f"Received speech: {user_speech}")
    
    if user_speech:
        gpt_response = generate_response(user_speech)
        logging.info(f"GPT response: {gpt_response}")
        
        speech_file = text_to_speech(gpt_response)
        
        if speech_file:
            response = VoiceResponse()
            response.play(url_for('serve_audio', filename=speech_file, _external=True))
            
            gather = Gather(input='speech', action='/process_speech', method='POST', language='en-US', speechTimeout='auto')
            gather.say("Is there anything else I can help you with?")
            response.append(gather)
        else:
            response = VoiceResponse()
            response.say("I apologize, I'm having trouble speaking right now. Please try again later.")
    else:
        response = VoiceResponse()
        response.say("I'm sorry, I didn't catch that. Could you please repeat?")
        gather = Gather(input='speech', action='/process_speech', method='POST', language='en-US', speechTimeout='auto')
        response.append(gather)
    
    return str(response)

@app.route('/audio/<filename>')
def serve_audio(filename):
    return send_file(filename, mimetype='audio/mpeg')

if __name__ == "__main__":
    app.run(debug=True)