// status-service/src/storage.ts
import fs from 'fs/promises';
import { watch } from 'fs';
import path from 'path';
import { StatusData } from './types';

const STATUS_FILE = path.join(__dirname, '../data/status.json');

export class StatusStorage {
  private static instance: StatusStorage;
  private status: StatusData = {
    backend_status: 'operational',
    message: 'All systems operational',
    last_updated: new Date().toISOString()
  };

  private constructor() {
    // Set up file watching
    watch(STATUS_FILE, async (eventType, filename) => {
      if (eventType === 'change') {
        try {
          await this.load();
          console.log(`Status file updated: ${new Date().toISOString()}`);
        } catch (error) {
          console.error('Error reloading status file:', error);
        }
      }
    });
  }

  static async getInstance(): Promise<StatusStorage> {
    if (!StatusStorage.instance) {
      StatusStorage.instance = new StatusStorage();
      await StatusStorage.instance.load();
    }
    return StatusStorage.instance;
  }

  private async load() {
    try {
      const data = await fs.readFile(STATUS_FILE, 'utf-8');
      this.status = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, use defaults
      await this.save();
    }
  }

  private async save() {
    await fs.mkdir(path.dirname(STATUS_FILE), { recursive: true });
    await fs.writeFile(STATUS_FILE, JSON.stringify(this.status, null, 2));
  }

  async getStatus(): Promise<StatusData> {
    return this.status;
  }

  async updateStatus(newStatus: Partial<StatusData>): Promise<StatusData> {
    this.status = {
      ...this.status,
      ...newStatus,
      last_updated: new Date().toISOString()
    };
    await this.save();
    return this.status;
  }
}