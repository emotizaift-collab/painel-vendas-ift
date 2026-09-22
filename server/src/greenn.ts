import type { GreennSale } from '../../shared/types.js';
import fs from 'node:fs/promises';

const DEFAULT_URL = 'https://apiadm.greenn.com.br/api/v1/sales';
type ApiSale = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function amount(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(text(value).replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateOf(row: ApiSale): string | null {
  const value = text(row.paid_at ?? row.created_at ?? row.createdAt ?? row.date ?? row.sale_date);
  return value ? value.slice(0, 10) : null;
}

function duplicateKey(row: ApiSale, productId: string, status: GreennSale['status']): string | null {
  const clientId = text(row.client_id ?? row.clientId);
  const timestamp = text(row.paid_at ?? row.created_at ?? row.createdAt);
  if (!clientId || !timestamp) return null;
  return [
    productId,
    clientId,
    timestamp,
    text(row.offer_id ?? row.offerId),
    amount(row.total ?? row.amount ?? row.value ?? row.price),
    text(row.method ?? row.payment_method),
    text(row.installments),
    status,
  ].join('|');
}

function normalizeStatus(value: unknown): GreennSale['status'] {
  const status = text(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (['paid', 'approved', 'completed', 'succeeded', 'pago', 'aprovada'].includes(status)) return 'paid';
  if (['waiting', 'pending', 'waiting_payment', 'aguardando', 'pendente'].includes(status)) return 'waiting';
  if (['refunded', 'refund', 'reversed', 'estornado', 'reembolsado'].includes(status)) return 'refunded';
  return 'other';
}

function rows(payload: unknown): ApiSale[] {
  if (Array.isArray(payload)) return payload.filter((item): item is ApiSale => !!item && typeof item === 'object');
  if (!payload || typeof payload !== 'object') return [];
  const object = payload as Record<string, unknown>;
  for (const key of ['data', 'sales', 'results', 'items']) {
    if (Array.isArray(object[key])) return rows(object[key]);
  }
  return [];
}

function hasNext(payload: unknown, page: number, count: number): boolean {
  if (payload && typeof payload === 'object') {
    const meta = (payload as Record<string, unknown>).meta;
    if (meta && typeof meta === 'object') {
      const value = meta as Record<string, unknown>;
      if (value.last_page !== undefined) return page < Number(value.last_page);
      if (value.current_page !== undefined && value.total !== undefined) {
        return page * count < Number(value.total);
      }
    }
    const value = payload as Record<string, unknown>;
    if (value.next_page || value.next) return true;
  }
  return count > 0;
}

interface GreennProfile {
  id: string;
  label: string;
  token: string;
  productIds: Set<string>;
  allProducts: boolean;
  url: string;
}

function configuredProfiles(): GreennProfile[] {
  const profiles = [
    {
      id: 'bianca',
      label: 'IFTS',
      token: process.env.GREENN_BIANCA_TOKEN,
      productIds: process.env.GREENN_BIANCA_PRODUCT_IDS || '171399',
    },
    {
      id: 'palestrante',
      label: 'IFT',
      token: process.env.GREENN_PALESTRANTE_TOKEN,
      productIds: process.env.GREENN_PALESTRANTE_PRODUCT_IDS || '',
    },
  ];
  return profiles
    .filter((profile) => profile.token?.trim())
    .map((profile) => ({
      id: profile.id,
      label: profile.label,
      token: profile.token!.trim(),
      productIds: new Set(profile.productIds.split(',').map((id) => id.trim()).filter(Boolean)),
      allProducts: profile.productIds.trim() === '*',
      url: process.env.GREENN_API_URL?.trim() || DEFAULT_URL,
    }))
    .filter((profile) => profile.allProducts || profile.productIds.size > 0);
}

export interface GreennFetchResult {
  sales: GreennSale[];
  profiles: Array<{ id: string; label: string }>;
  warnings: string[];
}

export async function fetchGreennSales(): Promise<GreennFetchResult> {
  const profiles = configuredProfiles();
  if (profiles.length === 0 && process.env.GREENN_LOCAL_FILE?.trim()) {
    const raw = await fs.readFile(process.env.GREENN_LOCAL_FILE.trim(), 'utf8');
    const payload: unknown = JSON.parse(raw.replace(/^\uFEFF/, '').trim());
    const localProfile = {
      id: 'bianca',
      label: 'IFTS',
      productIds: new Set((process.env.GREENN_BIANCA_PRODUCT_IDS || '171399')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)),
    };
    const seen = new Set<string>();
    const sales = rows(payload).flatMap((row, index) => {
      const productId = text(row.product_id ?? row.productId);
      if (!localProfile.productIds.has(productId)) return [];
      const status = normalizeStatus(row.status ?? row.payment_status ?? row.transaction_status);
      const key = duplicateKey(row, productId, status);
      if (key && seen.has(key)) return [];
      if (key) seen.add(key);
      return [{
        id: text(row.id ?? `local-${index}`),
        profileId: localProfile.id,
        productId,
        offerId: text(row.offer_id ?? row.offerId) || null,
        date: dateOf(row),
        status,
        amount: amount(row.total ?? row.amount ?? row.value ?? row.price),
        participantsCount: Math.max(0, Math.trunc(amount(row.participants_count ?? row.participantsCount ?? 1))),
      }];
    });
    const meta = payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>).meta
      : null;
    const incomplete = meta && typeof meta === 'object' &&
      Number((meta as Record<string, unknown>).last_page ?? 1) > 1;
    return {
      sales,
      profiles: [localProfile].map(({ id, label }) => ({ id, label })),
      warnings: incomplete
        ? ['Arquivo local da Greenn contém apenas uma página da API; atualize a exportação ou configure um token para carregar todas as páginas.']
        : [],
    };
  }
  const result: GreennSale[] = [];
  for (const profile of profiles) {
    const seen = new Set<string>();
    for (let page = 1; ; page += 1) {
      if (page > 1000) {
        throw new Error(`Greenn (${profile.label}) excedeu o limite seguro de paginação.`);
      }
      const url = new URL(profile.url);
      url.searchParams.set('page', String(page));
      url.searchParams.set('per_page', '100');
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${profile.token}`,
        },
      });
      if (!response.ok) throw new Error(`Greenn (${profile.label}) respondeu ${response.status}`);
      const payload: unknown = await response.json();
      const pageRows = rows(payload);
      for (const row of pageRows) {
        const productId = text(row.product_id ?? row.productId ?? (row.product as Record<string, unknown> | undefined)?.id);
        if (!profile.allProducts && !profile.productIds.has(productId)) continue;
        const status = normalizeStatus(row.status ?? row.payment_status ?? row.transaction_status);
        const key = duplicateKey(row, productId, status);
        if (key && seen.has(key)) continue;
        if (key) seen.add(key);
        result.push({
          id: text(row.id ?? row.sale_id ?? `${profile.id}-${productId}-${result.length}`),
          profileId: profile.id,
          productId,
          offerId: text(row.offer_id ?? row.offerId) || null,
          date: dateOf(row),
          status,
          amount: amount(row.total ?? row.amount ?? row.value ?? row.price),
          participantsCount: Math.max(0, Math.trunc(amount(row.participants_count ?? row.participantsCount ?? 1))),
        });
      }
      if (!hasNext(payload, page, pageRows.length) || pageRows.length === 0) break;
    }
  }
  return {
    sales: result,
    profiles: profiles.map(({ id, label }) => ({ id, label })),
    warnings: [],
  };
}
