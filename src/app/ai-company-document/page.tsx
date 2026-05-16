import { redirect } from "next/navigation";

type SearchParams = Promise<{ context?: string | string[] }>;

export default async function AICompanyDocumentPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ? await searchParams : {};
  const context = Array.isArray(params.context) ? params.context[0] : params.context;
  redirect(`/settings/ai-context-docs${context ? `?context=${encodeURIComponent(context)}` : ""}`);
}
