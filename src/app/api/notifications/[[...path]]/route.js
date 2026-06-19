import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "https://netsphere-iedu.onrender.com/api" : "http://localhost:5000/api");
const API_BASE_URL = rawApiUrl.replace(/\/$/, "").endsWith("/api") ? rawApiUrl.replace(/\/$/, "") : `${rawApiUrl.replace(/\/$/, "")}/api`;

async function handleProxy(request, { params }) {
  try {
    const { path } = await params;
    const subpath = path ? path.join("/") : "";
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const targetUrl = `${API_BASE_URL}/notifications/${subpath}${
      queryString ? `?${queryString}` : ""
    }`;

    let body = null;
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
      try {
        body = await request.text();
      } catch (e) {
        // empty body
      }
    }

    const headers = {
      "Content-Type": "application/json",
    };

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: body ? body : undefined,
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Notifications API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to proxy notifications request" },
      { status: 500 }
    );
  }
}

export {
  handleProxy as GET,
  handleProxy as POST,
  handleProxy as PUT,
  handleProxy as DELETE,
};
