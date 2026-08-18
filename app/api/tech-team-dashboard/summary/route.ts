import { NextRequest, NextResponse } from "next/server";
export async function GET() {
    return NextResponse.json({
       totalAlerts: 20,
       failures: 3
    });
 }
 ``