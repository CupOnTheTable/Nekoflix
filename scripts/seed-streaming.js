const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function seedBlackTorch() {
  const links = [
    { animeId: 61169, platform: "crunchyroll", url: "https://www.crunchyroll.com/series/GT00377907/black-torch", isPrimary: true },
    { animeId: 61169, platform: "museasia", url: "https://www.youtube.com/channel/UCGbshtvS9t-8CW11W7TooQg", isPrimary: false },
    { animeId: 61169, platform: "aniplus", url: "http://www.aniplustv.com/", isPrimary: false },
  ];

  for (const link of links) {
    await prisma.streamingLink.upsert({
      where: { animeId_platform: { animeId: link.animeId, platform: link.platform } },
      update: { url: link.url, isPrimary: link.isPrimary },
      create: link,
    });
    console.log(`✓ ${link.platform} for Black Torch`);
  }
  console.log("Done!");
}

seedBlackTorch().catch(console.error).finally(() => prisma.$disconnect());
