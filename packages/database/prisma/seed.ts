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

// Fotos reales de stock (licencia Unsplash, uso libre) para que el catálogo
// de demo se vea vivo en vez de cajas grises con texto — cada id verificado
// a mano (200 OK) antes de sumarlo acá. 2 por categoría para variedad; se
// elige una de forma determinística según el nombre del producto (mismo
// producto siempre saca la misma foto, sin depender de Math.random()).
const CATEGORY_STOCK_PHOTOS: Record<string, string[]> = {
  flores: ["1494972308805-463bc619d34e", "1578439231583-9eca0a363860"],
  chocolates: ["1687795097254-f019f9d7fd17", "1481391319762-47dff72954d9"],
  peluches: ["1556012018-50c5c0da73bf", "1641085809270-71f722611ce1"],
  globos: ["1583875762487-5f8f7c718d14", "1479750178258-aec5879046ce"],
  cartas: ["1526614180703-827d23e7c8f2", "1554894872-1a01c75f7513"],
  "cajas-de-regalo": ["1513201099705-a9746e1e201f", "1592903297149-37fb25202dfa"],
  pasteles: ["1606983340126-99ab4feaa64a", "1577998474517-7eeeed4e448a"],
  postres: ["1561845730-208ad5910553", "1701104427900-70ce3ddc2470"],
  "desayunos-sorpresa": ["1641924676578-ed2792eb24de", "1675125530909-15213f01a9e1"],
  personalizados: ["1771660722417-38ceb9e85bc1", "1724318496827-2813ff4772b8"],
  propuestas: ["1529519195486-16945f0fb37f", "1512163143273-bde0e3cc7407"],
  celebraciones: ["1513151233558-d860c5398176", "1584890132374-d69d5d01483e"],
};

function categoryImageUrl(categorySlug: string, seedKey: string): string {
  const photos = CATEGORY_STOCK_PHOTOS[categorySlug];
  if (!photos) return placeholderImageUrl(seedKey);

  let hash = 0;
  for (let i = 0; i < seedKey.length; i++) hash = (hash * 31 + seedKey.charCodeAt(i)) >>> 0;
  const photoId = photos[hash % photos.length];
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=800&q=80`;
}

interface DemoMunicipality {
  name: string;
  /** Antiguos municipios (pre-reforma territorial 2021) agrupados acá. */
  districts: string[];
}

/**
 * El Salvador post-reforma territorial 2021: 14 departamentos → 44
 * municipios nuevos (lo que antes eran ~262 municipios pasó a ser
 * "distritos" dentro de estos 44). Un negocio elige cobertura a nivel de
 * municipio nuevo (lo que hoy modela `Municipality`) — los distritos son
 * solo informativos (`Municipality.districts`) para que alguien reconozca
 * su pueblo/colonia de toda la vida al elegir, ver sección "Diseño:
 * distritos" del README.
 */
const DEPARTMENTS: Record<string, DemoMunicipality[]> = {
  Ahuachapán: [
    { name: "Ahuachapán Norte", districts: ["Atiquizaya", "El Refugio", "San Lorenzo", "Turín"] },
    { name: "Ahuachapán Centro", districts: ["Ahuachapán", "Apaneca", "Concepción de Ataco", "Tacuba"] },
    {
      name: "Ahuachapán Sur",
      districts: ["Guaymango", "Jujutla", "San Francisco Menéndez", "San Pedro Puxtla"],
    },
  ],
  "San Salvador": [
    { name: "San Salvador Norte", districts: ["Aguilares", "El Paisnal", "Guazapa"] },
    { name: "San Salvador Oeste", districts: ["Apopa", "Nejapa"] },
    { name: "San Salvador Este", districts: ["Ilopango", "San Martín", "Soyapango", "Tonacatepeque"] },
    {
      name: "San Salvador Centro",
      districts: ["Ayutuxtepeque", "Mejicanos", "San Salvador", "Cuscatancingo", "Ciudad Delgado"],
    },
    {
      name: "San Salvador Sur",
      districts: ["Panchimalco", "Rosario de Mora", "San Marcos", "Santo Tomás", "Santiago Texacuangos"],
    },
  ],
  "La Libertad": [
    { name: "La Libertad Norte", districts: ["Quezaltepeque", "San Matías", "San Pablo Tacachico"] },
    { name: "La Libertad Centro", districts: ["San Juan Opico", "Ciudad Arce"] },
    { name: "La Libertad Oeste", districts: ["Colón", "Jayaque", "Sacacoyo", "Tepecoyo", "Talnique"] },
    {
      name: "La Libertad Este",
      districts: ["Antiguo Cuscatlán", "Huizúcar", "Nuevo Cuscatlán", "San José Villanueva", "Zaragoza"],
    },
    {
      name: "La Libertad Costa",
      districts: ["Chiltiupán", "Jicalapa", "La Libertad", "Tamanique", "Teotepeque"],
    },
    { name: "La Libertad Sur", districts: ["Comasagua", "Santa Tecla"] },
  ],
  Chalatenango: [
    { name: "Chalatenango Norte", districts: ["La Palma", "Citalá", "San Ignacio"] },
    {
      name: "Chalatenango Centro",
      districts: [
        "Nueva Concepción",
        "Tejutla",
        "La Reina",
        "Agua Caliente",
        "Dulce Nombre de María",
        "El Paraíso",
        "San Francisco Morazán",
        "San Rafael",
        "Santa Rita",
        "San Fernando",
      ],
    },
    {
      name: "Chalatenango Sur",
      districts: [
        "Chalatenango",
        "Arcatao",
        "Azacualpa",
        "Comalapa",
        "Concepción Quezaltepeque",
        "El Carrizal",
        "La Laguna",
        "Las Vueltas",
        "Nombre de Jesús",
        "Nueva Trinidad",
        "Ojos de Agua",
        "Potonico",
        "San Antonio de La Cruz",
        "San Antonio Los Ranchos",
        "San Francisco Lempa",
        "San Isidro Labrador",
        "San José Cancasque",
        "San Miguel de Mercedes",
        "San José Las Flores",
        "San Luis del Carmen",
      ],
    },
  ],
  Cuscatlán: [
    {
      name: "Cuscatlán Norte",
      districts: ["Suchitoto", "San José Guayabal", "Oratorio de Concepción", "San Bartolomé Perulapán", "San Pedro Perulapán"],
    },
    {
      name: "Cuscatlán Sur",
      districts: [
        "Cojutepeque",
        "San Rafael Cedros",
        "Candelaria",
        "Monte San Juan",
        "El Carmen",
        "San Cristóbal",
        "Santa Cruz Michapa",
        "San Ramón",
        "El Rosario",
        "Santa Cruz Analquito",
        "Tenancingo",
      ],
    },
  ],
  Cabañas: [
    { name: "Cabañas Este", districts: ["Sensuntepeque", "Victoria", "Dolores", "Guacotecti", "San Isidro"] },
    { name: "Cabañas Oeste", districts: ["Ilobasco", "Tejutepeque", "Jutiapa", "Cinquera"] },
  ],
  "La Paz": [
    {
      name: "La Paz Oeste",
      districts: [
        "Cuyultitán",
        "Olocuilta",
        "San Juan Talpa",
        "San Luis Talpa",
        "San Pedro Masahuat",
        "Tapalhuaca",
        "San Francisco Chinameca",
      ],
    },
    {
      name: "La Paz Centro",
      districts: [
        "El Rosario",
        "Jerusalén",
        "Mercedes La Ceiba",
        "Paraíso de Osorio",
        "San Antonio Masahuat",
        "San Emigdio",
        "San Juan Tepezontes",
        "San Luis La Herradura",
        "San Miguel Tepezontes",
        "San Pedro Nonualco",
        "Santa María Ostuma",
        "Santiago Nonualco",
      ],
    },
    { name: "La Paz Este", districts: ["San Juan Nonualco", "San Rafael Obrajuelo", "Zacatecoluca"] },
  ],
  "La Unión": [
    {
      name: "La Unión Norte",
      districts: [
        "Anamorós",
        "Bolívar",
        "Concepción de Oriente",
        "El Sauce",
        "Lislique",
        "Nueva Esparta",
        "Pasaquina",
        "Polorós",
        "San José La Fuente",
        "Santa Rosa de Lima",
      ],
    },
    {
      name: "La Unión Sur",
      districts: [
        "Conchagua",
        "El Carmen",
        "Intipucá",
        "La Unión",
        "Meanguera del Golfo",
        "San Alejo",
        "Yayantique",
        "Yucuaiquín",
      ],
    },
  ],
  Usulután: [
    {
      name: "Usulután Norte",
      districts: [
        "Santiago de María",
        "Alegría",
        "Berlín",
        "Mercedes Umaña",
        "Jucuapa",
        "El Triunfo",
        "Estanzuelas",
        "San Buenaventura",
        "Nueva Granada",
      ],
    },
    {
      name: "Usulután Este",
      districts: [
        "Usulután",
        "Jucuarán",
        "San Dionisio",
        "Concepción Batres",
        "Santa María",
        "Ozatlán",
        "Tecapán",
        "Santa Elena",
        "California",
        "Ereguayquín",
      ],
    },
    { name: "Usulután Oeste", districts: ["Jiquilisco", "Puerto El Triunfo", "San Agustín", "San Francisco Javier"] },
  ],
  Sonsonate: [
    { name: "Sonsonate Norte", districts: ["Juayúa", "Nahuizalco", "Salcoatitán", "Santa Catarina Masahuat"] },
    {
      name: "Sonsonate Centro",
      districts: ["Sonsonate", "Sonzacate", "Nahulingo", "San Antonio del Monte", "Santo Domingo de Guzmán"],
    },
    {
      name: "Sonsonate Este",
      districts: ["Izalco", "Armenia", "Caluco", "San Julián", "Cuisnahuat", "Santa Isabel Ishuatán"],
    },
    { name: "Sonsonate Oeste", districts: ["Acajutla"] },
  ],
  "Santa Ana": [
    { name: "Santa Ana Norte", districts: ["Masahuat", "Metapán", "Santa Rosa Guachipilín", "Texistepeque"] },
    { name: "Santa Ana Centro", districts: ["Santa Ana"] },
    { name: "Santa Ana Este", districts: ["Coatepeque", "El Congo"] },
    {
      name: "Santa Ana Oeste",
      districts: [
        "Candelaria de la Frontera",
        "Chalchuapa",
        "El Porvenir",
        "San Antonio Pajonal",
        "San Sebastián Salitrillo",
        "Santiago de la Frontera",
      ],
    },
  ],
  "San Vicente": [
    {
      name: "San Vicente Norte",
      districts: [
        "Apastepeque",
        "Santa Clara",
        "San Ildefonso",
        "San Esteban Catarina",
        "San Sebastián",
        "San Lorenzo",
        "Santo Domingo",
      ],
    },
    {
      name: "San Vicente Sur",
      districts: ["San Vicente", "Guadalupe", "Verapaz", "Tepetitán", "Tecoluca", "San Cayetano Istepeque"],
    },
  ],
  "San Miguel": [
    {
      name: "San Miguel Norte",
      districts: [
        "Ciudad Barrios",
        "Sesori",
        "Nuevo Edén de San Juan",
        "San Gerardo",
        "San Luis de La Reina",
        "Carolina",
        "San Antonio del Mosco",
        "Chapeltique",
      ],
    },
    {
      name: "San Miguel Centro",
      districts: ["San Miguel", "Comacarán", "Uluazapa", "Moncagua", "Quelepa", "Chirilagua"],
    },
    {
      name: "San Miguel Oeste",
      districts: ["Chinameca", "Nueva Guadalupe", "Lolotique", "San Jorge", "San Rafael Oriente", "El Tránsito"],
    },
  ],
  Morazán: [
    {
      name: "Morazán Norte",
      districts: [
        "Arambala",
        "Cacaopera",
        "Corinto",
        "El Rosario",
        "Joateca",
        "Jocoaitique",
        "Meanguera",
        "Perquín",
        "San Fernando",
        "San Isidro",
        "Torola",
      ],
    },
    {
      name: "Morazán Sur",
      districts: [
        "Chilanga",
        "Delicias de Concepción",
        "El Divisadero",
        "Gualococti",
        "Guatajiagua",
        "Jocoro",
        "Lolotiquillo",
        "Osicala",
        "San Carlos",
        "San Francisco Gotera",
        "San Simón",
        "Sensembra",
        "Sociedad",
        "Yamabal",
        "Yoloaiquín",
      ],
    },
  ],
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

    for (const municipality of municipalities) {
      await prisma.municipality.upsert({
        where: {
          departmentId_slug: {
            departmentId: department.id,
            slug: slugify(municipality.name),
          },
        },
        update: { districts: municipality.districts },
        create: {
          name: municipality.name,
          slug: slugify(municipality.name),
          departmentId: department.id,
          districts: municipality.districts,
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

      // Decisión de producto (2026-09-11): los productos de demo se dejan
      // SIN foto a propósito — la UI ya tiene un estado "sin foto" propio
      // (ícono de categoría + degradé de marca, ver MediaPlaceholder) en vez
      // de simular una foto real con un placeholder de texto o una foto de
      // stock genérica. `categoryImageUrl` (fotos de Unsplash verificadas a
      // mano, arriba en este archivo) queda intacta por si el equipo decide
      // activarla más adelante — para eso, descomentar el bloque de abajo.
      //
      // const existingImage = await prisma.productImage.findFirst({
      //   where: { productId: product.id },
      // });
      // if (!existingImage) {
      //   await prisma.productImage.create({
      //     data: {
      //       productId: product.id,
      //       url: categoryImageUrl(demoProduct.categorySlug, demoProduct.name),
      //       altText: demoProduct.name,
      //       position: 0,
      //     },
      //   });
      // }

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
