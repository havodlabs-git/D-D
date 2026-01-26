import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { 
  LogIn, 
  Map, 
  Swords, 
  Users, 
  ShoppingBag, 
  Scroll, 
  Sparkles,
  ChevronRight,
  Loader2
} from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  // If authenticated, redirect to game
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="fantasy-card max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="text-6xl mb-4">🧙</div>
            <h2 className="text-2xl font-bold mb-2">Bem-vindo de volta!</h2>
            <p className="text-muted-foreground mb-6">
              Sua aventura aguarda, {user?.name || "Aventureiro"}!
            </p>
            <Button size="lg" className="w-full" onClick={() => setLocation("/game")}>
              <Swords className="w-5 h-5 mr-2" />
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
        
        <div className="container relative z-10 text-center py-20">
          {/* Logo */}
          <div className="mb-8">
            <span className="text-9xl block mb-4">🐉</span>
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight">
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
            <Button size="lg" className="text-lg h-14 px-8" asChild>
              <a href={getLoginUrl()}>
                <LogIn className="w-5 h-5 mr-2" />
                Começar Aventura
              </a>
            </Button>
            <Button size="lg" variant="outline" className="text-lg h-14 px-8" asChild>
              <a href="#features">
                Saiba Mais
                <ChevronRight className="w-5 h-5 ml-2" />
              </a>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-16">
            <div>
              <div className="text-3xl font-bold text-primary">8</div>
              <div className="text-sm text-muted-foreground">Classes</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">∞</div>
              <div className="text-sm text-muted-foreground">Locais</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">d20</div>
              <div className="text-sm text-muted-foreground">Sistema</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-card/50">
        <div className="container">
          <h2 className="text-4xl font-bold text-center mb-4">
            Como Funciona
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Uma experiência de RPG única que combina o mundo real com mecânicas clássicas de D&D
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <Card className="fantasy-card">
              <CardContent className="pt-6">
                <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                  <Map className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Mapa Interativo</h3>
                <p className="text-muted-foreground">
                  Use sua localização real para explorar. Clique no mapa para mover seu personagem 
                  sem precisar sair do lugar.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="fantasy-card">
              <CardContent className="pt-6">
                <div className="w-14 h-14 rounded-lg bg-destructive/20 flex items-center justify-center mb-4">
                  <Swords className="w-7 h-7 text-destructive" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Combate por Turnos</h3>
                <p className="text-muted-foreground">
                  Sistema de combate baseado em D&D com dados virtuais (d20), 
                  críticos, esquivas e muito mais.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="fantasy-card">
              <CardContent className="pt-6">
                <div className="w-14 h-14 rounded-lg bg-accent/20 flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-2">NPCs Dinâmicos</h3>
                <p className="text-muted-foreground">
                  Encontre mercadores, ferreiros, alquimistas e aventureiros 
                  espalhados pelo mundo.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="fantasy-card">
              <CardContent className="pt-6">
                <div className="w-14 h-14 rounded-lg bg-yellow-500/20 flex items-center justify-center mb-4">
                  <ShoppingBag className="w-7 h-7 text-yellow-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Lojas e Comércio</h3>
                <p className="text-muted-foreground">
                  Compre armas, armaduras, poções e itens mágicos. 
                  Cada loja tem seu próprio inventário.
                </p>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card className="fantasy-card">
              <CardContent className="pt-6">
                <div className="w-14 h-14 rounded-lg bg-secondary/20 flex items-center justify-center mb-4">
                  <Scroll className="w-7 h-7 text-secondary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">8 Classes Jogáveis</h3>
                <p className="text-muted-foreground">
                  Guerreiro, Mago, Ladino, Clérigo, Patrulheiro, Paladino, 
                  Bárbaro ou Bardo. Escolha seu caminho!
                </p>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card className="fantasy-card">
              <CardContent className="pt-6">
                <div className="w-14 h-14 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Itens com Raridade</h3>
                <p className="text-muted-foreground">
                  De comum a lendário, encontre equipamentos com diferentes 
                  níveis de poder e bônus únicos.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Classes Preview */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-4xl font-bold text-center mb-12">
            Escolha sua Classe
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Guerreiro", icon: "⚔️", color: "bg-red-500/20" },
              { name: "Mago", icon: "🔮", color: "bg-blue-500/20" },
              { name: "Ladino", icon: "🗡️", color: "bg-gray-500/20" },
              { name: "Clérigo", icon: "✨", color: "bg-yellow-500/20" },
              { name: "Patrulheiro", icon: "🏹", color: "bg-green-500/20" },
              { name: "Paladino", icon: "🛡️", color: "bg-amber-500/20" },
              { name: "Bárbaro", icon: "🪓", color: "bg-orange-500/20" },
              { name: "Bardo", icon: "🎵", color: "bg-purple-500/20" },
            ].map((cls) => (
              <div
                key={cls.name}
                className={`${cls.color} rounded-lg p-6 text-center transition-transform hover:scale-105`}
              >
                <span className="text-4xl block mb-2">{cls.icon}</span>
                <span className="font-semibold">{cls.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-t from-primary/10 to-transparent">
        <div className="container text-center">
          <h2 className="text-4xl font-bold mb-4">
            Pronto para a Aventura?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Crie seu personagem, explore o mundo e torne-se uma lenda!
          </p>
          <Button size="lg" className="text-lg h-14 px-8" asChild>
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
          <p>D&D GO - Um jogo de RPG baseado em localização</p>
          <p className="mt-1">Inspirado em Dungeons & Dragons e Pokémon GO</p>
        </div>
      </footer>
    </div>
  );
}
