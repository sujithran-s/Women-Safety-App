import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DeviceContacts from "expo-contacts";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton, SectionHeading, palette } from "@/components/safety-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useSafety } from "@/lib/safety-context";
import type { EmergencyContact } from "@/shared/safety-types";

type DeviceContact = DeviceContacts.Contact;
const blank = { name: "", phone: "", relationship: "" };
const countryPrefixes = ["", "+91", "+1", "+44", "+61", "+971"];

function nextCountryPrefix(current: string) {
  return countryPrefixes[(countryPrefixes.indexOf(current) + 1) % countryPrefixes.length];
}

export default function ContactsScreen() {
  const { isAuthenticated, loading } = useAuth();
  const { contacts, addContact, updateContact, removeContact } = useSafety();
  const [editing, setEditing] = useState<EmergencyContact | null>(null);
  const [form, setForm] = useState(blank);
  const [countryPrefix, setCountryPrefix] = useState("+91");
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedDeviceContact, setSelectedDeviceContact] = useState<DeviceContact | null>(null);

  if (loading) return <ScreenContainer />;
  if (!isAuthenticated) {
    router.replace("/auth");
    return <ScreenContainer />;
  }

  const openNew = () => { setEditing(null); setForm(blank); setCountryPrefix("+91"); setFormOpen(true); };
  const save = async () => {
    const localNumber = form.phone.trim();
    const phone = countryPrefix && !localNumber.startsWith("+") ? `${countryPrefix} ${localNumber}` : localNumber;
    if (!form.name.trim() || !/^\+?[0-9][0-9\s().-]{6,30}$/.test(phone)) {
      Alert.alert("Complete contact details", "Enter a name and a valid mobile number.");
      return;
    }
    const saved = editing ? (updateContact({ ...editing, ...form, phone, source: editing.source ?? "manual", confirmed: true }), true) : await addContact({ ...form, phone, source: "manual", confirmed: true });
    if (!saved) {
      Alert.alert("Could not save contact", "Your session may have expired. Sign in again and retry.");
      return;
    }
    setEditing(null); setForm(blank); setCountryPrefix("+91"); setFormOpen(false);
  };
  const importContacts = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Device contacts unavailable", "Contact import is available on iOS and Android. Use Add Manually on the web.");
      return;
    }
    let permission: DeviceContacts.PermissionResponse;
    try {
      permission = await DeviceContacts.requestPermissionsAsync();
    } catch {
      Alert.alert("Contacts unavailable", "The device did not provide contact access. You can still add a trusted contact manually.");
      return;
    }
    if (!permission.granted) {
      Alert.alert("Contacts permission needed", "Allow contact access to import a trusted emergency contact. You can still add one manually.");
      return;
    }
    let result: DeviceContacts.ContactResponse;
    try {
      result = await DeviceContacts.getContactsAsync({ fields: [DeviceContacts.Fields.FirstName, DeviceContacts.Fields.LastName, DeviceContacts.Fields.PhoneNumbers], sort: DeviceContacts.SortTypes.FirstName });
    } catch {
      Alert.alert("Could not read contacts", "Contact access was granted, but the device contact list could not be read.");
      return;
    }
    const usable = result.data.filter((contact) => contact.phoneNumbers?.some((phone) => phone.number));
    if (!usable.length) Alert.alert("No phone contacts found", "Choose Add Manually to enter a trusted contact.");
    else { setDeviceContacts(usable); setPickerOpen(true); }
  };
  const confirmDeviceContact = async () => {
    if (!selectedDeviceContact) return;
    const phone = selectedDeviceContact.phoneNumbers?.find((item) => item.number)?.number?.trim();
    if (!phone) return;
    const saved = await addContact({ name: selectedDeviceContact.name || [selectedDeviceContact.firstName, selectedDeviceContact.lastName].filter(Boolean).join(" ") || "Trusted contact", phone, relationship: "Device contact", source: "device_linked", confirmed: true });
    if (!saved) {
      Alert.alert("Could not import contact", "Your session may have expired. Sign in again and retry.");
      return;
    }
    setSelectedDeviceContact(null); setPickerOpen(false);
  };
  const confirmDelete = (contact: EmergencyContact) => Alert.alert("Remove trusted contact?", `${contact.name} will no longer receive safety alerts.`, [{ text: "Keep", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => removeContact(contact.id) }]);
  const edit = (contact: EmergencyContact) => {
    const matchedPrefix = countryPrefixes.find((prefix) => prefix && contact.phone.startsWith(prefix)) ?? "";
    setEditing(contact); setCountryPrefix(matchedPrefix); setForm({ name: contact.name, phone: matchedPrefix ? contact.phone.slice(matchedPrefix.length).trim() : contact.phone, relationship: contact.relationship }); setFormOpen(true);
  };

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <View style={styles.page}>
        <SectionHeading eyebrow="Protected alert recipients" title="Trusted contacts" detail="Import a real device contact or add one manually. You confirm every recipient before alerts can be sent." />
        <View style={styles.actionRow}><PrimaryButton label="Import from Contacts" icon="contacts" onPress={() => void importContacts()} style={styles.actionButton} /><PrimaryButton label="Add Manually" icon="person-add" tone="navy" onPress={openNew} style={styles.actionButton} /></View>
        <FlatList data={contacts} keyExtractor={(item) => item.id} contentContainerStyle={contacts.length ? styles.list : styles.empty} ListEmptyComponent={<View style={styles.emptyCard}><MaterialIcons name="people-outline" size={36} color={palette.muted} /><Text style={styles.emptyTitle}>Add someone you trust</Text><Text style={styles.emptyText}>Your offline SMS fallback and online alerts use this shared trusted-contact store.</Text></View>} renderItem={({ item }) => <View style={styles.contact}><View style={styles.avatar}><Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.contactCopy}><Text style={styles.contactName}>{item.name}</Text><Text style={styles.contactDetail}>{item.relationship} · {item.phone}</Text><Text style={styles.source}>{item.source === "device_linked" ? "Imported and confirmed" : "Added manually and confirmed"}</Text></View><Pressable onPress={() => edit(item)} hitSlop={10} accessibilityLabel={`Edit ${item.name}`}><MaterialIcons name="edit" size={21} color={palette.navy} /></Pressable><Pressable onPress={() => confirmDelete(item)} hitSlop={10} accessibilityLabel={`Delete ${item.name}`}><MaterialIcons name="delete-outline" size={21} color={palette.red} /></Pressable></View>} />
      </View>
      <Modal animationType="slide" transparent visible={pickerOpen} onRequestClose={() => setPickerOpen(false)}><View style={styles.modalBackdrop}><View style={styles.sheet}><Text style={styles.sheetTitle}>Choose a device contact</Text><FlatList data={deviceContacts} keyExtractor={(_, index) => `contact-${index}`} style={styles.pickerList} renderItem={({ item }) => { const phone = item.phoneNumbers?.find((entry) => entry.number)?.number ?? ""; const selected = selectedDeviceContact === item; return <Pressable onPress={() => setSelectedDeviceContact(item)} style={[styles.pickerItem, selected && styles.pickerSelected]}><Text style={styles.pickerName}>{item.name || "Unnamed contact"}</Text><Text style={styles.pickerPhone}>{phone}</Text></Pressable>; }} /><View style={styles.actions}><PrimaryButton label="Cancel" tone="outline" onPress={() => { setPickerOpen(false); setSelectedDeviceContact(null); }} style={styles.actionButton} /><PrimaryButton label="Confirm trusted contact" onPress={confirmDeviceContact} disabled={!selectedDeviceContact} style={styles.actionButton} /></View></View></View></Modal>
      <Modal animationType="slide" transparent visible={formOpen} onRequestClose={() => { setEditing(null); setForm(blank); setFormOpen(false); }}><View style={styles.modalBackdrop}><View style={styles.sheet}><Text style={styles.sheetTitle}>{editing ? "Edit trusted contact" : "Add contact manually"}</Text><Field label="Name" value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} placeholder="Full name" /><Text style={styles.label}>Country prefix (optional)</Text><Pressable onPress={() => setCountryPrefix(nextCountryPrefix(countryPrefix))} style={styles.countryPicker}><Text style={styles.countryPickerText}>{countryPrefix || "No country prefix"}</Text><Text style={styles.countryPickerHint}>Tap to change: India +91 · US +1 · UK +44 · Australia +61 · UAE +971</Text></Pressable><Field label="Mobile number" value={form.phone} onChangeText={(phone) => setForm((current) => ({ ...current, phone }))} placeholder="98765 43210" keyboardType="phone-pad" /><Text style={styles.helpText}>You may enter a full international number beginning with +, or use the optional prefix above.</Text><Field label="Relationship (optional)" value={form.relationship} onChangeText={(relationship) => setForm((current) => ({ ...current, relationship }))} placeholder="Friend, sister, colleague" /><View style={styles.actions}><PrimaryButton label="Cancel" tone="outline" onPress={() => { setEditing(null); setForm(blank); setFormOpen(false); }} style={styles.actionButton} /><PrimaryButton label="Save contact" onPress={save} style={styles.actionButton} /></View></View></View></Modal>
    </ScreenContainer>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} style={styles.input} placeholderTextColor="#5F6F80" /></View>; }

const styles = StyleSheet.create({
  page: { flex: 1, paddingTop: 16, gap: 16 }, actionRow: { flexDirection: "row", gap: 10 }, actionButton: { flex: 1 }, list: { gap: 10, paddingBottom: 24 }, empty: { flexGrow: 1, justifyContent: "center", paddingBottom: 80 }, emptyCard: { alignItems: "center", gap: 10, borderWidth: 1, borderStyle: "dashed", borderColor: palette.border, borderRadius: 18, padding: 28 }, emptyTitle: { color: palette.ink, fontSize: 17, fontWeight: "800" }, emptyText: { color: palette.muted, textAlign: "center", lineHeight: 20 }, contact: { flexDirection: "row", alignItems: "center", gap: 11, borderRadius: 16, padding: 14, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border }, avatar: { width: 39, height: 39, borderRadius: 13, backgroundColor: palette.paleTeal, alignItems: "center", justifyContent: "center" }, avatarText: { color: palette.teal, fontWeight: "800", fontSize: 17 }, contactCopy: { flex: 1, gap: 3 }, contactName: { color: palette.ink, fontSize: 16, fontWeight: "800" }, contactDetail: { color: palette.navy, fontSize: 12 }, source: { color: palette.muted, fontSize: 11 }, modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10,25,38,0.38)" }, sheet: { maxHeight: "85%", backgroundColor: palette.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, gap: 16 }, sheetTitle: { color: palette.ink, fontSize: 21, fontWeight: "800" }, pickerList: { maxHeight: 360 }, pickerItem: { borderWidth: 1, borderColor: palette.border, padding: 13, borderRadius: 13, marginBottom: 8 }, pickerSelected: { borderColor: palette.teal, backgroundColor: palette.paleTeal }, pickerName: { color: palette.ink, fontWeight: "800", fontSize: 15 }, pickerPhone: { color: palette.navy, marginTop: 3 }, countryPicker: { borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, gap: 4 }, countryPickerText: { color: palette.ink, fontSize: 16, fontWeight: "700" }, countryPickerHint: { color: palette.muted, fontSize: 11, lineHeight: 16 }, helpText: { color: palette.muted, fontSize: 11, lineHeight: 16 }, field: { gap: 6 }, label: { color: palette.navy, fontSize: 13, fontWeight: "700" }, input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 13, color: palette.ink, fontSize: 16 }, actions: { flexDirection: "row", gap: 10 },
});
