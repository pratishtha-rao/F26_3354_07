import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import type { DocumentPickerAsset } from "expo-document-picker";
import * as Sharing from "expo-sharing";

export const MAX_TEST_RESULT_BYTES = 10 * 1024 * 1024;

export interface StoredTestResultFile {
  storageKey: string;
  sizeBytes: number;
  mimeType: string;
}

export interface TestResultFileStore {
  save(asset: DocumentPickerAsset, id: string): Promise<StoredTestResultFile>;
  open(storageKey: string, fileName: string, mimeType: string): Promise<void>;
  delete(storageKey: string): Promise<void>;
}

const DATABASE_NAME = "comet-care-test-results";
const FILES_STORE = "files";

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new Error("This browser does not support local file storage."),
    );
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(FILES_STORE)) {
        request.result.createObjectStore(FILES_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open browser file storage."));
  });
}

function saveBrowserFile(key: string, file: File): Promise<void> {
  return openDatabase().then(
    (database) =>
      new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(FILES_STORE, "readwrite");
        transaction.objectStore(FILES_STORE).put(file, key);
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          reject(
            transaction.error ??
              new Error("The test result could not be saved in this browser."),
          );
        };
        transaction.onabort = () => {
          database.close();
          reject(
            transaction.error ??
              new Error("The browser canceled saving the test result."),
          );
        };
      }),
  );
}

function readBrowserFile(key: string): Promise<Blob> {
  return openDatabase().then(
    (database) =>
      new Promise<Blob>((resolve, reject) => {
        const transaction = database.transaction(FILES_STORE, "readonly");
        const request = transaction.objectStore(FILES_STORE).get(key);
        let result: unknown;
        request.onsuccess = () => {
          result = request.result;
        };
        request.onerror = () => {
          database.close();
          reject(
            request.error ??
              new Error("The saved test result could not be opened."),
          );
        };
        transaction.oncomplete = () => {
          database.close();
          if (result instanceof Blob) {
            resolve(result);
          } else {
            reject(new Error("The saved test result file is no longer available."));
          }
        };
        transaction.onerror = () => {
          database.close();
          reject(
            transaction.error ??
              new Error("The saved test result could not be opened."),
          );
        };
      }),
  );
}

function deleteBrowserFile(key: string): Promise<void> {
  return openDatabase().then(
    (database) =>
      new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(FILES_STORE, "readwrite");
        transaction.objectStore(FILES_STORE).delete(key);
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          reject(
            transaction.error ??
              new Error("The test result file could not be deleted."),
          );
        };
      }),
  );
}

function safeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export class LocalTestResultFileStore implements TestResultFileStore {
  async save(
    asset: DocumentPickerAsset,
    id: string,
  ): Promise<StoredTestResultFile> {
    let sizeBytes = asset.size;
    if (sizeBytes === undefined && Platform.OS !== "web") {
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      if (fileInfo.exists) {
        sizeBytes = fileInfo.size;
      }
    }

    if (sizeBytes === undefined || !Number.isFinite(sizeBytes)) {
      throw new Error("The selected file size could not be determined.");
    }
    if (sizeBytes > MAX_TEST_RESULT_BYTES) {
      throw new Error("Test result files must be 10 MB or smaller.");
    }

    const mimeType = asset.mimeType ?? "application/octet-stream";
    if (Platform.OS === "web") {
      if (!asset.file) {
        throw new Error("The selected file is not available in the browser.");
      }
      const storageKey = `web:${id}`;
      await saveBrowserFile(storageKey, asset.file);
      return { storageKey, sizeBytes, mimeType };
    }

    const documentDirectory = FileSystem.documentDirectory;
    if (!documentDirectory) {
      throw new Error("Local document storage is not available on this device.");
    }

    const directory = `${documentDirectory}test-results/`;
    const directoryInfo = await FileSystem.getInfoAsync(directory);
    if (!directoryInfo.exists) {
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    }
    const storageKey = `${directory}${id}-${safeFileName(asset.name)}`;
    await FileSystem.copyAsync({ from: asset.uri, to: storageKey });
    return { storageKey, sizeBytes, mimeType };
  }

  async open(
    storageKey: string,
    fileName: string,
    mimeType: string,
  ): Promise<void> {
    if (Platform.OS === "web") {
      const file = await readBrowserFile(storageKey);
      const url = URL.createObjectURL(file);
      const opened = window.open(url, "_blank", "noopener");
      if (!opened) {
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }

    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("File sharing is not available on this device.");
    }
    await Sharing.shareAsync(storageKey, {
      dialogTitle: `Open ${fileName}`,
      mimeType,
    });
  }

  async delete(storageKey: string): Promise<void> {
    if (Platform.OS === "web") {
      await deleteBrowserFile(storageKey);
      return;
    }
    await FileSystem.deleteAsync(storageKey, { idempotent: true });
  }
}

export const testResultFileStore = new LocalTestResultFileStore();
