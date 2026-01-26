import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { TileMap, POI as TilePOI, TileType, TILE_TYPES } from "@/components/TileMap";
import { PlayerHUD } from "@/components/PlayerHUD";
import { CharacterCreation } from "@/components/CharacterCreation";
import { InventoryScreen } from "@/components/InventoryScreen";
import { CharacterSheet } from "@/components/CharacterSheet";
import { CombatScreen } from "@/components/CombatScreen";
import { ShopScreen } from "@/components/ShopScreen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogIn, Database, Map, Compass, X, Swords, ShoppingBag, Users, Gem } from "lucide-react";
import { toast } from "sonner";

interface GamePOI {
  id: string;
  type: "monster" | "npc" | "shop" | "treasure" | "dungeon" | "quest";
  name: string;
  x: number;
  y: number;
  data?: any;
}

// Seeded random for POI generation
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Generate POIs around player position
function generatePOIs(playerX: number, playerY: number, seed: number): GamePOI[] {
  const pois: GamePOI[] = [];
  const radius = 6;
  
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      if (dx === 0 && dy === 0) continue;
      
      const x = playerX + dx;
      const y = playerY + dy;
      const tileSeed = seed + x * 1000 + y;
      const rng = seededRandom(tileSeed);
      
      // 15% chance of POI
      if (rng() < 0.15) {
        const typeRoll = rng();
        let type: GamePOI["type"];
        let name: string;
        
        if (typeRoll < 0.35) {
          type = "monster";
          const monsters = ["Goblin", "Orc", "Esqueleto", "Lobo", "Slime", "Bandido"];
          name = monsters[Math.floor(rng() * monsters.length)];
        } else if (typeRoll < 0.55) {
          type = "shop";
          const shops = ["Ferreiro", "Alquimista", "Mercador", "Armeiro"];
          name = shops[Math.floor(rng() * shops.length)];
        } else if (typeRoll < 0.70) {
          type = "npc";
          const npcs = ["Viajante", "Guarda", "Aldeão", "Sábio", "Aventureiro"];
          name = npcs[Math.floor(rng() * npcs.length)];
        } else if (typeRoll < 0.85) {
          type = "treasure";
          name = "Baú do Tesouro";
        } else if (typeRoll < 0.95) {
          type = "dungeon";
          const dungeons = ["Caverna Escura", "Ruínas Antigas", "Torre Abandonada"];
          name = dungeons[Math.floor(rng() * dungeons.length)];
        } else {
          type = "quest";
          name = "Missão Disponível";
        }
        
        pois.push({
          id: `poi-${x}-${y}`,
          type,
          name,
          x,
          y,
          data: { seed: tileSeed },
        });
      }
    }
  }
  
  return pois;
}

export default function Game() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [showInventory, setShowInventory] = useState(false);
  const [showCharacter, setShowCharacter] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0 });
  const [pois, setPOIs] = useState<GamePOI[]>([]);
  const [selectedPOI, setSelectedPOI] = useState<GamePOI | null>(null);
  const [showCombat, setShowCombat] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [combatMonster, setCombatMonster] = useState<any>(null);
  const [shopData, setShopData] = useState<any>(null);
  const [mapSeed] = useState(() => Math.floor(Math.random() * 100000));

  const { data: character, isLoading: characterLoading, refetch: refetchCharacter } = trpc.character.get.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const seedMutation = trpc.gameData.seed.useMutation();
  const utils = trpc.useUtils();

  // Generate POIs when player moves
  useEffect(() => {
    const newPOIs = generatePOIs(playerPosition.x, playerPosition.y, mapSeed);
    setPOIs(newPOIs);
  }, [playerPosition, mapSeed]);

  // Handle player movement
  const handlePlayerMove = useCallback((x: number, y: number) => {
    setPlayerPosition({ x, y });
  }, []);

  // Handle POI interaction
  const handlePOIClick = useCallback(async (poi: TilePOI) => {
    const gamePOI = pois.find(p => p.x === poi.x && p.y === poi.y);
    if (!gamePOI) return;

    setSelectedPOI(gamePOI);

    if (gamePOI.type === "monster") {
      // Generate monster data locally based on POI
      const monsterSeed = gamePOI.data?.seed || Math.floor(Math.random() * 100000);
      const rng = seededRandom(monsterSeed);
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
        id: monsterSeed,
        name: gamePOI.name,
        description: `Um ${gamePOI.name} selvagem apareceu!`,
        monsterType: gamePOI.name.toLowerCase(),
        tier,
        health: Math.floor(baseHealth * (tier === "legendary" ? 2 : tier === "rare" ? 1.5 : tier === "uncommon" ? 1.2 : 1)),
        damage: Math.floor(baseDamage * (tier === "legendary" ? 1.8 : tier === "rare" ? 1.4 : tier === "uncommon" ? 1.1 : 1)),
        armor: Math.floor(baseArmor * (tier === "legendary" ? 1.5 : tier === "rare" ? 1.3 : tier === "uncommon" ? 1.1 : 1)),
        level,
      };
      
      setCombatMonster(monster);
      setShowCombat(true);
      setSelectedPOI(null);
    } else if (gamePOI.type === "shop") {
      // Open shop with generated NPC data
      setShopData({
        npcId: Math.abs(gamePOI.x * 1000 + gamePOI.y) % 10000,
        npcName: gamePOI.name,
        npcType: "merchant",
      });
      setShowShop(true);
      setSelectedPOI(null);
    } else if (gamePOI.type === "treasure") {
      // Simple treasure collection
      const goldFound = Math.floor(Math.random() * 50) + 10;
      const xpFound = Math.floor(Math.random() * 30) + 5;
      toast.success(`Tesouro encontrado! +${goldFound} ouro, +${xpFound} XP`);
      // Remove POI from list
      setPOIs(prev => prev.filter(p => p.id !== gamePOI.id));
      setSelectedPOI(null);
    }
  }, [pois, utils]);

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
  const handleCombatVictory = (rewards: { experience: number; gold: number; leveledUp?: boolean; newLevel?: number }) => {
    setShowCombat(false);
    setCombatMonster(null);
    if (selectedPOI) {
      setPOIs(prev => prev.filter(p => p.id !== selectedPOI.id));
    }
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
            Explore um mundo pixel art de fantasia! Mova-se por tiles, encontre monstros, 
            lojas e tesouros em cada quadradinho do mapa.
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
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center gap-4">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between">
        <h1 className="text-2xl font-bold pixel-text text-primary flex items-center gap-2">
          <Map className="w-6 h-6" />
          D&D GO
        </h1>
        
        {/* Admin Controls */}
        {user?.role === "admin" && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedData}
            disabled={seedMutation.isPending}
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
        )}
      </div>

      {/* Main Game Area */}
      <div className="flex flex-col lg:flex-row gap-4 w-full max-w-6xl">
        {/* Player HUD - Left side on desktop, top on mobile */}
        <div className="lg:w-72 order-2 lg:order-1">
          <PlayerHUD
            className="w-full"
            onOpenInventory={() => setShowInventory(true)}
            onOpenQuests={() => {
              toast.info("Sistema de missões em desenvolvimento!");
            }}
            onOpenCharacter={() => setShowCharacter(true)}
          />
        </div>

        {/* Tile Map - Center */}
        <div className="flex-1 order-1 lg:order-2 flex justify-center">
          <TileMap
            width={15}
            height={11}
            tileSize={40}
            playerPosition={playerPosition}
            onPlayerMove={handlePlayerMove}
            onPOIClick={handlePOIClick}
            pois={pois.map(p => ({
              x: p.x,
              y: p.y,
              type: p.type,
              id: p.id,
              name: p.name,
            }))}
            seed={mapSeed}
            characterClass={character.characterClass}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="w-full max-w-4xl">
        <Card className="bg-card/80 backdrop-blur">
          <CardContent className="py-3">
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <div className="flex items-center gap-1">
                <span className="text-lg">👹</span>
                <span className="text-muted-foreground">Monstro</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg">🏪</span>
                <span className="text-muted-foreground">Loja</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg">👤</span>
                <span className="text-muted-foreground">NPC</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg">💎</span>
                <span className="text-muted-foreground">Tesouro</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg">🏰</span>
                <span className="text-muted-foreground">Dungeon</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg">❗</span>
                <span className="text-muted-foreground">Missão</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
          latitude={playerPosition.y * 0.0001}
          longitude={playerPosition.x * 0.0001}
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
