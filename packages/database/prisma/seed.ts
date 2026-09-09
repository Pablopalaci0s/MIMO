import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

// El Salvador: los 14 departamentos con sus municipios. Se listan todos los
// departamentos (para que la plataforma nunca dependa solo de San Salvador,
// ver sección 34) pero solo se detallan municipios para los departamentos
// del plan de expansión inicial (sección 41); el resto arranca con su
// cabecera departamental y se completa según crece la cobertura de delivery.
const DEPARTMENTS: Record<string, string[]> = {
  "San Salvador": [
    "San Salvador",
    "Mejicanos",
    "Soyapango",
    "Santa Tecla",
    "Antiguo Cuscatlán",
    "Ilopango",
    "Apopa",
    "San Marcos",
    "Ayutuxtepeque",
  ],
  "La Libertad": ["Santa Tecla", "La Libertad", "Zaragoza", "Ciudad Arce", "Colón"],
  "Santa Ana": ["Santa Ana", "Chalchuapa", "Metapán"],
  "San Miguel": ["San Miguel", "Chinameca", "Ciudad Barrios"],
  Sonsonate: ["Sonsonate", "Acajutla", "Izalco"],
  Ahuachapán: ["Ahuachapán"],
  Cuscatlán: ["Cojutepeque"],
  "La Paz": ["Zacatecoluca"],
  Cabañas: ["Sensuntepeque"],
  Usulután: ["Usulután"],
  "San Vicente": ["San Vicente"],
  Morazán: ["San Francisco Gotera"],
  "La Unión": ["La Unión"],
  Chalatenango: ["Chalatenango"],
};

const CATEGORIES = [
  { name: "Flores", emoji: "🌹" },
  { name: "Chocolates", emoji: "🍫" },
  { name: "Peluches", emoji: "🧸" },
  { name: "Globos", emoji: "🎈" },
  { name: "Cartas", emoji: "💌" },
  { name: "Cajas de regalo", emoji: "🎁" },
  { name: "Pasteles", emoji: "🍰" },
  { name: "Postres", emoji: "🧁" },
  { name: "Desayunos sorpresa", emoji: "☕" },
  { name: "Personalizados", emoji: "🎀" },
  { name: "Propuestas", emoji: "💍" },
  { name: "Celebraciones", emoji: "🎉" },
];

const OCCASIONS: { name: string; emoji: string }[] = [
  { name: "Cumpleaños", emoji: "🎂" },
  { name: "Aniversario", emoji: "❤️" },
  { name: "Día de la Madre", emoji: "👩" },
  { name: "Día del Padre", emoji: "👨" },
  { name: "Graduación", emoji: "🎓" },
  { name: "Propuesta", emoji: "💍" },
  { name: "Solo porque sí", emoji: "✨" },
];

const EMOTIONS: { name: string; emoji: string }[] = [
  { name: "Te amo", emoji: "❤️" },
  { name: "Te extraño", emoji: "🥺" },
  { name: "Gracias", emoji: "🙏" },
  { name: "Perdón", emoji: "😔" },
  { name: "Felicidades", emoji: "🎉" },
  { name: "Estoy orgulloso de vos", emoji: "🫶" },
  { name: "Quiero sorprenderte", emoji: "🌹" },
  { name: "Pensé en vos", emoji: "💝" },
];

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  console.log("Seeding MIMO — ubicaciones, categorías y ocasiones...");

  for (const [departmentName, municipalities] of Object.entries(DEPARTMENTS)) {
    const department = await prisma.department.upsert({
      where: { slug: slugify(departmentName) },
      update: {},
      create: { name: departmentName, slug: slugify(departmentName) },
    });

    for (const municipalityName of municipalities) {
      await prisma.municipality.upsert({
        where: {
          departmentId_slug: {
            departmentId: department.id,
            slug: slugify(municipalityName),
          },
        },
        update: {},
        create: {
          name: municipalityName,
          slug: slugify(municipalityName),
          departmentId: department.id,
        },
      });
    }
  }

  for (const [index, category] of CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { slug: slugify(category.name) },
      update: {},
      create: {
        name: category.name,
        slug: slugify(category.name),
        emoji: category.emoji,
        position: index,
      },
    });
  }

  for (const occasion of OCCASIONS) {
    await prisma.occasion.upsert({
      where: { slug: slugify(occasion.name) },
      update: {},
      create: { name: occasion.name, slug: slugify(occasion.name), emoji: occasion.emoji, type: "OCCASION" },
    });
  }

  for (const emotion of EMOTIONS) {
    await prisma.occasion.upsert({
      where: { slug: slugify(emotion.name) },
      update: {},
      create: { name: emotion.name, slug: slugify(emotion.name), emoji: emotion.emoji, type: "EMOTION" },
    });
  }

  console.log("Seeding cuentas demo...");

  const adminPassword = await hash("Admin123!", 10);
  await prisma.user.upsert({
    where: { email: "admin@mimo.sv" },
    update: {},
    create: {
      name: "Admin MIMO",
      email: "admin@mimo.sv",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  const customerPassword = await hash("Cliente123!", 10);
  await prisma.user.upsert({
    where: { email: "cliente@mimo.sv" },
    update: {},
    create: {
      name: "Cliente Demo",
      email: "cliente@mimo.sv",
      passwordHash: customerPassword,
      role: "USER",
    },
  });

  const businessOwnerPassword = await hash("Negocio123!", 10);
  const businessOwner = await prisma.user.upsert({
    where: { email: "negocio@mimo.sv" },
    update: {},
    create: {
      name: "Dueño Negocio Demo",
      email: "negocio@mimo.sv",
      passwordHash: businessOwnerPassword,
      role: "BUSINESS",
    },
  });

  const sanSalvador = await prisma.municipality.findFirst({
    where: { slug: "san-salvador" },
  });

  const demoBusiness = await prisma.business.upsert({
    where: { slug: "flores-demo-mimo" },
    update: {},
    create: {
      name: "Flores Demo MIMO",
      slug: "flores-demo-mimo",
      description: "Negocio de demostración para probar el flujo de MIMO. [DEMO]",
      status: "APPROVED",
      verified: true,
      isDemo: true,
      municipalityId: sanSalvador?.id,
      addressLine: "Calle Demo #123, San Salvador",
      preparationTimeMinutes: 90,
    },
  });

  await prisma.businessUser.upsert({
    where: { businessId_userId: { businessId: demoBusiness.id, userId: businessOwner.id } },
    update: {},
    create: { businessId: demoBusiness.id, userId: businessOwner.id, role: "OWNER" },
  });

  console.log("Seed completo.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
