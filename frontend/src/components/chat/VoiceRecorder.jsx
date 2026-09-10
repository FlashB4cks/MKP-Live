import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send } from 'lucide-react';

export default function VoiceRecorder({ onSendAudio, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    return () => {
      stopAndCleanup();
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const startRecording = async () => {
    if (disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('No se pudo acceder al micrófono para nota de voz', err);
    }
  };

  const stopAndCleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
  };

  const handleCancel = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopAndCleanup();
    audioChunksRef.current = [];
  };

  const handleSend = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    mediaRecorderRef.current.onstop = () => {
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      stopAndCleanup();
      if (audioBlob.size > 0 && onSendAudio) {
        onSendAudio(audioBlob, mimeType);
      }
    };

    mediaRecorderRef.current.stop();
  };

  if (!isRecording) {
    return (
      <button
        type="button"
        onClick={startRecording}
        disabled={disabled}
        className="text-discord-text-muted hover:text-white transition disabled:opacity-30 p-1 rounded-md hover:bg-white/5"
        title="Grabar nota de voz"
      >
        <Mic className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="flex items-center space-x-2 bg-black/40 border border-discord-red/40 px-2.5 py-1 rounded-lg animate-in fade-in select-none">
      <span className="w-2.5 h-2.5 rounded-full bg-discord-red animate-pulse" />
      <span className="text-xs font-mono text-discord-red font-bold">
        {formatTime(recordingTime)}
      </span>

      <button
        type="button"
        onClick={handleCancel}
        className="p-1 text-discord-text-muted hover:text-discord-red transition rounded hover:bg-white/5"
        title="Cancelar nota de voz"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={handleSend}
        className="p-1 text-white bg-discord-blurple hover:bg-discord-blurple-hover transition rounded-md shadow"
        title="Enviar nota de voz"
      >
        <Send className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
