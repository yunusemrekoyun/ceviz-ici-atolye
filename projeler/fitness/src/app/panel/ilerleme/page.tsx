import { redirect } from "next/navigation";

export default function IlerlemePage() {
  redirect("/panel/profil?tab=ilerleme");
}
