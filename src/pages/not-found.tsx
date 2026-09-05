import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/* This was the untouched scaffold page: `bg-gray-50`, `text-gray-900` and
 * `text-red-500` from the raw Tailwind palette, which rendered as a white card
 * on a light grey field no matter which theme the app was in — and the copy
 * ("Did you forget to add the page to the router?") was addressed to whoever
 * built the app rather than whoever landed here. */
export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <AlertCircle size={24} className="mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
        <h1 className="font-syne text-2xl font-bold text-foreground">Nothing here</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          That link doesn't point to a page in your library.
        </p>
        <Link href="/home">
          <Button className="mt-6 min-h-11 w-full">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
