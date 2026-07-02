import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    openapi: "3.1.0",
    info: { title: "Veldo Public API", version: "0.1.0" },
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer" },
      },
    },
    paths: {
      "/api/v1/campaigns": {
        get: {
          summary: "List campaigns",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Campaign list" } },
        },
      },
      "/api/v1/usage": {
        get: {
          summary: "Inspect API usage",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Usage summary" } },
        },
      },
    },
  });
}
