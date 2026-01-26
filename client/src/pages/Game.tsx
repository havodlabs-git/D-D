import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { GameMap } from "@/components/GameMap";
import { PlayerHUD } from "@/components/PlayerHUD";
import { CharacterCreation } from "@/components/CharacterCreation";
import { InventoryScreen } from "@/components/InventoryScreen";
import { CharacterSheet } from "@/components/CharacterSheet";
import { POIInteraction } from "@/components/POIInteraction";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, Settings, Database } from "lucide-react";
import { toast } from "sonner";

interface POI {
  id: string;
  type: "monster" | "npc" | "shop" | "treasure" | "dungeon";
  name: string;
  latitude: number;
  longitude: number;
  biome: string;
  data: any;
}

export default function Game() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [showInventory, setShowInventory] = useState(false);
  const [showCharacter, setShowCharacter] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);

  const { data: character, isLoading: characterLoading, refetch: refetchCharacter } = trpc.character.get.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const seedMutation = trpc.gameData.seed.useMutation();

  // Handle seed game data (admin only)
  const handleSeedData = async () => {
    try {
      await seedMutation.mutateAsync();
      toast.success("Dados do jogo inicializados!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao inicializar dados");
    }
  };

  // Loading state
  if (authLoading || (isAuthenticated && characterLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Carregando...</h2>
          <p className="text-muted-foreground">Preparando sua aventura</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-8xl mb-6">🐉</div>
          <h1 className="text-4xl font-bold text-primary mb-4">D&D GO</h1>
          <p className="text-muted-foreground mb-8">
            Explore o mundo real transformado em um cenário de Dungeons & Dragons.
            Encontre monstros, NPCs, lojas e tesouros baseados na sua localização!
          </p>
          <Button size="lg" className="w-full" asChild>
            <a href={getLoginUrl()}>
              <LogIn className="w-5 h-5 mr-2" />
              Entrar para Jogar
            </a>
          </Button>
        </div>
      </div>
    );
  }

  // No character - show creation
  if (!character) {
    return <CharacterCreation onCharacterCreated={() => refetchCharacter()} />;
  }

  // Main game view
  return (
    <div className="h-screen w-screen overflow-hidden bg-background relative">
      {/* Map */}
      <GameMap
        className="absolute inset-0"
        onPOIClick={(poi) => setSelectedPOI(poi)}
      />

      {/* Player HUD */}
      <PlayerHUD
        className="absolute top-4 left-4 w-64 z-10"
        onOpenInventory={() => setShowInventory(true)}
        onOpenQuests={() => setShowQuests(true)}
        onOpenCharacter={() => setShowCharacter(true)}
      />

      {/* Admin Controls (only for admin users) */}
      {user?.role === "admin" && (
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedData}
            disabled={seedMutation.isPending}
            className="bg-card/95"
          >
            {seedMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Seed Data
              </>
            )}
          </Button>
        </div>
      )}

      {/* Modals */}
      {showInventory && (
        <InventoryScreen onClose={() => setShowInventory(false)} />
      )}

      {showCharacter && (
        <CharacterSheet onClose={() => setShowCharacter(false)} />
      )}

      {selectedPOI && (
        <POIInteraction
          poi={selectedPOI}
          onClose={() => setSelectedPOI(null)}
        />
      )}

      {/* Quest placeholder toast */}
      {showQuests && (
        <>
          {toast.info("Sistema de missões em desenvolvimento!")}
          {setShowQuests(false)}
        </>
      )}
    </div>
  );
}
