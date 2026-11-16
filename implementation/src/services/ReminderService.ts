import { Platform } from "react-native";
import type { Appointment, Medication } from "../domain/types";

type ReminderResult = {
  message: string;
  scheduled: number;
};

const browserTimers = new Map<string, Set<number>>();
let nativeHandlerConfigured = false;

function trackBrowserTimer(ownerId: string, timerId: number): void {
  const timers = browserTimers.get(ownerId) ?? new Set<number>();
  timers.add(timerId);
  browserTimers.set(ownerId, timers);
}

function untrackBrowserTimer(ownerId: string, timerId: number): void {
  const timers = browserTimers.get(ownerId);
  timers?.delete(timerId);
  if (timers?.size === 0) {
    browserTimers.delete(ownerId);
  }
}

function clearBrowserTimers(ownerId: string): void {
  const timers = browserTimers.get(ownerId);
  if (!timers) {
    return;
  }
  timers.forEach((timerId) => window.clearTimeout(timerId));
  browserTimers.delete(ownerId);
}

function scheduleBrowserNotification(
  ownerId: string,
  title: string,
  body: string,
  targetTime: number,
  repeatDaily?: { hour: number; minute: number },
): void {
  const delay = Math.max(0, targetTime - Date.now());
  const timerId = window.setTimeout(() => {
    untrackBrowserTimer(ownerId, timerId);
    if (Date.now() < targetTime) {
      scheduleBrowserNotification(
        ownerId,
        title,
        body,
        targetTime,
        repeatDaily,
      );
      return;
    }

    if (window.Notification.permission === "granted") {
      new window.Notification(title, { body });
    }

    if (repeatDaily) {
      const next = new Date();
      next.setHours(repeatDaily.hour, repeatDaily.minute, 0, 0);
      if (next.getTime() <= Date.now()) {
        next.setDate(next.getDate() + 1);
      }
      scheduleBrowserNotification(
        ownerId,
        title,
        body,
        next.getTime(),
        repeatDaily,
      );
    }
  }, Math.min(delay, 2_000_000_000));
  trackBrowserTimer(ownerId, timerId);
}

async function requestPermission(): Promise<boolean> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }
    if (window.Notification.permission === "granted") {
      return true;
    }
    return (await window.Notification.requestPermission()) === "granted";
  }

  const notifications = await import("expo-notifications");
  if (Platform.OS === "android") {
    await notifications.setNotificationChannelAsync("reminders", {
      name: "Recovery reminders",
      importance: notifications.AndroidImportance.HIGH,
    });
  }

  let permissions = await notifications.getPermissionsAsync();
  if (permissions.status !== "granted") {
    permissions = await notifications.requestPermissionsAsync();
  }
  if (permissions.status !== "granted") {
    return false;
  }

  if (!nativeHandlerConfigured) {
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    nativeHandlerConfigured = true;
  }
  return true;
}

export function requestReminderPermission(): Promise<boolean> {
  return requestPermission();
}

async function cancelOwnerReminders(ownerId: string): Promise<void> {
  if (Platform.OS === "web") {
    clearBrowserTimers(ownerId);
    return;
  }

  const notifications = await import("expo-notifications");
  const scheduled =
    await notifications.getAllScheduledNotificationsAsync();
  const owned = scheduled.filter(
    (notification) => notification.content.data?.ownerId === ownerId,
  );
  await Promise.all(
    owned.map((notification) =>
      notifications.cancelScheduledNotificationAsync(notification.identifier),
    ),
  );
}

function scheduleWebDailyReminder(
  ownerId: string,
  title: string,
  body: string,
  time: string,
): void {
  const [hour, minute] = time.split(":").map(Number);
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= Date.now()) {
    next.setDate(next.getDate() + 1);
  }
  scheduleBrowserNotification(ownerId, title, body, next.getTime(), {
    hour,
    minute,
  });
}

function scheduleWebAppointmentReminder(
  ownerId: string,
  appointment: Appointment,
  targetTime: number,
): void {
  scheduleBrowserNotification(
    ownerId,
    "Upcoming appointment",
    `${appointment.title} is scheduled for ${new Date(
      appointment.scheduledAt,
    ).toLocaleString()}.`,
    targetTime,
  );
}

export async function scheduleMedicationReminders(
  medication: Medication,
  permissionGranted?: boolean,
): Promise<ReminderResult> {
  await cancelOwnerReminders(medication.id);
  if (medication.reminderTimes.length === 0) {
    return { message: "No medication reminder times are set.", scheduled: 0 };
  }
  if (!(permissionGranted ?? (await requestPermission()))) {
    return {
      message: "Saved, but notification permission is not available.",
      scheduled: 0,
    };
  }

  if (Platform.OS === "web") {
    medication.reminderTimes.forEach((time) =>
      scheduleWebDailyReminder(
        medication.id,
        `Medication reminder: ${medication.name}`,
        `Scheduled dose: ${medication.dose}`,
        time,
      ),
    );
    return {
      message:
        "Browser reminders are active while this page stays open; they do not run offline.",
      scheduled: medication.reminderTimes.length,
    };
  }

  const notifications = await import("expo-notifications");
  await Promise.all(
    medication.reminderTimes.map((time) => {
      const [hour, minute] = time.split(":").map(Number);
      return notifications.scheduleNotificationAsync({
        content: {
          title: `Medication reminder: ${medication.name}`,
          body: `Scheduled dose: ${medication.dose}`,
          data: { ownerId: medication.id, kind: "medication" },
        },
        trigger: {
          type: notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          ...(Platform.OS === "android" ? { channelId: "reminders" } : {}),
        },
      });
    }),
  );
  return {
    message: `${medication.reminderTimes.length} daily device reminder(s) scheduled.`,
    scheduled: medication.reminderTimes.length,
  };
}

export async function scheduleAppointmentReminders(
  appointment: Appointment,
  permissionGranted?: boolean,
): Promise<ReminderResult> {
  await cancelOwnerReminders(appointment.id);
  if (!appointment.reminderEnabled) {
    return { message: "Appointment reminders are turned off.", scheduled: 0 };
  }
  if (!(permissionGranted ?? (await requestPermission()))) {
    return {
      message: "Saved, but notification permission is not available.",
      scheduled: 0,
    };
  }

  const appointmentTime = new Date(appointment.scheduledAt).getTime();
  const targets = [
    { label: "24 hours", time: appointmentTime - 24 * 60 * 60 * 1000 },
    { label: "1 hour", time: appointmentTime - 60 * 60 * 1000 },
  ].filter((target) => target.time > Date.now());

  if (Platform.OS === "web") {
    targets.forEach((target) =>
      scheduleWebAppointmentReminder(
        appointment.id,
        appointment,
        target.time,
      ),
    );
    return {
      message:
        targets.length === 0
          ? "No future appointment reminders remain."
          : "Browser reminders are active while this page stays open; they do not run offline.",
      scheduled: targets.length,
    };
  }

  const notifications = await import("expo-notifications");
  await Promise.all(
    targets.map((target) =>
      notifications.scheduleNotificationAsync({
        content: {
          title: "Upcoming appointment",
          body: `${appointment.title} is in ${target.label}.`,
          data: { ownerId: appointment.id, kind: "appointment" },
        },
        trigger: {
          type: notifications.SchedulableTriggerInputTypes.DATE,
          date: target.time,
          ...(Platform.OS === "android" ? { channelId: "reminders" } : {}),
        },
      }),
    ),
  );
  return {
    message:
      targets.length === 0
        ? "No future appointment reminders remain."
        : `${targets.length} device reminder(s) scheduled.`,
    scheduled: targets.length,
  };
}

export function cancelMedicationReminders(id: string): Promise<void> {
  return cancelOwnerReminders(id);
}

export function cancelAppointmentReminders(id: string): Promise<void> {
  return cancelOwnerReminders(id);
}
