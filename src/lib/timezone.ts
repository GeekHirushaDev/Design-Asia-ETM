/**
 * Sri Lankan timezone utility for frontend
 */

export const TIMEZONE = 'Asia/Colombo';

export const getSriLankanTime = (date?: Date): Date => {
  const now = date || new Date();
  
  // Convert to Sri Lankan timezone
  const sriLankanTime = new Date(now.toLocaleString("en-US", {
    timeZone: TIMEZONE
  }));
  
  return sriLankanTime;
};

export const formatSriLankanDateTime = (date: Date): string => {
  return date.toLocaleString('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

export const formatSriLankanDateTimeLocal = (date: Date): string => {
  // Format for datetime-local input
  const sriLankanTime = new Date(date.toLocaleString("en-US", {
    timeZone: TIMEZONE
  }));
  
  return sriLankanTime.toISOString().slice(0, 16);
};