import { getPublicKey } from "@/lib/signing";

export async function GET() {
  return Response.json({ public_key: getPublicKey() });
}
