import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { DietRestriction, GuidanceKind } from "../domain/types";
import type { PatientDataRepository } from "../repositories/PatientDataRepository";
import {
  Button,
  Card,
  colors,
  Field,
  Message,
  Page,
  SectionTitle,
  Title,
} from "../components/UI";

interface DietScreenProps {
  items: DietRestriction[];
  repository: PatientDataRepository;
  onChanged: () => Promise<void>;
}

export function DietScreen({
  items,
  repository,
  onChanged,
}: DietScreenProps) {
  const [kind, setKind] = useState<GuidanceKind>("diet");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setError("");
    if (!title.trim() || !details.trim()) {
      setError("Enter a title and details for this guidance.");
      return;
    }

    setSaving(true);
    try {
      await repository.saveDietRestriction({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind,
        title: title.trim(),
        details: details.trim(),
        createdAt: new Date().toISOString(),
      });
      await onChanged();
      setTitle("");
      setDetails("");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The guidance could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: DietRestriction) => {
    setError("");
    try {
      await repository.deleteDietRestriction(item.id);
      await onChanged();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "The guidance could not be deleted.",
      );
    }
  };

  return (
    <Page>
      <Title subtitle="Keep your care team's food and activity guidance handy.">
        Diet & restrictions
      </Title>
      <Message>
        Record guidance provided by your healthcare team; Comet Care does not
        provide dietary or medical recommendations.
      </Message>
      <Card>
        <SectionTitle>Add guidance</SectionTitle>
        <View style={styles.kindRow}>
          <Button
            title="Diet"
            secondary={kind !== "diet"}
            onPress={() => setKind("diet")}
          />
          <Button
            title="Health restriction"
            secondary={kind !== "restriction"}
            onPress={() => setKind("restriction")}
          />
        </View>
        <Field
          label="Title"
          placeholder={kind === "diet" ? "For example, dietary guidance" : "For example, activity restriction"}
          value={title}
          onChangeText={setTitle}
        />
        <Field
          label="Details"
          multiline
          value={details}
          onChangeText={setDetails}
        />
        {error ? <Message error>{error}</Message> : null}
        <Button
          title={saving ? "Saving..." : "Save guidance"}
          disabled={saving}
          onPress={() => void save()}
        />
      </Card>
      <Card>
        <SectionTitle>Saved guidance</SectionTitle>
        {items.length === 0 ? (
          <Text style={styles.empty}>
            Diet guidance and restrictions you add will appear here.
          </Text>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.item}>
              <Text style={styles.kindLabel}>
                {item.kind === "diet" ? "DIET" : "HEALTH RESTRICTION"}
              </Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.details}>{item.details}</Text>
              <Button
                title="Delete"
                danger
                onPress={() => void remove(item)}
              />
            </View>
          ))
        )}
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  kindRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  empty: {
    color: colors.muted,
    fontSize: 14,
  },
  item: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: 7,
    paddingTop: 12,
  },
  kindLabel: {
    color: colors.teal,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  details: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
