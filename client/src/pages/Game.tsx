import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import PixelWorldMap from "@/components/PixelWorldMapMapbox";
import StreetView3D from "@/components/StreetView3D";
import { PlayerHUD } from "@/components/PlayerHUD";
import { CharacterCreation } from "@/components/CharacterCreation";
import { InventoryScreen } from "@/components/InventoryScreen";
import { CharacterSheet } from "@/components/CharacterSheet";
import { CombatScreen } from "@/components/CombatScreen";
import { CombatScreenPokemon } from "@/components/CombatScreenPokemon";
import { ShopScreen } from "@/components/ShopScreen";
import { DungeonScreen } from "@/components/DungeonScreen";
import { LevelUpScreen } from "@/components/LevelUpScreen";
import { DeathScreen } from "@/components/DeathScreen";
import { RandomEncounter } from "@/components/RandomEncounter";
import { GlobalChat } from "@/components/GlobalChat";
import { AudioManager } from "@/components/AudioManager";
import { OnlinePlayers } from "@/components/OnlinePlayers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogIn, Database, X, Swords, ShoppingBag, Users, Gem, Compass } from "lucide-react";
import { toast } from "sonner";

interface GamePOI {
  id: string;
  type: "monster" | "npc" | "shop" | "treasure" | "dungeon" | "quest" | "guild" | "castle" | "city" | "tavern" | "temple" | "blacksmith" | "magic_shop";
  name: string;
  latitude: number;
  longitude: number;
  biome?: string;
  data?: any;
  tier?: "common" | "elite" | "boss" | "legendary";
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
  const [showGuild, setShowGuild] = useState(false);
  const [showCastle, setShowCastle] = useState(false);
  const [combatMonster, setCombatMonster] = useState<any>(null);
  const [shopData, setShopData] = useState<any>(null);
  const [guildData, setGuildData] = useState<any>(null);
  const [castleData, setCastleData] = useState<any>(null);
  const [visitedPOIs, setVisitedPOIs] = useState<Set<string>>(new Set());
  const [showDungeon, setShowDungeon] = useState(false);
  const [dungeonData, setDungeonData] = useState<any>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [pendingLevelUp, setPendingLevelUp] = useState<number | null>(null);
  const [randomEncounter, setRandomEncounter] = useState<any>(null);
  const [audioState, setAudioState] = useState<"exploring" | "combat" | "tavern" | "victory" | "defeat">("exploring");
  const [usePokemonCombat, setUsePokemonCombat] = useState(true); // Use Pokemon-style combat by default
  const [viewMode, setViewMode] = useState<"map" | "streetview">("map");
  const [playerHeading, setPlayerHeading] = useState(0);
  const [playerPosition, setPlayerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [currentPOIs, setCurrentPOIs] = useState<GamePOI[]>([]);

  const { data: character, isLoading: characterLoading, refetch: refetchCharacter } = trpc.character.get.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Fetch online players for the map
  const { data: onlinePlayers } = trpc.multiplayer.getNearbyPlayers.useQuery(
    { latitude: undefined, longitude: undefined },
    { 
      enabled: isAuthenticated && !!character,
      refetchInterval: 10000, // Refresh every 10 seconds
    }
  );

  const seedMutation = trpc.gameData.seed.useMutation();
  const utils = trpc.useUtils();

  // Handle Street View movement - must be before conditional returns
  const handleStreetViewMove = useCallback((direction: "forward" | "backward" | "left" | "right") => {
    if (!playerPosition) return;
    
    const MOVE_DISTANCE = 0.0001; // ~10 meters
    let newLat = playerPosition.lat;
    let newLng = playerPosition.lng;
    let newHeading = playerHeading;
    
    const headingRad = playerHeading * Math.PI / 180;
    
    switch (direction) {
      case "forward":
        newLat += MOVE_DISTANCE * Math.cos(headingRad);
        newLng += MOVE_DISTANCE * Math.sin(headingRad);
        break;
      case "backward":
        newLat -= MOVE_DISTANCE * Math.cos(headingRad);
        newLng -= MOVE_DISTANCE * Math.sin(headingRad);
        break;
      case "left":
        newHeading = (playerHeading - 30 + 360) % 360;
        break;
      case "right":
        newHeading = (playerHeading + 30) % 360;
        break;
    }
    
    setPlayerPosition({ lat: newLat, lng: newLng });
    setPlayerHeading(newHeading);
  }, [playerPosition, playerHeading]);

  // Handle POI interaction
  const handlePOIClick = useCallback((poi: GamePOI) => {
    setSelectedPOI(poi);

    if (poi.type === "monster") {
      // Generate monster data based on POI and player level
      const seed = poi.data?.seed || Math.floor(poi.latitude * 10000 + poi.longitude * 100000);
      const rng = seededRandom(seed);
      
      // Monster level scales with player level (D&D 5e CR system)
      const playerLevel = character?.level || 1;
      const levelVariance = Math.floor(rng() * 3) - 1; // -1 to +1
      const monsterLevel = Math.max(1, Math.min(playerLevel + levelVariance, 20));
      
      // Tier based on level difference and random roll
      const tierRoll = rng();
      let tier = "common";
      if (playerLevel >= 10 && tierRoll > 0.95) tier = "legendary";
      else if (playerLevel >= 5 && tierRoll > 0.85) tier = "boss";
      else if (playerLevel >= 3 && tierRoll > 0.70) tier = "elite";
      
      // D&D 5e style stats - much easier at low levels
      // Base HP: 7 + (level * 4.5) for common monsters (like goblins have ~7 HP at CR 1/4)
      const baseHealth = Math.floor(7 + monsterLevel * 4.5);
      // Base damage: 1d6 + level/2 (average 4-5 at level 1)
      const baseDamage = Math.floor(3 + Math.floor(monsterLevel / 2));
      // Base AC: 10 + level/3 (around 10-12 for low level monsters)
      const baseArmor = Math.floor(10 + Math.floor(monsterLevel / 3));
      
      // Tier multipliers (D&D 5e style)
      const tierMultipliers = {
        common: { hp: 1.0, dmg: 1.0, ac: 1.0 },
        elite: { hp: 1.5, dmg: 1.2, ac: 1.1 },
        boss: { hp: 2.5, dmg: 1.5, ac: 1.2 },
        legendary: { hp: 4.0, dmg: 2.0, ac: 1.3 },
      };
      const mult = tierMultipliers[tier as keyof typeof tierMultipliers] || tierMultipliers.common;
      
      const monster = {
        id: seed,
        name: poi.name,
        description: `Um ${poi.name} selvagem apareceu! (Nível ${monsterLevel})`,
        monsterType: poi.name.toLowerCase(),
        tier,
        health: Math.floor(baseHealth * mult.hp),
        damage: Math.floor(baseDamage * mult.dmg),
        armor: Math.floor(baseArmor * mult.ac),
        level: monsterLevel,
      };
      
      setCombatMonster(monster);
      setShowCombat(true);
      setAudioState("combat");
      setSelectedPOI(null);
    } else if (poi.type === "shop") {
      // Generate a consistent NPC ID based on location
      const npcSeed = Math.abs(Math.floor(poi.latitude * 10000 + poi.longitude * 100000));
      const npcTypes = ["merchant", "blacksmith", "alchemist"];
      const npcType = npcTypes[npcSeed % npcTypes.length];
      
      setShopData({
        npcId: npcSeed,
        npcName: poi.name,
        npcType: npcType,
      });
      setShowShop(true);
      setSelectedPOI(null);
    } else if (poi.type === "treasure") {
      const goldFound = Math.floor(Math.random() * 50) + 10;
      const xpFound = Math.floor(Math.random() * 30) + 5;
      toast.success(`Tesouro encontrado! +${goldFound} ouro, +${xpFound} XP`);
      // Mark treasure as visited (collected)
      setVisitedPOIs(prev => {
        const newSet = new Set(prev);
        newSet.add(poi.id);
        return newSet;
      });
      setSelectedPOI(null);
    } else if (poi.type === "guild") {
      setGuildData({
        id: Math.abs(Math.floor(poi.latitude * 1000 + poi.longitude * 10000)) % 10000,
        name: poi.name,
        type: poi.name.includes("Magos") ? "mages" : poi.name.includes("Guerreiros") ? "warriors" : poi.name.includes("Ladinos") ? "thieves" : "adventurers",
        description: `Uma guilda de ${poi.name.split(" ").pop()?.toLowerCase() || "aventureiros"} onde você pode se juntar e receber missões especiais.`,
        benefits: { discounts: 10, specialQuests: true },
        levelRequired: 1,
        goldRequired: 100,
      });
      setShowGuild(true);
      setSelectedPOI(null);
    } else if (poi.type === "castle") {
      setCastleData({
        id: Math.abs(Math.floor(poi.latitude * 1000 + poi.longitude * 10000)) % 10000,
        name: poi.name,
        type: poi.name.includes("Torre") ? "tower" : poi.name.includes("Fortaleza") ? "fortress" : poi.name.includes("Cidadela") ? "citadel" : "ruins",
        description: `${poi.name} - um local misterioso cheio de perigos e tesouros.`,
        hasDungeon: true,
        dungeonLevels: Math.floor(Math.random() * 5) + 1,
        isHostile: Math.random() > 0.3,
      });
      setShowCastle(true);
      setSelectedPOI(null);
    } else if (poi.type === "dungeon") {
      const seed = poi.data?.seed || Math.floor(poi.latitude * 10000 + poi.longitude * 100000);
      const rng = seededRandom(seed);
      const floors = Math.floor(rng() * 4) + 2; // 2-5 floors
      const diffRoll = rng();
      let difficulty: "easy" | "normal" | "hard" | "nightmare" = "normal";
      if (diffRoll > 0.9) difficulty = "nightmare";
      else if (diffRoll > 0.7) difficulty = "hard";
      else if (diffRoll > 0.4) difficulty = "normal";
      else difficulty = "easy";
      
      const dungeonTypes = ["cave", "crypt", "tower", "ruins", "temple", "mine", "sewer"];
      const dungeonType = dungeonTypes[Math.floor(rng() * dungeonTypes.length)];
      
      setDungeonData({
        name: poi.name,
        type: dungeonType,
        difficulty,
        totalFloors: floors,
      });
      setShowDungeon(true);
      setSelectedPOI(null);
    } else if (poi.type === "npc") {
      toast.info(`${poi.name} diz: "Olá, aventureiro! Boas viagens!"`);
      setSelectedPOI(null);
    } else if (poi.type === "quest") {
      toast.info(`Missão: ${poi.name} - Sistema de quests em desenvolvimento!`);
      setSelectedPOI(null);
    } else if (poi.type === "city") {
      toast.success(`Você chegou a ${poi.name}! Uma cidade cheia de oportunidades.`);
      setSelectedPOI(null);
    } else if (poi.type === "tavern") {
      toast.info(`Bem-vindo à ${poi.name}! Descanse e ouça rumores dos aventureiros.`);
      setSelectedPOI(null);
    } else if (poi.type === "temple") {
      toast.info(`${poi.name} - Um local sagrado. Você sente paz interior.`);
      setSelectedPOI(null);
    } else if (poi.type === "blacksmith") {
      setShopData({
        npcId: Math.abs(Math.floor(poi.latitude * 10000 + poi.longitude * 100000)),
        npcName: poi.name,
        npcType: "blacksmith",
      });
      setShowShop(true);
      setSelectedPOI(null);
    } else if (poi.type === "magic_shop") {
      setShopData({
        npcId: Math.abs(Math.floor(poi.latitude * 10000 + poi.longitude * 100000)),
        npcName: poi.name,
        npcType: "wizard_vendor",
      });
      setShowShop(true);
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

  // Handle combat victory - mark monster as defeated
  const handleCombatVictory = useCallback((rewards: { experience: number; gold: number; leveledUp?: boolean; newLevel?: number }) => {
    // Mark the monster POI as visited
    if (selectedPOI) {
      setVisitedPOIs(prev => {
        const newSet = new Set(prev);
        newSet.add(selectedPOI.id);
        return newSet;
      });
    }
    setShowCombat(false);
    setCombatMonster(null);
    setAudioState("exploring"); // Voltar para música ambiente
    utils.character.get.invalidate();
    
    // Check if player leveled up
    if (rewards.leveledUp && rewards.newLevel) {
      setPendingLevelUp(rewards.newLevel);
      setShowLevelUp(true);
    }
  }, [selectedPOI, utils.character.get]);

  // Handle combat defeat - PERMADEATH
  const killCharacterMutation = trpc.character.kill.useMutation({
    onSuccess: () => {
      refetchCharacter();
    },
  });

  const handleCombatDefeat = () => {
    setShowCombat(false);
    setCombatMonster(null);
    setAudioState("defeat"); // Música de derrota
    // Permadeath - character dies permanently
    const monsterName = combatMonster?.name || "um monstro";
    killCharacterMutation.mutate({ deathCause: `Morto por ${monsterName}` });
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
      {/* Main View - Street View or Map (hidden during combat) */}
      {showCombat ? null : viewMode === "streetview" && playerPosition ? (
        <StreetView3D
          className="absolute inset-0"
          playerPosition={playerPosition}
          playerHeading={playerHeading}
          characterClass={character.characterClass}
          pois={currentPOIs}
          onPOIClick={handlePOIClick}
          onMove={handleStreetViewMove}
        />
      ) : (
        <PixelWorldMap
          className="absolute inset-0"
          onPOIClick={handlePOIClick}
          onRandomEncounter={(encounter) => setRandomEncounter(encounter)}
          characterClass={character.characterClass}
          visitedPOIs={visitedPOIs}
          onlinePlayers={onlinePlayers || []}
          onPlayerMove={(lat, lng) => setPlayerPosition({ lat, lng })}
        />
      )}
      
      {/* Minimap - Top right corner (only in Street View mode) */}
      {viewMode === "streetview" && playerPosition && (
        <div className="absolute top-4 right-4 z-30 w-48 h-48 rounded-lg overflow-hidden border-2 border-primary/50 shadow-lg">
          <PixelWorldMap
            className="w-full h-full"
            onPOIClick={() => {}} // Disable click on minimap
            characterClass={character.characterClass}
            visitedPOIs={visitedPOIs}
            onlinePlayers={[]}
          />
          <div className="absolute inset-0 pointer-events-none border-4 border-black/20 rounded-lg" />
        </div>
      )}
      
      {/* View Mode Toggle (hidden during combat) */}
      {!showCombat && <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
        <Button
          onClick={() => setViewMode(viewMode === "map" ? "streetview" : "map")}
          className="bg-black/80 hover:bg-black/90 border border-primary/50 px-6"
        >
          <Compass className="w-4 h-4 mr-2" />
          {viewMode === "map" ? "Modo Street View" : "Modo Mapa"}
        </Button>
      </div>}

      {/* Player HUD - Top left (hidden during combat) */}
      {!showCombat && <div className="absolute top-4 left-4 z-20">
        <PlayerHUD
          className="w-64"
          onOpenInventory={() => setShowInventory(true)}
          onOpenQuests={() => toast.info("Sistema de missões em desenvolvimento!")}
          onOpenCharacter={() => setShowCharacter(true)}
        />
      </div>}

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
        usePokemonCombat ? (
          <CombatScreenPokemon
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
        ) : (
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
        )
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

      {/* Guild Modal */}
      {showGuild && guildData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md fantasy-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🏰</span>
                  {guildData.name}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowGuild(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{guildData.description}</p>
              <div className="bg-muted/50 rounded-lg p-3 mb-4">
                <h4 className="font-semibold text-sm mb-2">Benefícios:</h4>
                <ul className="text-sm space-y-1">
                  <li>• {guildData.benefits.discounts}% de desconto em lojas</li>
                  <li>• Acesso a missões especiais</li>
                  <li>• Treinamento de habilidades</li>
                </ul>
              </div>
              <div className="flex items-center justify-between text-sm mb-4">
                <span>Nível necessário: {guildData.levelRequired}</span>
                <span>Taxa de entrada: {guildData.goldRequired} ouro</span>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    toast.success(`Você se juntou à ${guildData.name}!`);
                    setShowGuild(false);
                    setGuildData(null);
                  }}
                >
                  Entrar na Guilda
                </Button>
                <Button variant="outline" onClick={() => setShowGuild(false)}>
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Castle Modal */}
      {showCastle && castleData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md fantasy-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🏰</span>
                  {castleData.name}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowCastle(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{castleData.description}</p>
              <div className="bg-muted/50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Tipo: {castleData.type}</span>
                  <span className={castleData.isHostile ? "text-red-500" : "text-green-500"}>
                    {castleData.isHostile ? "⚠️ Hostil" : "✅ Seguro"}
                  </span>
                </div>
                {castleData.hasDungeon && (
                  <div className="mt-2 text-sm">
                    <span>🗝️ Masmorra: {castleData.dungeonLevels} andares</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {castleData.hasDungeon && (
                  <Button
                    className="flex-1"
                    variant={castleData.isHostile ? "destructive" : "default"}
                    onClick={() => {
                      // Open dungeon from castle
                      setDungeonData({
                        name: `Masmorra de ${castleData.name}`,
                        type: "castle",
                        difficulty: castleData.isHostile ? "hard" : "normal",
                        totalFloors: castleData.dungeonLevels,
                      });
                      setShowCastle(false);
                      setCastleData(null);
                      setShowDungeon(true);
                    }}
                  >
                    Explorar Masmorra
                  </Button>
                )}
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => {
                    toast.info("Você observa o castelo de longe...");
                    setShowCastle(false);
                    setCastleData(null);
                  }}
                >
                  Observar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dungeon Screen */}
      {showDungeon && dungeonData && character && (
        <DungeonScreen
          dungeonName={dungeonData.name}
          dungeonType={dungeonData.type}
          difficulty={dungeonData.difficulty}
          totalFloors={dungeonData.totalFloors}
          character={{
            id: character.id,
            name: character.name,
            characterClass: character.characterClass,
            level: character.level,
            currentHealth: character.currentHealth,
            maxHealth: character.maxHealth,
            currentMana: character.currentMana,
            maxMana: character.maxMana,
            gold: character.gold,
            strength: character.strength,
            dexterity: character.dexterity,
            constitution: character.constitution,
            intelligence: character.intelligence,
            wisdom: character.wisdom,
            charisma: character.charisma,
          }}
          onClose={() => {
            setShowDungeon(false);
            setDungeonData(null);
          }}
          onComplete={(rewards) => {
            toast.success(`Dungeon conquistada! +${rewards.gold} ouro, +${rewards.experience} XP`);
            setShowDungeon(false);
            setDungeonData(null);
            refetchCharacter();
          }}
          onDefeat={() => {
            toast.error("Você foi derrotado na dungeon...");
            setShowDungeon(false);
            setDungeonData(null);
            refetchCharacter();
          }}
        />
      )}

      {/* Level Up Screen */}
      {showLevelUp && pendingLevelUp && character && (
        <LevelUpScreen
          character={{
            id: character.id,
            name: character.name,
            characterClass: character.characterClass,
            level: character.level,
            subclass: character.subclass || undefined,
            strength: character.strength,
            dexterity: character.dexterity,
            constitution: character.constitution,
            intelligence: character.intelligence,
            wisdom: character.wisdom,
            charisma: character.charisma,
            knownSpells: character.knownSpells ? JSON.parse(character.knownSpells) : [],
          }}
          newLevel={pendingLevelUp}
          onComplete={(choices) => {
            toast.success(`Você subiu para o nível ${pendingLevelUp}!`);
            // TODO: Apply choices via API
            setShowLevelUp(false);
            setPendingLevelUp(null);
            refetchCharacter();
          }}
          onClose={() => {
            setShowLevelUp(false);
            setPendingLevelUp(null);
          }}
        />
      )}

      {/* Death Screen (Permadeath) */}
      {character?.isDead && (
        <DeathScreen
          characterName={character.name}
          characterClass={character.characterClass}
          level={character.level}
          deathCause={character.deathCause || undefined}
          onCreateNew={() => {
            refetchCharacter();
          }}
        />
      )}

      {/* Random Encounter */}
      {randomEncounter && (
        <RandomEncounter
          encounter={randomEncounter}
          onBattle={(monster) => {
            setCombatMonster(monster);
            setShowCombat(true);
            setAudioState("combat");
            setRandomEncounter(null);
          }}
          onCollectTreasure={(treasure) => {
            toast.success(`Coletado: ${treasure.gold} ouro, +${treasure.xp} XP`);
            refetchCharacter();
            setRandomEncounter(null);
          }}
          onTrapDamage={(damage) => {
            toast.error(`Você sofreu ${damage} de dano!`);
            refetchCharacter();
          }}
          onClose={() => setRandomEncounter(null)}
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

      {/* Global Chat - Always visible when logged in */}
      {isAuthenticated && character && !character.isDead && (
        <GlobalChat />
      )}

      {/* Audio Manager - Medieval music */}
      {isAuthenticated && character && (
        <AudioManager gameState={audioState} />
      )}

      {/* Online Players - Multiplayer */}
      {isAuthenticated && character && !character.isDead && (
        <OnlinePlayers />
      )}
    </div>
  );
}
