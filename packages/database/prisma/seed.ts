import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { DEMO_BUSINESSES } from "./seed-data/demo-catalog";

const prisma = new PrismaClient();

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function placeholderImageUrl(text: string): string {
  // .png explícito: placehold.co sirve SVG por defecto, y next/image bloquea
  // SVG remoto por seguridad salvo que se habilite dangerouslyAllowSVG.
  return `https://placehold.co/800x600/f4f4f5/171717.png?text=${encodeURIComponent(text)}`;
}

// El Salvador: los 14 departamentos con sus municipios. Se listan todos los
// departamentos (para que la plataforma nunca dependa solo de San Salvador,
// ver sección 34) pero solo se detallan municipios para los departamentos
// del plan de expansión inicial (sección 41); el resto arranca con su
// cabecera departamental y se completa según crece la cobertura de delivery.
const DEPARTMENTS: Record<string, string[]> = {
  "San Salvador": [
    "San Salvador",
    // El municipio de San Salvador (la capital) es demasiado grande para
    // que "cobertura" signifique algo útil a ese nivel — se suma también
    // por distrito, para que un negocio pueda cubrir, por ejemplo, "San
    // Salvador Centro" sin comprometerse a toda la capital.
    "San Salvador Centro",
    "San Salvador Norte",
    "San Salvador Sur",
    "San Salvador Este",
    "San Salvador Oeste",
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

  console.log("Seeding catálogo demo (negocios y productos)...");

  const categoryBySlug = new Map(
    (await prisma.category.findMany()).map((category) => [category.slug, category]),
  );
  const occasionBySlug = new Map(
    (await prisma.occasion.findMany()).map((occasion) => [occasion.slug, occasion]),
  );

  for (const [businessIndex, demoBusiness] of DEMO_BUSINESSES.entries()) {
    const municipality = await prisma.municipality.findFirst({
      where: { slug: demoBusiness.municipalitySlug },
    });
    const businessSlug = slugify(demoBusiness.name);

    const business = await prisma.business.upsert({
      where: { slug: businessSlug },
      update: {},
      create: {
        name: demoBusiness.name,
        slug: businessSlug,
        description: demoBusiness.description,
        whatsapp: demoBusiness.whatsapp,
        status: "APPROVED",
        verified: businessIndex % 3 !== 0,
        isDemo: true,
        municipalityId: municipality?.id,
        addressLine: demoBusiness.addressLine,
        preparationTimeMinutes: demoBusiness.prepMinutes,
        ratingAvg: Number(randomBetween(3.9, 5).toFixed(1)),
        ratingCount: Math.floor(randomBetween(8, 140)),
      },
    });

    // El primer negocio queda vinculado a la cuenta demo de negocio para
    // poder iniciar sesión y ver el panel (Fase 5).
    if (businessIndex === 0) {
      await prisma.businessUser.upsert({
        where: { businessId_userId: { businessId: business.id, userId: businessOwner.id } },
        update: {},
        create: { businessId: business.id, userId: businessOwner.id, role: "OWNER" },
      });
    }

    if (municipality) {
      const existingZone = await prisma.deliveryZone.findFirst({
        where: { businessId: business.id },
      });
      if (!existingZone) {
        await prisma.deliveryZone.create({
          data: {
            businessId: business.id,
            name: `${municipality.name} y alrededores`,
            municipalityId: municipality.id,
            deliveryFee: Number(randomBetween(1.5, 4).toFixed(2)),
            estimatedMinutes: Math.floor(randomBetween(45, 120)),
          },
        });
      }
    }

    for (const demoProduct of demoBusiness.products) {
      const category = categoryBySlug.get(demoProduct.categorySlug);
      if (!category) continue;

      const productSlug = `${businessSlug}-${slugify(demoProduct.name)}`;
      const availableToday = Math.random() > 0.25;

      const product = await prisma.product.upsert({
        where: { slug: productSlug },
        update: {},
        create: {
          businessId: business.id,
          categoryId: category.id,
          name: demoProduct.name,
          slug: productSlug,
          description: demoProduct.description,
          price: demoProduct.price,
          compareAtPrice: demoProduct.compareAtPrice ?? null,
          isPersonalizable: demoProduct.personalizable ?? false,
          availableToday,
          preparationTimeMinutes: demoProduct.prepMinutes ?? demoBusiness.prepMinutes,
          isDemo: true,
          status: "ACTIVE",
          stock: Math.floor(randomBetween(5, 60)),
          ratingAvg: Number(randomBetween(3.7, 5).toFixed(1)),
          ratingCount: Math.floor(randomBetween(0, 90)),
          salesCount: Math.floor(randomBetween(0, 250)),
        },
      });

      const existingImage = await prisma.productImage.findFirst({
        where: { productId: product.id },
      });
      if (!existingImage) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: placeholderImageUrl(demoProduct.name),
            altText: demoProduct.name,
            position: 0,
          },
        });
      }

      for (const occasionSlug of demoProduct.occasionSlugs) {
        const occasion = occasionBySlug.get(occasionSlug);
        if (!occasion) continue;
        await prisma.productOccasion.upsert({
          where: { productId_occasionId: { productId: product.id, occasionId: occasion.id } },
          update: {},
          create: { productId: product.id, occasionId: occasion.id },
        });
      }
    }
  }

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
