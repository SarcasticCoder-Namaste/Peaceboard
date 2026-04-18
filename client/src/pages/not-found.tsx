import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Heart, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-emerald-400 rounded-full blur-2xl opacity-30" />
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-xl">
            <Heart className="w-12 h-12 text-white" />
          </div>
        </div>

        <h1 className="text-7xl font-extrabold tracking-tight bg-gradient-to-br from-blue-600 to-emerald-600 bg-clip-text text-transparent">
          404
        </h1>
        <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
          We couldn't find that page
        </h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          The link might be broken or the page may have moved. Let's get you back to
          something kind.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button size="lg" className="gap-2 bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white shadow-md">
              <Home className="w-4 h-4" /> Back to Home
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/")}
          >
            <ArrowLeft className="w-4 h-4" /> Go back
          </Button>
        </div>
      </div>
    </div>
  );
}
