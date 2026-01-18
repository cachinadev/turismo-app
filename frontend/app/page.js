<<<<<<< HEAD
import { redirect } from "next/navigation";

export default function RootRedirect() {
  // Redirect only from root `/`, not when already localized
  redirect("/es");
}
=======
import { redirect } from "next/navigation";

export default function RootRedirect() {
  // Redirect only from root `/`, not when already localized
  redirect("/en");
}
>>>>>>> 72d948c6d1c7d86949e7e46b13be97d4a318e6d9
