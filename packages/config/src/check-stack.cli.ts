import { checkHttpService, checkTcpService } from './index';

/** Verifies the docker-compose parity stack (docs/08-local-dev.md §2) is actually up and reachable. */
async function main(): Promise<void> {
  const results = await Promise.all([
    checkTcpService('postgres', 'localhost', 5432),
    // ElasticMQ has no dedicated health endpoint (softwaremill/elasticmq#776); the
    // maintainer's own suggested probe is a real SQS-compatible action.
    checkHttpService('elasticmq', 'http://localhost:9324/?Action=ListQueues'),
    checkHttpService('minio', 'http://localhost:9000/minio/health/live'),
    checkHttpService('mailpit', 'http://localhost:8025/readyz'),
  ]);

  for (const result of results) {
    const icon = result.ok ? '✅' : '❌';
    const detail = result.error ? ` — ${result.error}` : '';
    console.log(`${icon} ${result.name}${detail}`);
  }

  if (results.some((result) => !result.ok)) {
    process.exitCode = 1;
  }
}

main();
