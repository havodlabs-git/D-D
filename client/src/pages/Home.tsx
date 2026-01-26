import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { 
  LogIn, 
  ChevronRight
} from "lucide-react";

// Class sprites for display - All 12 D&D 5e classes with unique sprites
const CLASS_SPRITES: Record<string, string> = {
  warrior: "/sprites/classes/warrior.png",
  fighter: "/sprites/classes/warrior.png",
  mage: "/sprites/classes/mage.png",
  wizard: "/sprites/classes/mage.png",
  rogue: "/sprites/classes/rogue.png",
  cleric: "/sprites/classes/cleric.png",
  ranger: "/sprites/classes/ranger.png",
  paladin: "/sprites/classes/paladin.png",
  barbarian: "/sprites/classes/barbarian.png",
  bard: "/sprites/classes/bard.png",
  druid: "/sprites/classes/druid.png",
  monk: "/sprites/classes/monk.png",
  sorcerer: "/sprites/classes/sorcerer.png",
  warlock: "/sprites/classes/warlock.png",
};

const CLASSES = [
  { id: "warrior", name: "Guerreiro", color: "bg-red-500/20" },
  { id: "mage", name: "Mago", color: "bg-blue-500/20" },
  { id: "rogue", name: "Ladino", color: "bg-gray-500/20" },
  { id: "cleric", name: "Clérigo", color: "bg-yellow-500/20" },
  { id: "ranger", name: "Patrulheiro", color: "bg-green-500/20" },
  { id: "paladin", name: "Paladino", color: "bg-amber-500/20" },
  { id: "barbarian", name: "Bárbaro", color: "bg-orange-500/20" },
  { id: "bard", name: "Bardo", color: "bg-purple-500/20" },
  { id: "druid", name: "Druida", color: "bg-emerald-500/20" },
  { id: "monk", name: "Monge", color: "bg-amber-600/20" },
  { id: "sorcerer", name: "Feiticeiro", color: "bg-violet-500/20" },
  { id: "warlock", name: "Bruxo", color: "bg-indigo-500/20" },
];

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <img src="/sprites/ui/d20.png" alt="Loading" className="w-20 h-20 animate-spin pixelated" />
      </div>
    );
  }

  // If authenticated, redirect to game
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="fantasy-card max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <img src="/sprites/classes/warrior.png" alt="Hero" className="w-24 h-24 mx-auto mb-4 pixelated animate-bounce" />
            <h2 className="text-2xl font-bold mb-2 pixel-text">Bem-vindo de volta!</h2>
            <p className="text-muted-foreground mb-6">
              Sua aventura aguarda, {user?.name || "Aventureiro"}!
            </p>
            <Button size="lg" className="w-full pixel-text" onClick={() => setLocation("/game")}>
              <img src="/sprites/items/sword.png" alt="Sword" className="w-6 h-6 mr-2 pixelated" />
              Continuar Aventura
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        
        {/* Floating pixel art decorations */}
        <div className="absolute top-20 left-10 animate-bounce" style={{ animationDelay: "0s" }}>
          <img src="/sprites/monsters/goblin.png" alt="" className="w-16 h-16 pixelated opacity-30" />
        </div>
        <div className="absolute top-40 right-20 animate-bounce" style={{ animationDelay: "0.5s" }}>
          <img src="/sprites/monsters/dragon.png" alt="" className="w-20 h-20 pixelated opacity-30" />
        </div>
        <div className="absolute bottom-40 left-20 animate-bounce" style={{ animationDelay: "1s" }}>
          <img src="/sprites/items/gold.png" alt="" className="w-12 h-12 pixelated opacity-30" />
        </div>
        <div className="absolute bottom-20 right-10 animate-bounce" style={{ animationDelay: "1.5s" }}>
          <img src="/sprites/monsters/skeleton.png" alt="" className="w-16 h-16 pixelated opacity-30" />
        </div>
        
        <div className="container relative z-10 text-center py-20">
          {/* Logo with pixel art */}
          <div className="mb-8">
            <div className="flex justify-center items-center gap-4 mb-6">
              <img src="/sprites/monsters/dragon.png" alt="Dragon" className="w-24 h-24 md:w-32 md:h-32 pixelated animate-pulse" />
            </div>
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight pixel-text">
              <span className="gold-text">D&D</span>{" "}
              <span className="text-primary">GO</span>
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Transforme o mundo real em um cenário de{" "}
            <span className="text-primary font-semibold">Dungeons & Dragons</span>.
            Explore, lute e conquiste onde quer que você esteja!
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg h-14 px-8 pixel-text" asChild>
              <a href={getLoginUrl()}>
                <LogIn className="w-5 h-5 mr-2" />
                Começar Aventura
              </a>
            </Button>
            <Button size="lg" variant="outline" className="text-lg h-14 px-8 pixel-text" asChild>
              <a href="#features">
                Saiba Mais
                <ChevronRight className="w-5 h-5 ml-2" />
              </a>
            </Button>
          </div>

          {/* Stats with pixel art */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-16">
            <div className="flex flex-col items-center">
              <img src="/sprites/classes/warrior.png" alt="Classes" className="w-12 h-12 pixelated mb-2" />
              <div className="text-3xl font-bold text-primary pixel-text">8</div>
              <div className="text-sm text-muted-foreground">Classes</div>
            </div>
            <div className="flex flex-col items-center">
              <img src="/sprites/ui/marker-treasure.png" alt="Locations" className="w-12 h-12 pixelated mb-2" />
              <div className="text-3xl font-bold text-primary pixel-text">∞</div>
              <div className="text-sm text-muted-foreground">Locais</div>
            </div>
            <div className="flex flex-col items-center">
              <img src="/sprites/ui/d20.png" alt="D20" className="w-12 h-12 pixelated mb-2" />
              <div className="text-3xl font-bold text-primary pixel-text">d20</div>
              <div className="text-sm text-muted-foreground">Sistema</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-card/50">
        <div className="container">
          <h2 className="text-4xl font-bold text-center mb-4 pixel-text">
            Como Funciona
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Uma experiência de RPG única que combina o mundo real com mecânicas clássicas de D&D
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <Card className="fantasy-card hover:scale-105 transition-transform">
              <CardContent className="pt-6">
                <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                  <img src="/sprites/ui/marker-treasure.png" alt="Map" className="w-12 h-12 pixelated" />
                </div>
                <h3 className="text-xl font-semibold mb-2 pixel-text">Mapa Interativo</h3>
                <p className="text-muted-foreground">
                  Use sua localização real para explorar. Clique no mapa para mover seu personagem 
                  sem precisar sair do lugar.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="fantasy-card hover:scale-105 transition-transform">
              <CardContent className="pt-6">
                <div className="w-16 h-16 rounded-lg bg-destructive/20 flex items-center justify-center mb-4">
                  <img src="/sprites/items/sword.png" alt="Combat" className="w-12 h-12 pixelated" />
                </div>
                <h3 className="text-xl font-semibold mb-2 pixel-text">Combate por Turnos</h3>
                <p className="text-muted-foreground">
                  Sistema de combate baseado em D&D com dados virtuais (d20), 
                  críticos, esquivas e muito mais.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="fantasy-card hover:scale-105 transition-transform">
              <CardContent className="pt-6">
                <div className="w-16 h-16 rounded-lg bg-accent/20 flex items-center justify-center mb-4">
                  <img src="/sprites/npcs/merchant.png" alt="NPCs" className="w-12 h-12 pixelated" />
                </div>
                <h3 className="text-xl font-semibold mb-2 pixel-text">NPCs Dinâmicos</h3>
                <p className="text-muted-foreground">
                  Encontre mercadores, ferreiros, alquimistas e aventureiros 
                  espalhados pelo mundo.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="fantasy-card hover:scale-105 transition-transform">
              <CardContent className="pt-6">
                <div className="w-16 h-16 rounded-lg bg-yellow-500/20 flex items-center justify-center mb-4">
                  <img src="/sprites/items/gold.png" alt="Shop" className="w-12 h-12 pixelated" />
                </div>
                <h3 className="text-xl font-semibold mb-2 pixel-text">Lojas e Comércio</h3>
                <p className="text-muted-foreground">
                  Compre armas, armaduras, poções e itens mágicos. 
                  Cada loja tem seu próprio inventário.
                </p>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card className="fantasy-card hover:scale-105 transition-transform">
              <CardContent className="pt-6">
                <div className="w-16 h-16 rounded-lg bg-secondary/20 flex items-center justify-center mb-4">
                  <img src="/sprites/classes/mage.png" alt="Classes" className="w-12 h-12 pixelated" />
                </div>
                <h3 className="text-xl font-semibold mb-2 pixel-text">8 Classes Jogáveis</h3>
                <p className="text-muted-foreground">
                  Guerreiro, Mago, Ladino, Clérigo, Patrulheiro, Paladino, 
                  Bárbaro ou Bardo. Escolha seu caminho!
                </p>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card className="fantasy-card hover:scale-105 transition-transform">
              <CardContent className="pt-6">
                <div className="w-16 h-16 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                  <img src="/sprites/items/armor.png" alt="Items" className="w-12 h-12 pixelated" />
                </div>
                <h3 className="text-xl font-semibold mb-2 pixel-text">Itens com Raridade</h3>
                <p className="text-muted-foreground">
                  De comum a lendário, encontre equipamentos com diferentes 
                  níveis de poder e bônus únicos.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Classes Preview with Pixel Art */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-4xl font-bold text-center mb-12 pixel-text">
            Escolha sua Classe
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CLASSES.map((cls) => (
              <div
                key={cls.id}
                className={`${cls.color} rounded-lg p-6 text-center transition-all hover:scale-110 cursor-pointer border-2 border-transparent hover:border-primary`}
              >
                <img 
                  src={CLASS_SPRITES[cls.id]} 
                  alt={cls.name}
                  className="w-20 h-20 mx-auto mb-3 pixelated"
                />
                <span className="font-semibold pixel-text">{cls.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Monsters Preview */}
      <section className="py-20 bg-card/50">
        <div className="container">
          <h2 className="text-4xl font-bold text-center mb-4 pixel-text">
            Enfrente Monstros
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Criaturas perigosas aguardam em cada canto do mundo
          </p>

          <div className="flex justify-center items-center gap-8 flex-wrap">
            <div className="text-center">
              <img src="/sprites/monsters/goblin.png" alt="Goblin" className="w-24 h-24 pixelated mx-auto mb-2 hover:scale-110 transition-transform" />
              <span className="text-sm text-muted-foreground">Goblin</span>
            </div>
            <div className="text-center">
              <img src="/sprites/monsters/orc.png" alt="Orc" className="w-24 h-24 pixelated mx-auto mb-2 hover:scale-110 transition-transform" />
              <span className="text-sm text-muted-foreground">Orc</span>
            </div>
            <div className="text-center">
              <img src="/sprites/monsters/skeleton.png" alt="Skeleton" className="w-24 h-24 pixelated mx-auto mb-2 hover:scale-110 transition-transform" />
              <span className="text-sm text-muted-foreground">Esqueleto</span>
            </div>
            <div className="text-center">
              <img src="/sprites/monsters/wolf.png" alt="Wolf" className="w-24 h-24 pixelated mx-auto mb-2 hover:scale-110 transition-transform" />
              <span className="text-sm text-muted-foreground">Lobo</span>
            </div>
            <div className="text-center">
              <img src="/sprites/monsters/dragon.png" alt="Dragon" className="w-28 h-28 pixelated mx-auto mb-2 hover:scale-110 transition-transform" />
              <span className="text-sm text-primary font-semibold">Dragão</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-t from-primary/10 to-transparent">
        <div className="container text-center">
          <img src="/sprites/ui/d20.png" alt="D20" className="w-20 h-20 mx-auto mb-6 pixelated animate-bounce" />
          <h2 className="text-4xl font-bold mb-4 pixel-text">
            Pronto para a Aventura?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Crie seu personagem, explore o mundo e torne-se uma lenda!
          </p>
          <Button size="lg" className="text-lg h-14 px-8 pixel-text" asChild>
            <a href={getLoginUrl()}>
              <LogIn className="w-5 h-5 mr-2" />
              Jogar Agora
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container text-center text-sm text-muted-foreground">
          <div className="flex justify-center items-center gap-4 mb-4">
            <img src="/sprites/classes/warrior.png" alt="" className="w-8 h-8 pixelated opacity-50" />
            <img src="/sprites/classes/mage.png" alt="" className="w-8 h-8 pixelated opacity-50" />
            <img src="/sprites/classes/rogue.png" alt="" className="w-8 h-8 pixelated opacity-50" />
            <img src="/sprites/classes/cleric.png" alt="" className="w-8 h-8 pixelated opacity-50" />
          </div>
          <p className="pixel-text">D&D GO - Um jogo de RPG baseado em localização</p>
          <p className="mt-1">Inspirado em Dungeons & Dragons e Pokémon GO</p>
        </div>
      </footer>
    </div>
  );
}
