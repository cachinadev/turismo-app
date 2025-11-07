import { redirect } from "next/navigation";

export default function RootRedirect() {
  // Redirect only from root `/`, not when already localized
  redirect("/en");
}
