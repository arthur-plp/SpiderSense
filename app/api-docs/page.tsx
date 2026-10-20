import type { Metadata } from "next";
import SwaggerDocs from "./swagger-ui";

export const metadata: Metadata = {
  title: "API Docs",
};

export default function ApiDocsPage() {
  return (
    <div className="flex-1 bg-white">
      <SwaggerDocs url="/openapi.json" />
    </div>
  );
}
