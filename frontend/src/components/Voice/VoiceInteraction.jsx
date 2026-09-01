import React, { useState, useEffect, useRef } from 'react';
import SecondSelfOrb from '../Orb/SecondSelfOrb';
import { Mic, MicOff, X, Send, AlertCircle } from 'lucide-react';

export default function VoiceInteraction({ isOpen, onClose, onSendMessage }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      setTranscript('');
      setErrorMsg(null);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg('Speech recognition is not supported in this browser environment.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg(null);
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMsg('Microphone access was denied. Please allow microphone permissions.');
        } else if (event.error !== 'no-speech') {
          setErrorMsg(`Voice error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to initialize Speech Recognition:', err);
      setErrorMsg('Could not start microphone input.');
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, [isOpen]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      try { recognitionRef.current.stop(); } catch (e) {}
      setIsListening(false);
    } else {
      try {
        setTranscript('');
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {}
    }
  };

  const handleSendTranscript = () => {
    const textToSend = transcript.trim();
    if (textToSend) {
      onSendMessage(textToSend);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="voice-overlay-backdrop">
      <div className="voice-modal-card">
        <button className="modal-close-btn" onClick={onClose} title="Close voice mode">
          <X size={16} />
        </button>

        <div className="voice-orb-wrapper">
          <SecondSelfOrb size="large" state={isListening ? 'thinking' : 'idle'} />
        </div>

        <div className="voice-status-header">
          <span className={`voice-live-badge ${isListening ? 'active' : ''}`}>
            <span className="pulse-red-dot" />
            {isListening ? 'LISTENING NOW' : 'PAUSED'}
          </span>
          <h3 className="voice-status-heading">
            {isListening ? 'Listening for your command...' : 'Microphone Paused'}
          </h3>
          <p className="voice-status-sub">
            {isListening ? 'Speak naturally to SecondSelf. Click Send when done.' : 'Click microphone to start listening again.'}
          </p>
        </div>

        {/* Live Recognized Transcript Display */}
        <div className="voice-transcript-box">
          {transcript ? (
            <p className="voice-transcript-text">"{transcript}"</p>
          ) : (
            <p className="voice-transcript-placeholder">
              {isListening ? 'Say something like "Search Google for AI frameworks" or "Open Notepad"...' : 'No voice detected yet.'}
            </p>
          )}
        </div>

        {errorMsg && (
          <div className="voice-error-banner">
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Animated Audio Waveform Frequencies */}
        <div className="voice-waveform-container">
          <div className={`waveform-bar ${isListening ? 'anim-1' : ''}`} />
          <div className={`waveform-bar ${isListening ? 'anim-2' : ''}`} />
          <div className={`waveform-bar ${isListening ? 'anim-3' : ''}`} />
          <div className={`waveform-bar ${isListening ? 'anim-4' : ''}`} />
          <div className={`waveform-bar ${isListening ? 'anim-5' : ''}`} />
          <div className={`waveform-bar ${isListening ? 'anim-3' : ''}`} />
          <div className={`waveform-bar ${isListening ? 'anim-1' : ''}`} />
        </div>

        <div className="voice-controls-action-bar">
          <button
            className={`voice-mic-toggle-btn ${isListening ? 'listening-active' : ''}`}
            onClick={toggleListening}
            title={isListening ? 'Pause listening' : 'Start listening'}
          >
            {isListening ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          {transcript.trim() && (
            <button
              className="voice-submit-prompt-btn"
              onClick={handleSendTranscript}
              title="Send recognized prompt"
            >
              <Send size={15} />
              <span>Send Command</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
