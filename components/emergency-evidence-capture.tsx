import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Camera, CameraView } from "expo-camera";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { palette } from "@/components/safety-ui";
import { useSafety } from "@/lib/safety-context";

export function EmergencyEvidenceCapture() {
  const { privacy, currentIncident, attachEvidence } = useSafety();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const cameraRef = useRef<CameraView>(null);
  const [cameraVisible, setCameraVisible] = useState(false);

  if (!currentIncident || (!privacy.audioRecordingEnabled && !privacy.photoCaptureEnabled)) return null;

  const toggleAudio = async () => {
    try {
      if (recorderState.isRecording) {
        await recorder.stop();
        if (recorder.uri) attachEvidence({ audioUri: recorder.uri });
        return;
      }
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Microphone access is needed", "Audio evidence remains disabled because microphone permission was not granted.");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      Alert.alert("Audio capture unavailable", "The emergency session remains active, but a recording could not be started.");
    }
  };

  const openCamera = async () => {
    const permission = await Camera.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera access is needed", "Photo evidence remains disabled because camera permission was not granted.");
      return;
    }
    setCameraVisible(true);
  };

  const takePhoto = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7, exif: false });
      if (photo?.uri) attachEvidence({ photoUri: photo.uri });
      setCameraVisible(false);
    } catch {
      Alert.alert("Photo capture unavailable", "The emergency session remains active, but a photo could not be captured.");
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>OPTIONAL EVIDENCE — ENABLED BY YOU</Text>
      <View style={styles.actions}>
        {privacy.audioRecordingEnabled ? <EvidenceButton icon={recorderState.isRecording ? "stop-circle" : "mic"} label={recorderState.isRecording ? "Stop recording" : currentIncident.evidence?.audioUri ? "Audio attached" : "Record audio"} active={recorderState.isRecording} onPress={() => void toggleAudio()} /> : null}
        {privacy.photoCaptureEnabled ? <EvidenceButton icon="camera-alt" label={currentIncident.evidence?.photoUri ? "Photo attached" : "Capture photo"} onPress={() => void openCamera()} /> : null}
      </View>
      {cameraVisible ? <View style={styles.cameraWrap}><CameraView ref={cameraRef} style={styles.camera} facing="back"><View style={styles.cameraActions}><EvidenceButton icon="close" label="Close" onPress={() => setCameraVisible(false)} /><EvidenceButton icon="camera" label="Take photo" active onPress={() => void takePhoto()} /></View></CameraView></View> : null}
      {currentIncident.evidence?.audioUri || currentIncident.evidence?.photoUri ? <Text style={styles.attached}>Evidence is attached to this active incident on this device.</Text> : null}
    </View>
  );
}

function EvidenceButton({ icon, label, active = false, onPress }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; label: string; active?: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.button, active && styles.buttonActive, pressed && styles.pressed]}><MaterialIcons name={icon} size={18} color={active ? palette.white : palette.navy} /><Text style={[styles.buttonText, active && styles.buttonTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 10 },
  label: { color: palette.muted, fontWeight: "800", letterSpacing: 0.7, fontSize: 11 },
  actions: { flexDirection: "row", gap: 9, flexWrap: "wrap" },
  button: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.white },
  buttonActive: { backgroundColor: palette.red, borderColor: palette.red },
  buttonText: { color: palette.navy, fontSize: 13, fontWeight: "800" },
  buttonTextActive: { color: palette.white },
  pressed: { opacity: 0.75 },
  cameraWrap: { height: 300, overflow: "hidden", borderRadius: 18, backgroundColor: palette.ink },
  camera: { flex: 1 },
  cameraActions: { position: "absolute", left: 12, right: 12, bottom: 12, flexDirection: "row", justifyContent: "space-between", gap: 10 },
  attached: { color: palette.teal, fontSize: 12, lineHeight: 18, fontWeight: "600" },
});
