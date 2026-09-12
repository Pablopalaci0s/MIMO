import { Prisma, prisma } from "@mimo/database";
import type {
  ContributeToGroupGiftInput,
  GroupGiftContributionDTO,
  GroupGiftDTO,
  GroupGiftInput,
  GroupGiftManageDTO,
  GroupGiftPublicDTO,
} from "@mimo/types";
import { AppError } from "@/lib/errors";
import { slugify } from "@/lib/slug";
import { capturePaypalOrder, createPaypalCheckoutOrder, refundPaypalCapture, sendPaypalPayout } from "./paypal-service";

const GROUP_GIFT_INCLUDE = {
  product: { include: { images: { orderBy: { position: "asc" as const }, take: 1 } } },
  contributions: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.GroupGiftInclude;

type GroupGiftRow = Prisma.GroupGiftGetPayload<{ include: typeof GROUP_GIFT_INCLUDE }>;

function toContributionDTO(
  contribution: Prisma.GroupGiftContributionGetPayload<Record<string, never>>,
): GroupGiftContributionDTO {
  return {
    id: contribution.id,
    contributorName: contribution.contributorName,
    amount: Number(contribution.amount),
    status: contribution.status,
    createdAt: contribution.createdAt.toISOString(),
  };
}

function collectedAmount(gift: GroupGiftRow): number {
  return gift.contributions
    .filter((c) => c.status === "PAID")
    .reduce((sum, c) => sum + Number(c.amount), 0);
}

function toBaseDTO(gift: GroupGiftRow): GroupGiftDTO {
  return {
    id: gift.id,
    slug: gift.slug,
    title: gift.title,
    message: gift.message,
    productId: gift.productId,
    productName: gift.product.name,
    productSlug: gift.product.slug,
    productImageUrl: gift.product.images[0]?.url ?? null,
    targetAmount: Number(gift.targetAmount),
    collectedAmount: collectedAmount(gift),
    deadline: gift.deadline?.toISOString() ?? null,
    status: gift.status,
    createdAt: gift.createdAt.toISOString(),
  };
}

async function uniqueGroupGiftSlug(title: string): Promise<string> {
  const base = slugify(title) || "cabuda";
  let candidate = base;
  let suffix = 1;
  while (await prisma.groupGift.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

export async function createGroupGift(organizerId: string, input: GroupGiftInput): Promise<GroupGiftDTO> {
  const product = await prisma.product.findFirst({
    where: { id: input.productId, status: "ACTIVE", deletedAt: null },
  });
  if (!product) throw new AppError("PRODUCT_UNAVAILABLE", "Ese producto ya no está disponible.", 404);

  const slug = await uniqueGroupGiftSlug(input.title);
  const gift = await prisma.groupGift.create({
    data: {
      organizerId,
      slug,
      title: input.title,
      message: input.message || null,
      productId: input.productId,
      targetAmount: input.targetAmount,
      deadline: input.deadline ? new Date(input.deadline) : null,
      organizerPaypalEmail: input.organizerPaypalEmail,
    },
    include: GROUP_GIFT_INCLUDE,
  });
  return toBaseDTO(gift);
}

export async function listMyGroupGifts(organizerId: string): Promise<GroupGiftDTO[]> {
  const gifts = await prisma.groupGift.findMany({
    where: { organizerId },
    include: GROUP_GIFT_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return gifts.map(toBaseDTO);
}

async function requireOwnedGroupGift(organizerId: string, id: string): Promise<GroupGiftRow> {
  const gift = await prisma.groupGift.findFirst({
    where: { id, organizerId },
    include: GROUP_GIFT_INCLUDE,
  });
  if (!gift) throw new AppError("NOT_FOUND", "No encontramos esa cabuda.", 404);
  return gift;
}

export async function getGroupGiftForManage(organizerId: string, id: string): Promise<GroupGiftManageDTO> {
  const gift = await requireOwnedGroupGift(organizerId, id);
  return {
    ...toBaseDTO(gift),
    organizerPaypalEmail: gift.organizerPaypalEmail,
    contributions: gift.contributions.map(toContributionDTO),
  };
}

/** Público — no requiere login, cualquiera con el link puede ver el
 * progreso y aportar. A diferencia de la lista de regalos, acá SÍ se
 * muestra quién aportó cuánto (parte del efecto social de una cabuda). */
export async function getPublicGroupGift(slug: string): Promise<GroupGiftPublicDTO | null> {
  const gift = await prisma.groupGift.findUnique({
    where: { slug },
    include: { ...GROUP_GIFT_INCLUDE, organizer: { select: { name: true } } },
  });
  if (!gift) return null;
  return {
    ...toBaseDTO(gift),
    organizerName: gift.organizer.name,
    contributions: gift.contributions.filter((c) => c.status === "PAID").map(toContributionDTO),
  };
}

/** Paso 1 de aportar: crea la orden de PayPal por el monto exacto que la
 * persona quiere aportar (no el total de la cabuda — alguien puede
 * aportar una parte). Deja un registro PENDING para poder rastrear el
 * intento aunque nunca lo termine de aprobar. */
export async function createContributionOrder(
  slug: string,
  input: ContributeToGroupGiftInput,
): Promise<{ contributionId: string; paypalOrderId: string }> {
  const gift = await prisma.groupGift.findUnique({ where: { slug } });
  if (!gift) throw new AppError("NOT_FOUND", "No encontramos esa cabuda.", 404);
  if (gift.status !== "OPEN") {
    throw new AppError("GROUP_GIFT_CLOSED", "Esta cabuda ya no está recibiendo aportes.", 400);
  }

  const paypalOrderId = await createPaypalCheckoutOrder(input.amount);
  const contribution = await prisma.groupGiftContribution.create({
    data: {
      groupGiftId: gift.id,
      contributorName: input.contributorName,
      amount: input.amount,
      paypalOrderId,
      status: "PENDING",
    },
  });
  return { contributionId: contribution.id, paypalOrderId };
}

/** Paso 2: el comprador ya aprobó en PayPal — captura el cobro real y
 * recién ahí marca el aporte como pagado. */
export async function confirmContribution(contributionId: string, paypalOrderId: string): Promise<void> {
  const contribution = await prisma.groupGiftContribution.findUnique({ where: { id: contributionId } });
  if (!contribution || contribution.paypalOrderId !== paypalOrderId) {
    throw new AppError("NOT_FOUND", "No encontramos ese aporte.", 404);
  }
  if (contribution.status === "PAID") return; // idempotente si se llama dos veces

  const capture = await capturePaypalOrder(paypalOrderId);
  await prisma.groupGiftContribution.update({
    where: { id: contributionId },
    data: { status: "PAID", captureId: capture.captureId },
  });
}

/**
 * Le manda al organizador todo lo recaudado (aportes PAID) por PayPal
 * Payouts, y cierra la cabuda. MIMO no arma un pedido automático — el
 * organizador hace la compra real él mismo con esa plata (ver el
 * comentario del modelo en el schema y "Diseño: cabudas").
 */
export async function finalizeGroupGift(organizerId: string, id: string): Promise<GroupGiftManageDTO> {
  const gift = await requireOwnedGroupGift(organizerId, id);
  if (gift.status !== "OPEN") throw new AppError("GROUP_GIFT_CLOSED", "Esta cabuda ya se cerró.", 400);

  const total = collectedAmount(gift);
  if (total <= 0) throw new AppError("NOTHING_COLLECTED", "Todavía no hay ningún aporte confirmado.", 400);

  const batchId = await sendPaypalPayout({
    receiverEmail: gift.organizerPaypalEmail,
    amount: total,
    senderItemId: gift.id,
    note: `Cabuda "${gift.title}" completada en MIMO`,
  });

  await prisma.groupGift.update({
    where: { id },
    data: { status: "COMPLETED", payoutReference: batchId },
  });

  return getGroupGiftForManage(organizerId, id);
}

/** Cancela la cabuda y reembolsa cada aporte PAID — para cuando el
 * organizador decide no seguir (ej. ya no hace falta el regalo). */
export async function cancelGroupGift(organizerId: string, id: string): Promise<GroupGiftManageDTO> {
  const gift = await requireOwnedGroupGift(organizerId, id);
  if (gift.status !== "OPEN") throw new AppError("GROUP_GIFT_CLOSED", "Esta cabuda ya se cerró.", 400);

  for (const contribution of gift.contributions) {
    if (contribution.status !== "PAID" || !contribution.captureId) continue;
    try {
      const refundId = await refundPaypalCapture(
        contribution.captureId,
        Number(contribution.amount),
        "USD",
        `La cabuda "${gift.title}" se canceló — te devolvemos tu aporte.`,
      );
      await prisma.groupGiftContribution.update({
        where: { id: contribution.id },
        data: { status: "REFUNDED", refundReference: refundId },
      });
    } catch {
      // Si un reembolso puntual falla, seguimos con el resto — no
      // queremos que uno solo trabe la cancelación completa. Queda como
      // PAID (no REFUNDED), visible para resolverlo a mano después.
    }
  }

  await prisma.groupGift.update({ where: { id }, data: { status: "CANCELLED" } });
  return getGroupGiftForManage(organizerId, id);
}
