import type { PlannerAssetMetadata } from "@/types/models";
import { savePlannerAsset } from "./plannerAssetStorage";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class LocalPlannerAssetAdapter {
  async readHotelImage(file: File): Promise<PlannerAssetMetadata> {
    if (!IMAGE_TYPES.has(file.type)) throw new Error("Use a JPG, PNG or WebP image.");
    if (file.size > 500_000) throw new Error("Images must be smaller than 500 KB.");
    return this.metadata(file);
  }

  async readSvgLogo(file: File): Promise<PlannerAssetMetadata> {
    if (file.type !== "image/svg+xml" || !file.name.toLowerCase().endsWith(".svg")) {
      throw new Error("Choose an SVG file with the image/svg+xml MIME type.");
    }
    if (file.size > 500_000) throw new Error("SVG logos must be smaller than 500 KB.");
    return this.metadata(file);
  }

  private async metadata(file: File): Promise<PlannerAssetMetadata> {
    const id = crypto.randomUUID();
    await savePlannerAsset(id, file);
    return {
      id,
      name: file.name,
      mime_type: file.type,
      size: file.size,
      storage_key: id,
      data_url: URL.createObjectURL(file),
    };
  }
}
