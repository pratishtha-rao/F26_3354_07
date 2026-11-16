import AsyncStorage from "@react-native-async-storage/async-storage";
import { LocalPatientDataRepository } from "./LocalPatientDataRepository";

export const patientDataRepository = new LocalPatientDataRepository({
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
});
