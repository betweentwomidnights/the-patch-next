// status-service/src/cli.ts
import { Command } from 'commander';
import { StatusStorage } from './storage';

const program = new Command();

program
  .name('status-cli')
  .description('CLI to manage backend status');

program
  .command('get')
  .description('Get current backend status')
  .action(async () => {
    const storage = await StatusStorage.getInstance();
    console.log(await storage.getStatus());
  });

program
  .command('set-maintenance')
  .description('Set backend status to maintenance')
  .requiredOption('-m, --message <message>', 'Maintenance message')
  .option('-d, --duration <duration>', 'Estimated duration')
  .option('-t, --type <type>', 'Maintenance type')
  .option('-s, --services <services...>', 'Affected services')
  .action(async (opts) => {
    const storage = await StatusStorage.getInstance();
    await storage.updateStatus({
      backend_status: 'maintenance',
      message: opts.message,
      estimated_duration: opts.duration,
      maintenance_type: opts.type,
      affected_services: opts.services,
      started_at: new Date().toISOString()
    });
    console.log('Status updated to maintenance');
  });

program
  .command('set-operational')
  .description('Set backend status to operational')
  .action(async () => {
    const storage = await StatusStorage.getInstance();
    await storage.updateStatus({
      backend_status: 'operational',
      message: 'All systems operational',
      estimated_duration: undefined,
      maintenance_type: undefined,
      affected_services: undefined,
      started_at: undefined
    });
    console.log('Status updated to operational');
  });

program
  .command('set-issues')
  .description('Set backend status to issues')
  .requiredOption('-m, --message <message>', 'Issue description')
  .action(async (opts) => {
    const storage = await StatusStorage.getInstance();
    await storage.updateStatus({
      backend_status: 'issues',
      message: opts.message,
      started_at: new Date().toISOString()
    });
    console.log('Status updated to issues');
  });

program.parse();
