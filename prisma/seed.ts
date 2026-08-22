import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@localhost";
  const password = process.env.ADMIN_PASSWORD || "Admin123!ChangeMe";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin already exists:", email);
    return;
  }

  const hash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      email,
      name: "Admin",
      passwordHash: hash,
      role: Role.ADMIN,
      subscription: {
        create: {
          status: "ACTIVE",
          plan: "enterprise",
          creditsRemaining: 999999,
        },
      },
    },
  });

  console.log("Created admin user:", admin.email);

  await prisma.llmProvider.createMany({
    data: [
      {
        name: "OpenAI",
        providerKey: "openai",
        apiKeyEnc: "",
        baseUrl: "https://api.openai.com/v1",
        models: ["gpt-4o", "gpt-4o-mini", "o1-mini"],
        priority: 10,
        isActive: false,
      },
      {
        name: "Anthropic",
        providerKey: "anthropic",
        apiKeyEnc: "",
        baseUrl: "https://api.anthropic.com",
        models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-latest"],
        priority: 20,
        isActive: false,
      },
      {
        name: "Groq",
        providerKey: "groq",
        apiKeyEnc: "",
        baseUrl: "https://api.groq.com/openai/v1",
        models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
        priority: 30,
        isActive: false,
      },
      {
        name: "xAI (Grok)",
        providerKey: "xai",
        apiKeyEnc: "",
        baseUrl: "https://api.x.ai/v1",
        models: ["grok-3", "grok-3-mini"],
        priority: 15,
        isActive: false,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seeded default LLM providers (inactive until keys added in admin)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
