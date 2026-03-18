import { motion } from "framer-motion";
import { RegionCard, MaterialCard, EventCard, Card } from "../data/cards";
import { cn } from "@/lib/utils";

type Props = {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  faceDown?: boolean;
  small?: boolean;
  disabled?: boolean;
  className?: string;
};

function RegionCardView({ card, small }: { card: RegionCard; small?: boolean }) {
  return (
    <div className={cn("flex flex-col h-full justify-between", small ? "gap-0.5" : "gap-1")}>
      <div className={cn("text-center", small ? "text-2xl" : "text-4xl")}>{card.emoji}</div>
      <div>
        <div className={cn("font-bold text-white text-center leading-tight", small ? "text-xs" : "text-sm")}>{card.name}</div>
        <div className={cn("text-white/80 text-center italic", small ? "text-[9px]" : "text-xs")}>{card.dish}</div>
      </div>
      <div className="flex flex-wrap gap-0.5 justify-center">
        {card.requiredMaterials.map((m, i) => (
          <span
            key={i}
            className={cn("bg-white/20 text-white rounded px-1 font-medium", small ? "text-[8px]" : "text-[10px]")}
          >
            {m}
          </span>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <span className={cn("text-white/70", small ? "text-[9px]" : "text-xs")}>Bölge</span>
        <span className={cn("font-bold text-yellow-300", small ? "text-xs" : "text-base")}>
          ⭐ {card.points}
        </span>
      </div>
    </div>
  );
}

function MaterialCardView({ card, small }: { card: MaterialCard; small?: boolean }) {
  return (
    <div className="flex flex-col h-full justify-between gap-1">
      <div className={cn("text-center", small ? "text-2xl" : "text-4xl")}>{card.emoji}</div>
      <div className={cn("text-white font-semibold text-center leading-tight", small ? "text-[9px]" : "text-xs")}>
        {card.materialType === "Joker" ? (
          <span className="text-yellow-300">✨ Joker</span>
        ) : (
          card.materialType
        )}
      </div>
      <div className={cn("text-white/70 text-center leading-tight", small ? "text-[8px]" : "text-[10px]")}>
        {card.name.split("(")[0].trim()}
      </div>
      <div>
        <span className={cn("text-white/50", small ? "text-[8px]" : "text-[10px]")}>Malzeme</span>
      </div>
    </div>
  );
}

function EventCardView({ card, small }: { card: EventCard; small?: boolean }) {
  return (
    <div className="flex flex-col h-full justify-between gap-1">
      <div className={cn("text-center", small ? "text-2xl" : "text-4xl")}>{card.emoji}</div>
      <div className={cn("font-bold text-white text-center leading-tight", small ? "text-[9px]" : "text-xs")}>
        {card.effectName}
      </div>
      <div className={cn("text-white/80 text-center leading-tight", small ? "text-[8px]" : "text-[10px]")}>
        {card.description}
      </div>
      <div>
        <span className={cn("text-yellow-200 font-medium", small ? "text-[8px]" : "text-[10px]")}>⚡ Olay Kartı</span>
      </div>
    </div>
  );
}

export function GameCard({ card, selected, onClick, faceDown, small, disabled, className }: Props) {
  const gradientClass =
    card.type === "region"
      ? (card as RegionCard).color
      : card.type === "material"
      ? (card as MaterialCard).color
      : (card as EventCard).color;

  const width = small ? "w-20" : "w-28";
  const height = small ? "h-28" : "h-40";
  const padding = small ? "p-1.5" : "p-2";

  return (
    <motion.div
      whileHover={!disabled ? { scale: 1.05, y: -8 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      animate={{
        y: selected ? -12 : 0,
        boxShadow: selected
          ? "0 0 0 3px #fbbf24, 0 8px 24px rgba(0,0,0,0.4)"
          : "0 2px 8px rgba(0,0,0,0.2)",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={!disabled ? onClick : undefined}
      className={cn(
        `${width} ${height} rounded-xl ${padding} bg-gradient-to-br ${gradientClass} border-2 cursor-pointer flex-shrink-0`,
        selected ? "border-yellow-400" : "border-white/20",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {faceDown ? (
        <div className="flex h-full items-center justify-center">
          <span className="text-3xl">🎴</span>
        </div>
      ) : (
        <RegionOrMaterialOrEvent card={card} small={small} />
      )}
    </motion.div>
  );
}

function RegionOrMaterialOrEvent({ card, small }: { card: Card; small?: boolean }) {
  if (card.type === "region") return <RegionCardView card={card as RegionCard} small={small} />;
  if (card.type === "material") return <MaterialCardView card={card as MaterialCard} small={small} />;
  return <EventCardView card={card as EventCard} small={small} />;
}
