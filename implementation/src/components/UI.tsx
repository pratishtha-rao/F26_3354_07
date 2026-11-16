import type { PropsWithChildren } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
} from "react-native";

export const colors = {
  ink: "#183438",
  muted: "#637679",
  teal: "#167d78",
  pale: "#eaf5f2",
  paper: "#ffffff",
  canvas: "#f4f8f7",
  line: "#dce8e5",
  danger: "#a83c36",
  dangerPale: "#fff0ed",
};

export function Page({ children }: PropsWithChildren) {
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pageContent}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

interface FieldProps extends TextInputProps {
  label: string;
}

export function Field({ label, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          inputProps.multiline ? styles.multiline : undefined,
          inputProps.style,
        ]}
      />
    </View>
  );
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

export function Button({
  title,
  onPress,
  secondary = false,
  danger = false,
  disabled = false,
}: ButtonProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary ? styles.secondaryButton : undefined,
        danger ? styles.dangerButton : undefined,
        disabled ? styles.disabledButton : undefined,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary ? styles.secondaryButtonText : undefined,
          danger ? styles.dangerButtonText : undefined,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

export function Title({
  children,
  subtitle,
}: PropsWithChildren<{ subtitle?: string }>) {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.title}>{children}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Message({
  children,
  error = false,
}: PropsWithChildren<{ error?: boolean }>) {
  return (
    <Text style={[styles.message, error ? styles.errorMessage : undefined]}>
      {children}
    </Text>
  );
}

export function SectionTitle({ children }: PropsWithChildren) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  pageContent: {
    padding: 18,
    paddingBottom: 36,
    gap: 14,
  },
  card: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  field: {
    gap: 6,
  },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.teal,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonText: {
    color: colors.paper,
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: colors.pale,
  },
  secondaryButtonText: {
    color: colors.teal,
  },
  dangerButton: {
    backgroundColor: colors.dangerPale,
  },
  dangerButtonText: {
    color: colors.danger,
  },
  disabledButton: {
    opacity: 0.55,
  },
  titleBlock: {
    gap: 5,
    paddingVertical: 3,
  },
  title: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  message: {
    backgroundColor: colors.pale,
    borderRadius: 10,
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    overflow: "hidden",
    padding: 11,
  },
  errorMessage: {
    backgroundColor: colors.dangerPale,
    color: colors.danger,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
});
