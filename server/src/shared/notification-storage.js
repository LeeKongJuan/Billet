import { decryptSensitive, encryptSensitive } from './encryption.js';

export function encryptNotification(notification) {
  const data = notification.data;
  return {
    ...notification,
    content: encryptSensitive(notification.content),
    data: data === null || data === undefined
      ? data
      : encryptSensitive(typeof data === 'string' ? data : JSON.stringify(data))
  };
}

export function insertNotification(trx, notification) {
  return trx('notifications').insert(encryptNotification(notification));
}

export function decryptNotification(notification) {
  const content = decryptSensitive(notification.content);
  const storedData = decryptSensitive(notification.data);
  let data = storedData;
  if (typeof storedData === 'string') {
    try {
      data = JSON.parse(storedData);
    } catch {
      data = storedData;
    }
  }
  return { ...notification, content, data };
}
