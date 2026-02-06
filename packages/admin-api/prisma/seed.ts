import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed chains
  const chains = [
    { name: 'Localhost', chainId: 31337, rpcUrl: 'http://localhost:8545', blockTime: 2 },
    { name: 'Ethereum', chainId: 1, rpcUrl: 'https://eth.llamarpc.com', blockTime: 12 },
    //{ name: 'Polygon', chainId: 137, rpcUrl: 'https://polygon-rpc.com', blockTime: 2 },
    //{ name: 'BSC', chainId: 56, rpcUrl: 'https://bsc-dataseed.binance.org', blockTime: 3 },
    //{ name: 'Arbitrum', chainId: 42161, rpcUrl: 'https://arb1.arbitrum.io/rpc', blockTime: 1 },
    //{ name: 'Optimism', chainId: 10, rpcUrl: 'https://mainnet.optimism.io', blockTime: 2 },
    //{ name: 'Base', chainId: 8453, rpcUrl: 'https://mainnet.base.org', blockTime: 2 },
    // eslint-disable-next-line prettier/prettier
    //{ name: 'Avalanche', chainId: 43114, rpcUrl: 'https://api.avax.network/ext/bc/C/rpc', blockTime: 2 },
    { name: 'Sepolia', chainId: 11155111, rpcUrl: 'https://rpc.sepolia.org', blockTime: 12 },
    { name: 'Goerli', chainId: 5, rpcUrl: 'https://rpc.ankr.com/eth_goerli', blockTime: 12 },
    //{ name: 'Mumbai', chainId: 80001, rpcUrl: 'https://rpc-mumbai.maticvigil.com', blockTime: 2 },
  ];

  for (const chain of chains) {
    await prisma.chain.upsert({
      where: { chainId: chain.chainId },
      update: {},
      create: chain,
    });
  }

  console.log(`Seeded ${chains.length} chains`);
  console.log('Database seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
