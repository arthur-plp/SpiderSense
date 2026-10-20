"use client";

import { useEffect, useRef } from "react";
import "swagger-ui-dist/swagger-ui.css";

// We load swagger-ui-dist's prebuilt bundle instead of swagger-ui-react:
// Turbopack tree-shakes apidom's side-effect module (refractor/registration.mjs)
// out of the unbundled sources, which crashes with
// "OpenApi3_1Element.refract is not a function".
export default function SwaggerDocs({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    import("swagger-ui-dist/swagger-ui-es-bundle.js").then(
      ({ default: SwaggerUI }) => {
        if (cancelled || !containerRef.current) return;
        SwaggerUI({ url, domNode: containerRef.current });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [url]);

  return <div ref={containerRef} />;
}
