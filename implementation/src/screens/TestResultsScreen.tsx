import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { StyleSheet, Text, View } from "react-native";
import type { TestResult } from "../domain/types";
import type { PatientDataRepository } from "../repositories/PatientDataRepository";
import {
  testResultFileStore,
  MAX_TEST_RESULT_BYTES,
} from "../services/TestResultFileStore";
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

interface TestResultsScreenProps {
  items: TestResult[];
  repository: PatientDataRepository;
  onChanged: () => Promise<void>;
}

function formatFileSize(sizeBytes: number): string {
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

export function TestResultsScreen({
  items,
  repository,
  onChanged,
}: TestResultsScreenProps) {
  const [asset, setAsset] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectFile = async () => {
    setError("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) {
        return;
      }
      const selected = result.assets[0];
      if (!selected) {
        throw new Error("No file was returned by the document picker.");
      }
      if (selected.size !== undefined && selected.size > MAX_TEST_RESULT_BYTES) {
        throw new Error("Test result files must be 10 MB or smaller.");
      }
      setAsset(selected);
      setTitle(titleFromFileName(selected.name));
    } catch (pickerError) {
      setError(
        pickerError instanceof Error
          ? pickerError.message
          : "The file could not be selected.",
      );
    }
  };

  const save = async () => {
    setError("");
    if (!asset || !title.trim()) {
      setError("Select a test result file and enter a title.");
      return;
    }

    setSaving(true);
    try {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const stored = await testResultFileStore.save(asset, id);
      const item: TestResult = {
        id,
        title: title.trim(),
        fileName: asset.name,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        storageKey: stored.storageKey,
        addedAt: new Date().toISOString(),
      };

      try {
        await repository.saveTestResult(item);
      } catch (repositoryError) {
        try {
          await testResultFileStore.delete(stored.storageKey);
        } catch (cleanupError) {
          throw new Error(
            `${repositoryError instanceof Error ? repositoryError.message : "The test result record could not be saved."} The local file could not be cleaned up: ${
              cleanupError instanceof Error
                ? cleanupError.message
                : "unknown file storage error"
            }`,
          );
        }
        throw repositoryError;
      }

      await onChanged();
      setAsset(null);
      setTitle("");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The test result could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const open = async (item: TestResult) => {
    setError("");
    try {
      await testResultFileStore.open(
        item.storageKey,
        item.fileName,
        item.mimeType,
      );
    } catch (openError) {
      setError(
        openError instanceof Error
          ? openError.message
          : "The test result file could not be opened.",
      );
    }
  };

  const remove = async (item: TestResult) => {
    setError("");
    try {
      await repository.deleteTestResult(item.id);
      try {
        await testResultFileStore.delete(item.storageKey);
      } catch (fileError) {
        setError(
          `The result record was deleted, but its local file could not be removed: ${
            fileError instanceof Error
              ? fileError.message
              : "unknown file storage error"
          }`,
        );
      }
      await onChanged();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "The test result could not be deleted.",
      );
    }
  };

  return (
    <Page>
      <Title subtitle="Keep copies of test and lab results on this device.">
        Test results
      </Title>
      <Message>
        Files are stored locally and are not uploaded or backed up. Each file
        must be 10 MB or smaller.
      </Message>
      <Card>
        <SectionTitle>Add test result</SectionTitle>
        <Button
          title={asset ? "Choose a different file" : "Choose PDF or image"}
          secondary
          onPress={() => void selectFile()}
        />
        {asset ? (
          <Text style={styles.fileDetails}>
            {asset.name}
            {asset.size !== undefined
              ? ` (${formatFileSize(asset.size)})`
              : ""}
          </Text>
        ) : null}
        <Field
          label="Result title"
          value={title}
          onChangeText={setTitle}
        />
        {error ? <Message error>{error}</Message> : null}
        <Button
          title={saving ? "Saving..." : "Save result"}
          disabled={saving}
          onPress={() => void save()}
        />
      </Card>
      <Card>
        <SectionTitle>Saved results</SectionTitle>
        {items.length === 0 ? (
          <Text style={styles.empty}>Test results you add will appear here.</Text>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.item}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.fileDetails}>
                {item.fileName} · {formatFileSize(item.sizeBytes)}
              </Text>
              <Text style={styles.fileDetails}>
                Added {new Date(item.addedAt).toLocaleDateString()}
              </Text>
              <View style={styles.actions}>
                <Button
                  title="Open / download"
                  secondary
                  onPress={() => void open(item)}
                />
                <Button
                  title="Delete"
                  danger
                  onPress={() => void remove(item)}
                />
              </View>
            </View>
          ))
        )}
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
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
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  fileDetails: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
