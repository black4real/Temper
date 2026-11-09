import {
  Apple, Bed, Bike, BookOpen, Brain, Camera, Clapperboard, Code, Droplet, Dumbbell,
  Footprints, HeartPulse, Languages, Leaf, MessageCircle, Mic, Moon, Music, PenLine, Salad,
  Sprout, Sun, Timer, Wallet, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Maps the icon names stored on a commitment (HABIT_ICONS) to lucide components.
// Explicit imports keep the bundle to just these 24 icons.
export const ICON_COMPONENTS: Record<string, LucideIcon> = {
  clapperboard: Clapperboard,
  code: Code,
  droplet: Droplet,
  moon: Moon,
  "pen-line": PenLine,
  "book-open": BookOpen,
  mic: Mic,
  "message-circle": MessageCircle,
  dumbbell: Dumbbell,
  footprints: Footprints,
  bike: Bike,
  apple: Apple,
  salad: Salad,
  brain: Brain,
  music: Music,
  camera: Camera,
  languages: Languages,
  sun: Sun,
  bed: Bed,
  "heart-pulse": HeartPulse,
  wallet: Wallet,
  sprout: Sprout,
  leaf: Leaf,
  timer: Timer,
};

export function HabitIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = name ? ICON_COMPONENTS[name] : undefined;
  if (!Icon) return null;
  return <Icon aria-hidden className={cn("size-4 shrink-0", className)} strokeWidth={1.75} />;
}
