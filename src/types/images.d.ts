// Declara módulos de imágenes para importaciones con `next/image`
declare module "*.avif" {
  const src: import("next/image").StaticImageData;
  export default src;
}
declare module "*.bmp" {
  const src: import("next/image").StaticImageData;
  export default src;
}
declare module "*.gif" {
  const src: import("next/image").StaticImageData;
  export default src;
}
declare module "*.jpg" {
  const src: import("next/image").StaticImageData;
  export default src;
}
declare module "*.jpeg" {
  const src: import("next/image").StaticImageData;
  export default src;
}
declare module "*.png" {
  const src: import("next/image").StaticImageData;
  export default src;
}
declare module "*.webp" {
  const src: import("next/image").StaticImageData;
  export default src;
}
declare module "*.svg" {
  import * as React from "react";
  const src: import("next/image").StaticImageData;
  export default src;
}
