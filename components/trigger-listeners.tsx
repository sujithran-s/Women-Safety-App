import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { Accelerometer } from "expo-sensors";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";

import { ShakePatternDetector } from "@/lib/shake-detector";

function normalized(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

export function VoiceSosListener({
  enabled,
  phrase,
  onMatch,
}: {
  enabled: boolean;
  phrase: string;
  onMatch: () => void;
}) {
  const phraseRef = useRef(phrase);
  const hasTriggeredRef = useRef(false);
  phraseRef.current = phrase;

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript ?? "";
    const expected = normalized(phraseRef.current);
    if (!hasTriggeredRef.current && expected && normalized(transcript).includes(expected)) {
      hasTriggeredRef.current = true;
      ExpoSpeechRecognitionModule.abort();
      onMatch();
    }
  });

  useEffect(() => {
    let active = true;
    async function begin() {
      if (!enabled || !phraseRef.current.trim()) return;
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!active || !permission.granted) return;
      hasTriggeredRef.current = false;
      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        continuous: true,
        interimResults: true,
        contextualStrings: [phraseRef.current],
        requiresOnDeviceRecognition: false,
      });
    }
    void begin();
    return () => {
      active = false;
      ExpoSpeechRecognitionModule.abort();
    };
  }, [enabled, phrase]);

  return null;
}

export function ShakeSosListener({ enabled, onPattern }: { enabled: boolean; onPattern: () => void }) {
  const detectorRef = useRef(new ShakePatternDetector());

  useEffect(() => {
    let subscription: ReturnType<typeof Accelerometer.addListener> | undefined;
    let mounted = true;

    async function begin() {
      if (!enabled) return;
      const available = await Accelerometer.isAvailableAsync();
      if (!mounted || !available) return;
      if (Platform.OS === "web") {
        const permission = await Accelerometer.requestPermissionsAsync();
        if (!permission.granted || !mounted) return;
      }
      Accelerometer.setUpdateInterval(200);
      subscription = Accelerometer.addListener((sample) => {
        if (detectorRef.current.ingest({ ...sample, timestamp: Date.now() })) onPattern();
      });
    }

    void begin();
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [enabled, onPattern]);

  return null;
}
