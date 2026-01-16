export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const sendNotification = (title: string, body: string) => {
  if (Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: 'https://www.google.com/favicon.ico', // Fallback icon or app icon
        silent: false,
      });
    } catch (e) {
      console.error("Error sending notification", e);
    }
  }
};