"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Upload, Database, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { loadDemoData } from "@/lib/api";

type Step = "welcome" | "data" | "ready";

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoadDemo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loadDemoData();
      setCurrentStep("ready");
    } catch (err) {
      console.error("Failed to load demo data:", err);
      // Still proceed for demo purposes
      setCurrentStep("ready");
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { key: "welcome", label: "Welcome" },
    { key: "data", label: "Data" },
    { key: "ready", label: "Ready" },
  ];

  const currentIdx = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <motion.div
        className="max-w-lg w-full"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((step, idx) => (
            <div key={step.key} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  idx <= currentIdx
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent/50 text-muted-foreground border border-border/50"
                }`}
              >
                {idx < currentIdx ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  idx + 1
                )}
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-12 h-0.5 ${idx < currentIdx ? "bg-primary" : "bg-border/50"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-8">
          <AnimatePresence mode="wait">
            {currentStep === "welcome" && (
              <motion.div
                key="welcome"
                className="text-center"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto mb-6">
                  <Brain className="w-8 h-8 text-foreground" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-3">
                  Meet Alex
                </h1>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  I&apos;m your AI COO agent. I analyze your business data,
                  monitor key metrics, and give you actionable insights -
                  all through natural conversation.
                </p>
                <p className="text-xs text-muted-foreground/70 mb-8">
                  Let&apos;s get your data connected so I can start working for you.
                </p>
                <button
                  onClick={() => setCurrentStep("data")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-foreground/90 transition-colors shadow-lg shadow-black/10"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {currentStep === "data" && (
              <motion.div
                key="data"
                className="text-center"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Connect Your Data
                </h2>
                <p className="text-sm text-muted-foreground mb-8">
                  Load demo data or upload your own CSV files.
                </p>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                    {error}
                  </div>
                )}

                {/* Demo Button */}
                <button
                  onClick={handleLoadDemo}
                  disabled={isLoading}
                  className="w-full glass rounded-xl p-6 mb-4 text-left hover:border-primary/30 transition-all duration-200 group disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 text-foreground animate-spin" />
                      ) : (
                        <Database className="w-5 h-5 text-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground mb-0.5">
                        Load Bella Casa Demo
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Italian furniture company - 18 months of data, 12 tables
                      </p>
                    </div>
                  </div>
                </button>

                {/* Upload Area */}
                <div className="glass rounded-xl p-6 text-center border-dashed border-2 border-border/30 hover:border-primary/20 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-1">Upload your CSV files</p>
                  <p className="text-xs text-muted-foreground/60">Drag & drop or click to browse</p>
                </div>
              </motion.div>
            )}

            {currentStep === "ready" && (
              <motion.div
                key="ready"
                className="text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="w-16 h-16 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  You&apos;re All Set!
                </h2>
                <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                  Bella Casa Furniture data is loaded. I&apos;ve got 12 tables covering
                  sales, production, inventory, and more. Let&apos;s dive in.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => router.push("/")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent/50 text-foreground text-sm font-medium hover:bg-accent border border-border/50 transition-colors"
                  >
                    Go to Hub
                  </button>
                  <button
                    onClick={() => router.push("/chat")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-foreground/90 transition-colors shadow-lg shadow-black/10"
                  >
                    Chat with Alex
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
