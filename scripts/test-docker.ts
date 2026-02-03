/**
 * Docker Integration Test Script
 *
 * Tests DockerService against real Docker daemon.
 * Exercises: create, start, status, list, remove operations.
 *
 * Run with: npx tsx scripts/test-docker.ts
 */

import { randomUUID } from 'node:crypto';
import { DockerService } from '../src/services/DockerService.js';
import { writeSecret, deleteBotSecrets, getSecretsRoot } from '../src/secrets/manager.js';

async function main(): Promise<void> {
  const testBotId = randomUUID();
  const docker = new DockerService();

  console.log('=== Docker Integration Test ===\n');
  console.log(`Test bot ID: ${testBotId}`);
  console.log(`Secrets root: ${getSecretsRoot()}\n`);

  try {
    // Step 1: Write a test secret for the bot
    console.log('1. Writing test secret...');
    writeSecret(testBotId, 'TEST_SECRET', 'test-value-123');
    console.log('   Secret written successfully\n');

    // Step 2: Create container with alpine image
    console.log('2. Creating container with alpine:latest...');
    const containerId = await docker.createContainer(testBotId, {
      image: 'alpine:latest',
      environment: ['TEST_ENV=hello-world']
    });
    console.log(`   Container created: ${containerId}\n`);

    // Step 3: Start container (alpine will exit immediately)
    console.log('3. Starting container...');
    await docker.startContainer(testBotId);
    console.log('   Container started (alpine exits immediately)\n');

    // Step 4: Get status - should show 'exited'
    console.log('4. Getting container status...');
    const status = await docker.getContainerStatus(testBotId);
    if (status) {
      console.log(`   State: ${status.state}`);
      console.log(`   Running: ${status.running}`);
      console.log(`   Exit code: ${status.exitCode}`);
      console.log(`   Started at: ${status.startedAt}`);
      console.log(`   Finished at: ${status.finishedAt}\n`);
    } else {
      console.log('   ERROR: Container not found!\n');
    }

    // Step 5: List managed containers - should include test container
    console.log('5. Listing managed containers...');
    const containers = await docker.listManagedContainers();
    console.log(`   Found ${containers.length} managed container(s):`);
    for (const c of containers) {
      console.log(`   - ${c.name} (${c.botId}) [${c.state}] ${c.status}`);
    }
    const found = containers.some(c => c.botId === testBotId);
    console.log(`   Test container in list: ${found ? 'YES' : 'NO'}\n`);

    // Step 6: Remove container
    console.log('6. Removing container...');
    await docker.removeContainer(testBotId);
    console.log('   Container removed successfully\n');

    // Step 7: Clean up secrets
    console.log('7. Cleaning up secrets...');
    deleteBotSecrets(testBotId);
    console.log('   Secrets cleaned up\n');

    // Step 8: List again - should not include test container
    console.log('8. Listing managed containers after removal...');
    const containersAfter = await docker.listManagedContainers();
    console.log(`   Found ${containersAfter.length} managed container(s)`);
    const stillFound = containersAfter.some(c => c.botId === testBotId);
    console.log(`   Test container in list: ${stillFound ? 'YES (ERROR!)' : 'NO (correct)'}\n`);

    console.log('=== Test Complete ===');
    console.log('All Docker operations executed successfully!');

  } catch (error) {
    console.error('\n=== Test Failed ===');
    console.error('Error:', error);

    // Attempt cleanup on failure
    console.log('\nAttempting cleanup...');
    try {
      await docker.removeContainer(testBotId);
      console.log('Container removed');
    } catch {
      console.log('Container not found or already removed');
    }
    try {
      deleteBotSecrets(testBotId);
      console.log('Secrets cleaned up');
    } catch {
      console.log('Secrets not found or already removed');
    }

    process.exit(1);
  }
}

main();
