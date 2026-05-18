import { DELETE as cancelInvitation } from "@/app/api/team/invitations/route";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const bodyRequest = new Request(request.url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });

  return cancelInvitation(bodyRequest);
}
