export interface GiftRegistryDTO {
  id: string;
  slug: string;
  title: string;
  eventType: string | null;
  eventDate: string | null;
  message: string | null;
  isActive: boolean;
  itemCount: number;
  reservedCount: number;
  createdAt: string;
}

export interface GiftRegistryItemDTO {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImageUrl: string | null;
  price: number;
  note: string | null;
  isReserved: boolean;
}

/** Solo para el dueño de la lista — a los visitantes públicos no se les
 * dice QUIÉN reservó cada regalo (ver README, "Diseño: listas de
 * regalos"). */
export interface GiftRegistryOwnerItemDTO extends GiftRegistryItemDTO {
  reservedByName: string | null;
  reservedAt: string | null;
}

export interface GiftRegistryPublicDTO {
  title: string;
  eventType: string | null;
  eventDate: string | null;
  message: string | null;
  ownerName: string;
  items: GiftRegistryItemDTO[];
}

export interface GiftRegistryManageDTO extends GiftRegistryDTO {
  items: GiftRegistryOwnerItemDTO[];
}

export interface GiftRegistryInput {
  title: string;
  eventType?: string;
  eventDate?: string;
  message?: string;
  isActive: boolean;
}

export interface AddGiftRegistryItemInput {
  productId: string;
  note?: string;
}

export interface ReserveGiftInput {
  reservedByName: string;
}
