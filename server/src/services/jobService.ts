// Stub jobService to disable Redis/BullMQ dependencies
export class JobService {
  static async start() {
    console.log('Job service disabled - no Redis/BullMQ operations');
  }

  static async addEmailVerificationJob(email: string, token: string) {
    console.log('Email verification job disabled');
  }

  static async addPasswordResetJob(email: string, token: string) {
    console.log('Password reset job disabled');
  }

  static async addNotificationJob(userId: string, message: string) {
    console.log('Notification job disabled');
  }

  static async scheduleWeeklyReports() {
    console.log('Weekly reports scheduling disabled');
  }

  static async scheduleTaskCarryover() {
    console.log('Task carryover scheduling disabled');
  }
}

export const scheduleJobs = async () => {
  console.log('Job scheduling disabled - Redis not available');
  return Promise.resolve();
};

export const jobService = new JobService();