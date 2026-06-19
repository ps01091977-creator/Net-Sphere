import { NextResponse } from "next/server";

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "https://netsphere-iedu.onrender.com/api" : "http://localhost:5000/api");
const API_BASE_URL = rawApiUrl.replace(/\/$/, "").endsWith("/api") ? rawApiUrl.replace(/\/$/, "") : `${rawApiUrl.replace(/\/$/, "")}/api`;

export async function POST(request, { params }) {
  try {
    const { postId } = await params;
    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/posts/${postId}/comment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to add comment" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { postId } = await params;

    const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to fetch comments" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { postId } = await params;
    const body = await request.json();
    const { commentId } = body;

    const response = await fetch(
      `${API_BASE_URL}/posts/${postId}/comment/${commentId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to delete comment" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
