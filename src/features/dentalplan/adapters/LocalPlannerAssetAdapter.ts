import type { PlannerAssetMetadata } from "@/types/models";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class LocalPlannerAssetAdapter {
  async readHotelImage(file: File): Promise<PlannerAssetMetadata> {
    if (!IMAGE_TYPES.has(file.type)) throw new Error("Use a JPG, PNG or WebP image.");
    if (file.size > 500_000) throw new Error("Images must be smaller than 500 KB.");
    return this.metadata(file);
  }

  private async metadata(file: File): Promise<PlannerAssetMetadata> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("The selected file could not be read."));
      reader.readAsDataURL(file);
    });
    return {
      id: crypto.randomUUID(),
      name: file.name,
      mime_type: file.type,
      size: file.size,
      data_url: dataUrl,
    };
  }
}
