import type { MetadataRoute } from "next";

// Los buscadores indexan el sitio público; el panel, la API y los enlaces con token (acceso, restablecimiento,
// vistas compartidas) quedan fuera.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*", allow: "/",
      disallow: ["/api/", "/panel/", "/*/panel", "/*/api/", "/empresas", "/login", "/*/login", "/codigo", "/acceso/", "/*/acceso/", "/*/acceder", "/restablecer/", "/*/restablecer/", "/p/", "/*/p/", "/e/", "/*/e/", "/r/", "/*/r/"],
    }],
  };
}
