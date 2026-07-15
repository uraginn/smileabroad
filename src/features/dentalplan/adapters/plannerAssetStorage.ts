import { useEffect, useState } from "react";

const DATABASE_NAME = "smileabroad-media-v1";
const STORE_NAME = "planner-assets";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Browser media storage is unavailable."));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Media storage could not be opened."));
  });
}

export async function savePlannerAsset(key: string, blob: Blob) {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(blob, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Media could not be saved."));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Media save was cancelled."));
    });
  } finally {
    database.close();
  }
}

export async function migrateLegacyPlannerAssets(state: unknown) {
  if (!state || typeof state !== "object") return state;
  const record = state as {
    clinicHotels?: Array<{ images?: Array<Record<string, unknown>> }>;
    branding?: Array<Record<string, unknown>>;
  };
  for (const hotel of record.clinicHotels ?? []) {
    for (const image of hotel.images ?? []) {
      const dataUrl = typeof image.data_url === "string" ? image.data_url : undefined;
      const key =
        typeof image.storage_key === "string"
          ? image.storage_key
          : typeof image.id === "string"
            ? image.id
            : undefined;
      if (!key || !dataUrl?.startsWith("data:")) continue;
      try {
        const blob = await (await fetch(dataUrl)).blob();
        await savePlannerAsset(key, blob);
        image.storage_key = key;
        delete image.data_url;
      } catch (error) {
        if (import.meta.env.DEV) console.error("Legacy hotel media could not be migrated", error);
      }
    }
  }
  for (const branding of record.branding ?? []) {
    const logo = typeof branding.logo_url === "string" ? branding.logo_url : undefined;
    if (!logo?.startsWith("data:")) continue;
    const key =
      typeof branding.logo_asset_id === "string"
        ? branding.logo_asset_id
        : `branding-logo-${String(branding.clinic_id ?? crypto.randomUUID())}`;
    try {
      await savePlannerAsset(key, await (await fetch(logo)).blob());
      branding.logo_asset_id = key;
      delete branding.logo_url;
    } catch (error) {
      if (import.meta.env.DEV) console.error("Legacy clinic logo could not be migrated", error);
    }
  }
  return state;
}

async function loadPlannerAsset(key: string) {
  const database = await openDatabase();
  try {
    return await new Promise<Blob | undefined>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
      request.onsuccess = () =>
        resolve(request.result instanceof Blob ? request.result : undefined);
      request.onerror = () => reject(request.error ?? new Error("Media could not be loaded."));
    });
  } finally {
    database.close();
  }
}

export function usePlannerAssetUrl(storageKey?: string, fallbackUrl?: string) {
  const [url, setUrl] = useState(fallbackUrl);
  useEffect(() => {
    setUrl(fallbackUrl);
    if (!storageKey || fallbackUrl) return;
    let active = true;
    let objectUrl: string | undefined;
    void loadPlannerAsset(storageKey)
      .then((blob) => {
        if (!active || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((error) => {
        if (import.meta.env.DEV) console.error("Planner media could not be loaded", error);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fallbackUrl, storageKey]);
  return url;
}

export function usePlannerAssetUrlMap(
  assets: Array<{ id: string; storage_key?: string; data_url?: string }>,
) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const signature = assets
    .map((asset) => `${asset.id}:${asset.storage_key ?? ""}:${asset.data_url ?? ""}`)
    .join("|");
  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];
    const next = Object.fromEntries(
      assets.filter((asset) => asset.data_url).map((asset) => [asset.id, asset.data_url!]),
    );
    setUrls(next);
    void Promise.all(
      assets.map(async (asset) => {
        if (!asset.storage_key || asset.data_url) return;
        const blob = await loadPlannerAsset(asset.storage_key);
        if (!blob || !active) return;
        const objectUrl = URL.createObjectURL(blob);
        objectUrls.push(objectUrl);
        next[asset.id] = objectUrl;
      }),
    )
      .then(() => {
        if (active) setUrls({ ...next });
      })
      .catch((error) => {
        if (import.meta.env.DEV) console.error("Planner media could not be loaded", error);
      });
    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [assets, signature]);
  return urls;
}
