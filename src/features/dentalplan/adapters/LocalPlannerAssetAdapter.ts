import type { PlannerAssetMetadata } from "@/types/models";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class LocalPlannerAssetAdapter {
  async readSvg(file: File): Promise<PlannerAssetMetadata> {
    if (file.type !== "image/svg+xml" || !file.name.toLowerCase().endsWith(".svg"))
      throw new Error("Select an SVG file.");
    if (file.size > 256_000) throw new Error("SVG files must be smaller than 250 KB.");
    const source = await file.text();
    const document = new DOMParser().parseFromString(source, "image/svg+xml");
    if (document.querySelector("parsererror")) throw new Error("The SVG file is invalid.");
    document
      .querySelectorAll("script, foreignObject, iframe, object, embed")
      .forEach((node) => node.remove());
    document.querySelectorAll("*").forEach((node) => {
      for (const attribute of [...node.attributes])
        if (
          attribute.name.toLowerCase().startsWith("on") ||
          /javascript:/i.test(attribute.value) ||
          (/^(href|xlink:href)$/i.test(attribute.name) && !attribute.value.startsWith("#"))
        )
          node.removeAttribute(attribute.name);
    });
    return this.metadata(file, new XMLSerializer().serializeToString(document.documentElement));
  }

  async readHotelImage(file: File): Promise<PlannerAssetMetadata> {
    if (!IMAGE_TYPES.has(file.type)) throw new Error("Use a JPG, PNG or WebP image.");
    if (file.size > 500_000) throw new Error("Images must be smaller than 500 KB.");
    return this.metadata(file);
  }

  private async metadata(file: File, safeText?: string): Promise<PlannerAssetMetadata> {
    const dataUrl = safeText
      ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(safeText)))}`
      : await new Promise<string>((resolve, reject) => {
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
