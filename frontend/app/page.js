// frontend/app/page.js
import { redirect } from "next/navigation";

export default function RootRedirect() {
  // Redirect only from root `/`, not when already localized
  redirect("/es");
}
