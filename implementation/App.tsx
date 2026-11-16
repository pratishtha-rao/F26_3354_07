import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { AppointmentScreen } from "./src/screens/AppointmentScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { DietScreen } from "./src/screens/DietScreen";
import { MedicationScreen } from "./src/screens/MedicationScreen";
import { RecoveryScreen } from "./src/screens/RecoveryScreen";
import { SummaryScreen } from "./src/screens/SummaryScreen";
import { TestResultsScreen } from "./src/screens/TestResultsScreen";
import type { PatientDataSnapshot } from "./src/domain/types";
import { patientDataRepository } from "./src/repositories/asyncStorage";
import { Button, colors, Message } from "./src/components/UI";

type AppTab =
  | "home"
  | "recovery"
  | "medications"
  | "appointments"
  | "diet"
  | "tests"
  | "summary";

const tabs: { key: AppTab; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "recovery", label: "Recovery" },
  { key: "medications", label: "Meds" },
  { key: "appointments", label: "Visits" },
  { key: "diet", label: "Diet" },
  { key: "tests", label: "Tests" },
  { key: "summary", label: "Summary" },
];

const compactTabLabels: Record<AppTab, string> = {
  home: "Home",
  recovery: "Log",
  medications: "Meds",
  appointments: "Visits",
  diet: "Diet",
  tests: "Labs",
  summary: "PDF",
};

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [snapshot, setSnapshot] = useState<PatientDataSnapshot | null>(null);
  const [error, setError] = useState("");
  const { width } = useWindowDimensions();

  const refresh = useCallback(async () => {
    setSnapshot(await patientDataRepository.getSnapshot());
  }, []);

  useEffect(() => {
    void (async () => {
      await patientDataRepository.purgeExpiredMedications();
      await refresh();
    })().catch((loadError: unknown) => {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Saved data could not be loaded.",
      );
    });
  }, [refresh]);

  const refreshAfterChange = async () => {
    try {
      await refresh();
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Saved data could not be refreshed.",
      );
      throw loadError;
    }
  };

  const retryLoading = async () => {
    try {
      await refresh();
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Saved data could not be loaded.",
      );
    }
  };

  let content = null;
  if (snapshot) {
    switch (activeTab) {
      case "home":
        content = <DashboardScreen snapshot={snapshot} />;
        break;
      case "recovery":
        content = (
          <RecoveryScreen
            entries={snapshot.recoveryEntries}
            repository={patientDataRepository}
            onChanged={refreshAfterChange}
          />
        );
        break;
      case "medications":
        content = (
          <MedicationScreen
            medications={snapshot.medications}
            repository={patientDataRepository}
            onChanged={refreshAfterChange}
          />
        );
        break;
      case "appointments":
        content = (
          <AppointmentScreen
            appointments={snapshot.appointments}
            repository={patientDataRepository}
            onChanged={refreshAfterChange}
          />
        );
        break;
      case "diet":
        content = (
          <DietScreen
            items={snapshot.dietRestrictions}
            repository={patientDataRepository}
            onChanged={refreshAfterChange}
          />
        );
        break;
      case "tests":
        content = (
          <TestResultsScreen
            items={snapshot.testResults}
            repository={patientDataRepository}
            onChanged={refreshAfterChange}
          />
        );
        break;
      case "summary":
        content = <SummaryScreen snapshot={snapshot} />;
        break;
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>COMET CARE</Text>
          <Text style={styles.headerTitle}>Recovery companion</Text>
        </View>
        <View style={styles.mark}>
          <Text style={styles.markText}>C</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.error}>
          <Message error>{error}</Message>
          <Button
            title="Retry loading"
            secondary
            onPress={() => void retryLoading()}
          />
        </View>
      ) : null}

      <View style={styles.content}>
        {snapshot ? (
          content
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.teal} />
            <Text style={styles.loadingText}>Loading your recovery data...</Text>
          </View>
        )}
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setActiveTab(tab.key)}
              style={styles.tab}
            >
              <Text
                style={[
                  styles.tabLabel,
                  width < 480 && styles.compactTabLabel,
                  selected && styles.selectedTab,
                ]}
              >
                {width < 640 ? compactTabLabels[tab.key] : tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  brand: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 2,
  },
  mark: {
    alignItems: "center",
    backgroundColor: colors.pale,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  markText: {
    color: colors.teal,
    fontSize: 20,
    fontWeight: "800",
  },
  content: {
    flex: 1,
  },
  error: {
    gap: 6,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  loading: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
  },
  loadingText: {
    color: colors.muted,
    fontSize: 14,
  },
  tabBar: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    height: 58,
    justifyContent: "space-around",
    paddingBottom: 8,
    paddingHorizontal: 4,
    paddingTop: 10,
    width: "100%",
  },
  tab: {
    alignItems: "center",
    flexBasis: "14.2857%",
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 1,
    width: "14.2857%",
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  compactTabLabel: {
    fontSize: 10,
  },
  selectedTab: {
    color: colors.teal,
    fontWeight: "800",
  },
});
