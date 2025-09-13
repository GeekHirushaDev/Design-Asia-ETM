import { config } from '../config/config.js';

/**
 * Utility functions for timezone handling with Sri Lankan timezone (Asia/Colombo)
 */

export class TimezoneUtils {
  private static TIMEZONE = config.DEFAULT_TIMEZONE;

  /**
   * Get current Sri Lankan time
   */
  static now(): Date {
    return new Date(new Date().toLocaleString("en-US", { timeZone: this.TIMEZONE }));
  }

  /**
   * Convert any date to Sri Lankan timezone
   */
  static toSriLankanTime(date: Date): Date {
    return new Date(date.toLocaleString("en-US", { timeZone: this.TIMEZONE }));
  }

  /**
   * Format date for database storage (ensures Sri Lankan timezone)
   */
  static formatForDB(date: Date | string): Date {
    const inputDate = typeof date === 'string' ? new Date(date) : date;
    return this.toSriLankanTime(inputDate);
  }

  /**
   * Get start of day in Sri Lankan timezone
   */
  static startOfDay(date?: Date): Date {
    const targetDate = date ? this.toSriLankanTime(date) : this.now();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay;
  }

  /**
   * Get end of day in Sri Lankan timezone
   */
  static endOfDay(date?: Date): Date {
    const targetDate = date ? this.toSriLankanTime(date) : this.now();
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  }

  /**
   * Format date for API responses (ISO string in Sri Lankan timezone)
   */
  static formatForAPI(date: Date): string {
    return this.toSriLankanTime(date).toISOString();
  }

  /**
   * Parse date from frontend (assumes Sri Lankan timezone)
   */
  static parseFromFrontend(dateString: string): Date {
    // If it's already a full ISO string, use it directly
    if (dateString.includes('T') && (dateString.includes('Z') || dateString.includes('+'))) {
      return this.toSriLankanTime(new Date(dateString));
    }
    
    // If it's a date-only string, treat it as Sri Lankan timezone
    const date = new Date(dateString + 'T00:00:00');
    return this.toSriLankanTime(date);
  }

  /**
   * Get timezone offset string
   */
  static getTimezoneOffset(): string {
    const now = new Date();
    const sriLankanTime = new Date(now.toLocaleString("en-US", { timeZone: this.TIMEZONE }));
    const offset = (sriLankanTime.getTime() - now.getTime()) / (1000 * 60);
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? '+' : '-';
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Check if a date is today in Sri Lankan timezone
   */
  static isToday(date: Date): boolean {
    const today = this.startOfDay();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const targetDate = this.toSriLankanTime(date);
    return targetDate >= today && targetDate < tomorrow;
  }

  /**
   * Get relative time string (e.g., "2 hours ago", "in 30 minutes")
   */
  static getRelativeTime(date: Date): string {
    const now = this.now();
    const targetDate = this.toSriLankanTime(date);
    const diffMs = targetDate.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (Math.abs(diffMinutes) < 1) {
      return 'just now';
    } else if (Math.abs(diffMinutes) < 60) {
      return diffMinutes > 0 ? `in ${diffMinutes} minutes` : `${Math.abs(diffMinutes)} minutes ago`;
    } else if (Math.abs(diffHours) < 24) {
      return diffHours > 0 ? `in ${diffHours} hours` : `${Math.abs(diffHours)} hours ago`;
    } else {
      return diffDays > 0 ? `in ${diffDays} days` : `${Math.abs(diffDays)} days ago`;
    }
  }
}