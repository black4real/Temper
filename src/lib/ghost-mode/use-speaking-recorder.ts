"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---- Minimal Web Speech API typings (not in the standard DOM lib) ----
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): { transcript: string };
  [index: number]: { transcript: string };
}
interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    item(i: number): SpeechRecognitionResultLike;
    [i: number]: SpeechRecognitionResultLike;
  };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function pickAudioMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export type RecorderStatus = "idle" | "requesting" | "recording" | "stopped";

export type RecorderState = {
  status: RecorderStatus;
  elapsed: number; // seconds
  transcript: string; // finalized text
  interim: string; // in-progress text
  transcriptionSupported: boolean;
  recordingSupported: boolean;
  error: string | null;
  audioBlob: Blob | null;
  audioUrl: string | null;
  audioMime: string;
};

export type SpeakingRecorder = RecorderState & {
  start: () => Promise<void>;
  stop: () => void;
  setTranscript: (value: string) => void;
  reset: () => void;
};

/** Manages mic recording + live transcription with a record-only / manual-transcript fallback. */
export function useSpeakingRecorder(): SpeakingRecorder {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscriptState] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMime, setAudioMime] = useState("");

  const transcriptionSupported = typeof window !== "undefined" && getSpeechRecognition() !== null;
  const recordingSupported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalTextRef = useRef("");
  const stoppingRef = useRef(false);
  const audioMimeRef = useRef("");

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const teardown = useCallback(() => {
    clearTimer();
    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    } catch {
      /* ignore */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    // Cleanup on unmount.
    return () => {
      teardown();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teardown]);

  const start = useCallback(async () => {
    setError(null);
    setTranscriptState("");
    setInterim("");
    setElapsed(0);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    finalTextRef.current = "";
    stoppingRef.current = false;
    chunksRef.current = [];

    if (!recordingSupported) {
      setError("Audio recording isn't supported in this browser.");
      return;
    }

    setStatus("requesting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access was blocked. Allow the mic and try again.");
      setStatus("idle");
      return;
    }
    streamRef.current = stream;

    // Audio recorder
    const mime = pickAudioMime();
    audioMimeRef.current = mime;
    setAudioMime(mime);
    try {
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const type = audioMimeRef.current || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };
      recorder.start();
      recorderRef.current = recorder;
    } catch {
      setError("Could not start the recorder.");
      teardown();
      setStatus("idle");
      return;
    }

    // Live transcription (best-effort)
    const SR = getSpeechRecognition();
    if (SR) {
      try {
        const recognition = new SR();
        recognition.lang = navigator.language || "en-US";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
          let interimText = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results.item(i);
            const text = result.item(0).transcript;
            if (result.isFinal) {
              finalTextRef.current = (finalTextRef.current + " " + text).trim();
            } else {
              interimText += text;
            }
          }
          setTranscriptState(finalTextRef.current);
          setInterim(interimText);
        };
        recognition.onerror = () => {
          /* non-fatal; recording continues */
        };
        recognition.onend = () => {
          // Chrome ends on pauses; restart while still recording.
          if (!stoppingRef.current) {
            try {
              recognition.start();
            } catch {
              /* ignore */
            }
          }
        };
        recognition.start();
        recognitionRef.current = recognition;
      } catch {
        recognitionRef.current = null;
      }
    }

    setStatus("recording");
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, [audioUrl, recordingSupported, teardown]);

  const stop = useCallback(() => {
    stoppingRef.current = true;
    clearTimer();
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop(); // triggers onstop → blob
      }
    } catch {
      /* ignore */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setInterim("");
    setStatus("stopped");
  }, []);

  const setTranscript = useCallback((value: string) => {
    finalTextRef.current = value;
    setTranscriptState(value);
  }, []);

  const reset = useCallback(() => {
    teardown();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setStatus("idle");
    setElapsed(0);
    setTranscriptState("");
    setInterim("");
    setError(null);
    setAudioBlob(null);
    setAudioUrl(null);
    finalTextRef.current = "";
  }, [audioUrl, teardown]);

  return {
    status,
    elapsed,
    transcript,
    interim,
    transcriptionSupported,
    recordingSupported,
    error,
    audioBlob,
    audioUrl,
    audioMime,
    start,
    stop,
    setTranscript,
    reset,
  };
}
