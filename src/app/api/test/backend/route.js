const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "https://netsphere-iedu.onrender.com/api" : "http://localhost:5000/api");
const API_BASE_URL = rawApiUrl.replace(/\/$/, "").endsWith("/api") ? rawApiUrl.replace(/\/$/, "") : `${rawApiUrl.replace(/\/$/, "")}/api`;

export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/upload/test`);

    if (!response.ok) {
      return Response.json(
        { message: "Backend not responding", status: response.status },
        { status: 502 }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error("Backend connection error:", error);
    return Response.json(
      { message: "Cannot connect to backend server", error: error.message },
      { status: 503 }
    );
  }
}
