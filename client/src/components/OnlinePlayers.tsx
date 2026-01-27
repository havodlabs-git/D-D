import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Users, X, Globe, Swords, ShoppingBag, Compass, Moon } from "lucide-react";

// Class colors
const CLASS_COLORS: Record<string, string> = {
  fighter: "text-orange-400",
  wizard: "text-blue-400",
  rogue: "text-gray-300",
  cleric: "text-yellow-200",
  ranger: "text-green-400",
  paladin: "text-yellow-400",
  barbarian: "text-red-400",
  bard: "text-pink-400",
  druid: "text-emerald-400",
  monk: "text-cyan-400",
  sorcerer: "text-purple-400",
  warlock: "text-violet-400",
};

// Class icons
const CLASS_ICONS: Record<string, string> = {
  fighter: "⚔️",
  wizard: "🔮",
  rogue: "🗡️",
  cleric: "✝️",
  ranger: "🏹",
  paladin: "🛡️",
  barbarian: "🪓",
  bard: "🎵",
  druid: "🌿",
  monk: "👊",
  sorcerer: "✨",
  warlock: "👁️",
};

// Status icons
const STATUS_ICONS: Record<string, React.ReactNode> = {
  exploring: <Compass className="w-3 h-3 text-green-400" />,
  combat: <Swords className="w-3 h-3 text-red-400" />,
  dungeon: <Globe className="w-3 h-3 text-purple-400" />,
  shop: <ShoppingBag className="w-3 h-3 text-yellow-400" />,
  idle: <Moon className="w-3 h-3 text-gray-400" />,
};

interface OnlinePlayersProps {
  currentLat?: number;
  currentLng?: number;
}

export function OnlinePlayers({ currentLat, currentLng }: OnlinePlayersProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Get online player count
  const { data: onlineCount } = trpc.multiplayer.getOnlineCount.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Get nearby players
  const { data: nearbyPlayers } = trpc.multiplayer.getNearbyPlayers.useQuery(
    { latitude: currentLat, longitude: currentLng },
    { 
      enabled: isOpen,
      refetchInterval: 10000, // Refresh every 10 seconds when open
    }
  );
  
  // Send heartbeat every 30 seconds
  const heartbeatMutation = trpc.multiplayer.heartbeat.useMutation();
  
  useEffect(() => {
    // Send initial heartbeat
    heartbeatMutation.mutate({
      latitude: currentLat,
      longitude: currentLng,
      status: "exploring",
    });
    
    // Send heartbeat every 30 seconds
    const interval = setInterval(() => {
      heartbeatMutation.mutate({
        latitude: currentLat,
        longitude: currentLng,
        status: "exploring",
      });
    }, 30000);
    
    return () => clearInterval(interval);
  }, [currentLat, currentLng]);
  
  // Disconnect on unmount
  const disconnectMutation = trpc.multiplayer.disconnect.useMutation();
  useEffect(() => {
    return () => {
      disconnectMutation.mutate();
    };
  }, []);

  return (
    <>
      {/* Online Players Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="sm"
        className="fixed top-4 right-4 z-40 bg-black/80 border-primary/50 hover:bg-black/90"
      >
        <Users className="w-4 h-4 mr-2" />
        <span className="text-primary font-bold">{onlineCount?.count || 0}</span>
        <span className="ml-1 text-muted-foreground">online</span>
      </Button>

      {/* Online Players Panel */}
      {isOpen && (
        <Card className="fixed top-16 right-4 z-40 w-72 shadow-xl">
          <CardHeader className="p-3 border-b flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Jogadores Online ({onlineCount?.count || 0})
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-64">
              <div className="p-3 space-y-2">
                {nearbyPlayers && nearbyPlayers.length > 0 ? (
                  nearbyPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      {/* Class Icon */}
                      <span className="text-lg">
                        {CLASS_ICONS[player.characterClass] || "👤"}
                      </span>
                      
                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            "font-semibold text-sm truncate",
                            CLASS_COLORS[player.characterClass] || "text-foreground"
                          )}>
                            {player.characterName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Lv.{player.characterLevel}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {STATUS_ICONS[player.status || "exploring"]}
                          <span className="capitalize">
                            {player.status === "exploring" ? "Explorando" :
                             player.status === "combat" ? "Em Combate" :
                             player.status === "dungeon" ? "Na Dungeon" :
                             player.status === "shop" ? "Na Loja" :
                             "Inativo"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum jogador próximo</p>
                    <p className="text-xs">Continue explorando!</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </>
  );
}

export default OnlinePlayers;
