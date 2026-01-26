import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { PixelWorldMap } from "@/components/PixelWorldMap";
import { PlayerHUD } from "@/components/PlayerHUD";
import { CharacterCreation } from "@/components/CharacterCreation";
import { InventoryScreen } from "@/components/InventoryScreen";
import { CharacterSheet } from "@/components/CharacterSheet";
import { CombatScreen } from "@/components/CombatScreen";
import { ShopScreen } from "@/components/ShopScreen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogIn, Database, X, Swords, ShoppingBag, Users, Gem, Compass } from "lucide-react";
import { toast } from "sonner";

interface GamePOI {
  id: string;
  type: "monster" | "npc" | "shop" | "treasure" | "dungeon" | "quest";
  name: string;
  latitude: number;
  longitude: number;
  biome?: string;
  data?: any;
}

// Seeded random for consistent generation
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

export default function Game() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [showInventory, setShowInventory] = useState(false);
  const [showCharacter, setShowCharacter] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<GamePOI | null>(null);
  const [showCombat, setShowCombat] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [combatMonster, setCombatMonster] = useState<any>(null);
  const [shopData, setShopData] = useState<any>(null);

  const { data: character, isLoading: characterLoading, refetch: refetchCharacter } = trpc.character.get.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const seedMutation = trpc.gameData.seed.useMutation();
  const utils = trpc.useUtils();

  // Handle POI interaction
  const handlePOIClick = useCallback((poi: GamePOI) => {
    setSelectedPOI(poi);

    if (poi.type === "monster") {
      // Generate monster data based on POI
      const seed = poi.data?.seed || Math.floor(poi.latitude * 10000 + poi.longitude * 100000);
      const rng = seededRandom(seed);
      const level = Math.max(1, Math.floor(rng() * 5) + 1);
      const tierRoll = rng();
      let tier = "common";
      if (tierRoll > 0.9) tier = "legendary";
      else if (tierRoll > 0.75) tier = "rare";
      else if (tierRoll > 0.5) tier = "uncommon";
      
      const baseHealth = 20 + level * 10;
      const baseDamage = 3 + level * 2;
      const baseArmor = 8 + level;
      
      const monster = {
        id: seed,
        name: poi.name,
        description: `Um ${poi.name} selvagem apareceu!`,
        monsterType: poi.name.toLowerCase(),
        tier,
        health: Math.floor(baseHealth * (tier === "legendary" ? 2 : tier === "rare" ? 1.5 : tier === "uncommon" ? 1.2 : 1)),
        damage: Math.floor(baseDamage * (tier === "legendary" ? 1.8 : tier === "rare" ? 1.4 : tier === "uncommon" ? 1.1 : 1)),
        armor: Math.floor(baseArmor * (tier === "legendary" ? 1.5 : tier === "rare" ? 1.3 : tier === "uncommon" ? 1.1 : 1)),
        level,
      };
      
      setCombatMonster(monster);
      setShowCombat(true);
      setSelectedPOI(null);
    } else if (poi.type === "shop") {
      setShopData({
        npcId: Math.abs(Math.floor(poi.latitude * 1000 + poi.longitude * 10000)) % 10000,
        npcName: poi.name,
        npcType: "merchant",
      });
      setShowShop(true);
      setSelectedPOI(null);
    } else if (poi.type === "treasure") {
      const goldFound = Math.floor(Math.random() * 50) + 10;
      const xpFound = Math.floor(Math.random() * 30) + 5;
      toast.success(`Tesouro encontrado! +${goldFound} ouro, +${xpFound} XP`);
      setSelectedPOI(null);
    }
  }, []);

  // Handle seed game data (admin only)
  const handleSeedData = async () => {
    try {
      await seedMutation.mutateAsync();
      toast.success("Dados do jogo inicializados!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao inicializar dados");
    }
  };

  // Handle combat victory
  const handleCombatVictory = () => {
    setShowCombat(false);
    setCombatMonster(null);
    utils.character.get.invalidate();
  };

  // Handle combat defeat
  const handleCombatDefeat = () => {
    setShowCombat(false);
    setCombatMonster(null);
    toast.error("Você foi derrotado! Descanse para recuperar sua saúde.");
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
          <img src="/sprites/classes/warrior.png" alt="Hero" className="w-32 h-32 mx-auto mb-4 pixelated" />
          <h1 className="text-4xl font-bold text-primary mb-4 pixel-text">D&D GO</h1>
          <p className="text-muted-foreground mb-8">
            Explore o mundo real transformado em um cenário de D&D! 
            Mova-se por um grid sobre o mapa mundial e encontre monstros, lojas e tesouros.
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
      {/* Pixel World Map - Full screen */}
      <PixelWorldMap
        className="absolute inset-0"
        onPOIClick={handlePOIClick}
        characterClass={character.characterClass}
      />

      {/* Player HUD - Top left */}
      <div className="absolute top-4 left-4 z-20">
        <PlayerHUD
          className="w-64"
          onOpenInventory={() => setShowInventory(true)}
          onOpenQuests={() => toast.info("Sistema de missões em desenvolvimento!")}
          onOpenCharacter={() => setShowCharacter(true)}
        />
      </div>

      {/* Admin Controls - Top right */}
      {user?.role === "admin" && (
        <div className="absolute top-4 right-4 z-20">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedData}
            disabled={seedMutation.isPending}
            className="bg-black/80 border-primary/50"
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

      {showCombat && combatMonster && (
        <CombatScreen
          monster={combatMonster}
          latitude={0}
          longitude={0}
          onClose={() => {
            setShowCombat(false);
            setCombatMonster(null);
          }}
          onVictory={handleCombatVictory}
          onDefeat={handleCombatDefeat}
        />
      )}

      {showShop && shopData && (
        <ShopScreen
          npcId={shopData.npcId}
          npcName={shopData.npcName}
          npcType={shopData.npcType}
          onClose={() => {
            setShowShop(false);
            setShopData(null);
          }}
        />
      )}

      {/* POI Interaction Modal */}
      {selectedPOI && !showCombat && !showShop && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm fantasy-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {selectedPOI.type === "monster" && <Swords className="w-5 h-5 text-red-500" />}
                  {selectedPOI.type === "shop" && <ShoppingBag className="w-5 h-5 text-yellow-500" />}
                  {selectedPOI.type === "npc" && <Users className="w-5 h-5 text-blue-500" />}
                  {selectedPOI.type === "treasure" && <Gem className="w-5 h-5 text-purple-500" />}
                  {selectedPOI.type === "dungeon" && <Compass className="w-5 h-5 text-gray-500" />}
                  {selectedPOI.name}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setSelectedPOI(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {selectedPOI.type === "npc" && "Um viajante que pode ter informações úteis."}
                {selectedPOI.type === "dungeon" && "Uma área perigosa cheia de monstros e tesouros."}
                {selectedPOI.type === "quest" && "Uma nova missão está disponível!"}
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (selectedPOI.type === "npc") {
                      toast.info("O NPC acena para você em silêncio...");
                    } else if (selectedPOI.type === "dungeon") {
                      toast.info("Dungeons em desenvolvimento!");
                    } else if (selectedPOI.type === "quest") {
                      toast.info("Sistema de missões em desenvolvimento!");
                    }
                    setSelectedPOI(null);
                  }}
                >
                  Interagir
                </Button>
                <Button variant="outline" onClick={() => setSelectedPOI(null)}>
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
