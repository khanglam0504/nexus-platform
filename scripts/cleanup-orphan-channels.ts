// Script to delete all ungrouped (orphan) channels and their data
// Run with: npx tsx scripts/cleanup-orphan-channels.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupOrphanChannels() {
  console.log('🔍 Finding orphan channels (no group)...\n');

  // Find all channels without a group
  const orphanChannels = await prisma.channel.findMany({
    where: { groupId: null },
    include: {
      _count: {
        select: {
          messages: true,
          channelAgents: true,
          debateSessions: true,
        },
      },
    },
  });

  if (orphanChannels.length === 0) {
    console.log('✅ No orphan channels found. Database is clean!');
    return;
  }

  console.log(`Found ${orphanChannels.length} orphan channel(s):\n`);
  
  for (const channel of orphanChannels) {
    console.log(`  📁 #${channel.name}`);
    console.log(`     - Messages: ${channel._count.messages}`);
    console.log(`     - Channel Agents: ${channel._count.channelAgents}`);
    console.log(`     - Debate Sessions: ${channel._count.debateSessions}`);
  }

  console.log('\n🗑️  Deleting orphan channels (cascade will remove all related data)...\n');

  // Delete all orphan channels (cascade will handle messages, reactions, etc.)
  const result = await prisma.channel.deleteMany({
    where: { groupId: null },
  });

  console.log(`✅ Deleted ${result.count} orphan channel(s) and all their data!`);
}

cleanupOrphanChannels()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
