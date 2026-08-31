const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.apiCache.deleteMany().then(r => {
  console.log("Cleared " + r.count + " cache entries");
  p.$disconnect();
}).catch(e => {
  console.error(e);
  p.$disconnect();
});
