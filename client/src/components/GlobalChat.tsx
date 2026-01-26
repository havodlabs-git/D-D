import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MessageSquare, Send, X, Minimize2, Maximize2 } from "lucide-react";
import { toast } from "sonner";

// Class colors for chat
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

interface ChatMessage {
  id: number;
  userId: number;
  characterId: number | null;
  message: string;
  messageType: string;
  characterName: string | null;
  characterClass: string | null;
  characterLevel: number | null;
  createdAt: Date;
}

interface GlobalChatProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export function GlobalChat({ isOpen: controlledIsOpen, onToggle }: GlobalChatProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [lastMessageId, setLastMessageId] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const handleToggle = onToggle || (() => setInternalIsOpen(!internalIsOpen));

  // Fetch initial messages
  const { data: messages, refetch } = trpc.chat.getMessages.useQuery(
    { limit: 50 },
    { enabled: isOpen }
  );

  // Poll for new messages every 3 seconds
  const { data: newMessages } = trpc.chat.getNewMessages.useQuery(
    { sinceId: lastMessageId },
    { 
      enabled: isOpen && lastMessageId > 0,
      refetchInterval: 3000,
    }
  );

  // Send message mutation
  const sendMutation = trpc.chat.send.useMutation({
    onSuccess: () => {
      setMessage("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar mensagem");
    },
  });

  // Update last message ID when messages change
  useEffect(() => {
    if (messages && messages.length > 0) {
      const maxId = Math.max(...messages.map(m => m.id));
      if (maxId > lastMessageId) {
        setLastMessageId(maxId);
      }
    }
  }, [messages, lastMessageId]);

  // Merge new messages
  useEffect(() => {
    if (newMessages && newMessages.length > 0) {
      refetch();
      const maxId = Math.max(...newMessages.map(m => m.id));
      if (maxId > lastMessageId) {
        setLastMessageId(maxId);
      }
    }
  }, [newMessages, lastMessageId, refetch]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, newMessages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate({ message: message.trim() });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  if (!isOpen) {
    return (
      <Button
        onClick={handleToggle}
        className="fixed bottom-4 right-4 z-50 rounded-full w-14 h-14 shadow-lg bg-primary hover:bg-primary/90"
      >
        <MessageSquare className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Card className={cn(
      "fixed z-50 shadow-2xl transition-all duration-200",
      isMinimized 
        ? "bottom-4 right-4 w-64 h-12" 
        : "bottom-4 right-4 w-80 sm:w-96 h-[500px] max-h-[70vh]"
    )}>
      <CardHeader className="p-3 border-b flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Chat Global
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleToggle}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-0 flex flex-col h-[calc(100%-52px)]">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-3" ref={scrollRef}>
            <div className="space-y-2">
              {messages?.map((msg) => (
                <div key={msg.id} className="text-sm">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-muted-foreground text-xs">
                      [{formatTime(msg.createdAt)}]
                    </span>
                    {msg.characterClass && (
                      <span className="text-xs">
                        {CLASS_ICONS[msg.characterClass] || "👤"}
                      </span>
                    )}
                    <span className={cn(
                      "font-semibold",
                      msg.characterClass ? CLASS_COLORS[msg.characterClass] : "text-foreground"
                    )}>
                      {msg.characterName || "Anônimo"}
                    </span>
                    {msg.characterLevel && (
                      <span className="text-xs text-muted-foreground">
                        Lv.{msg.characterLevel}
                      </span>
                    )}
                    <span className="text-muted-foreground">:</span>
                  </div>
                  <p className="text-foreground pl-4 break-words">{msg.message}</p>
                </div>
              ))}
              
              {(!messages || messages.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma mensagem ainda.</p>
                  <p className="text-xs">Seja o primeiro a falar!</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                maxLength={500}
                disabled={sendMutation.isPending}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || sendMutation.isPending}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {message.length}/500
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default GlobalChat;
