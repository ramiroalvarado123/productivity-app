import { ImageResponse } from "next/og";
import { createElement } from "react";

export const runtime = "edge";

const SUPPORTED_SIZES = new Set([180, 192, 512]);

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedSize = Number(searchParams.get("size"));
  const size = SUPPORTED_SIZES.has(requestedSize) ? requestedSize : 512;
  const maskable = searchParams.get("maskable") === "1";

  const response = new ImageResponse(
    createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#164735",
          padding: maskable ? "19%" : "10%",
        },
      },
      createElement(
        "div",
        {
          style: {
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "25%",
            background: "#F9F8F4",
            color: "#164735",
            fontFamily: "Georgia, serif",
            fontSize: size * 0.52,
            fontWeight: 700,
            lineHeight: 1,
            paddingBottom: size * 0.045,
          },
        },
        "A",
      ),
    ),
    { width: size, height: size },
  );

  response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return response;
}
