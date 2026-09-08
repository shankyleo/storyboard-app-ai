import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center text-zinc-100">
      <p className="text-sm uppercase tracking-widest text-amber-400">404</p>
      <h1 className="mt-3 text-2xl font-semibold">Story not found</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        This story doesn&apos;t exist in this browser session. Start a new one
        from the home page.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400"
      >
        Start your story
      </Link>
    </div>
  );
}
