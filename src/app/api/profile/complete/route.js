const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "https://netsphere-iedu.onrender.com/api" : "http://localhost:5000/api");
const API_BASE_URL = rawApiUrl.replace(/\/$/, "").endsWith("/api") ? rawApiUrl.replace(/\/$/, "") : `${rawApiUrl.replace(/\/$/, "")}/api`;

export async function POST(request) {
  try {
    const body = await request.json();

    const response = await fetch(
      `${API_BASE_URL}/users/complete-profile`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(data, { status: response.status });
    }

    return Response.json(data);
  } catch (error) {
    console.error("Complete profile error:", error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { pathname } = new URL(request.url);
    const firebaseUid = pathname.split("/").pop();
    const body = await request.json();

    const response = await fetch(
      `${API_BASE_URL}/users/${firebaseUid}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(data, { status: response.status });
    }

    return Response.json(data);
  } catch (error) {
    console.error("Update profile error:", error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
