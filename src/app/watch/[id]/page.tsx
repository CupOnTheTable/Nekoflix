import { redirect } from "next/navigation";

export default function WatchRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/watch/${params.id}/1`);
}
