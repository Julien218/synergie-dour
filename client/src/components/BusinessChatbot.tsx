import { useState } from "react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SUGGESTIONS = [
  "Quelles démarches faut-il prévoir pour lancer une activité indépendante à Dour ?",
  "Où vérifier les aides officielles disponibles pour un commerce en Wallonie ?",
  "Qui contacter pour une autorisation communale à Dour ?",
];

export function BusinessChatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const ask = trpc.chatbot.ask.useMutation();

  const sendMessage = async (question: string) => {
    if (ask.isPending) return;
    const history = messages.map(({ role, content }) => ({ role: role as "user" | "assistant", content }));
    setMessages(previous => [...previous, { role: "user", content: question }]);
    setError(null);

    try {
      const response = await ask.mutateAsync({ question, history });
      setMessages(previous => [...previous, { role: "assistant", content: response.answer }]);
    } catch (cause) {
      console.error("[BusinessChatbot]", cause);
      setError("Impossible de joindre l’assistant pour le moment. Vérifiez votre connexion puis réessayez.");
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <AIChatBox
        messages={messages}
        onSendMessage={sendMessage}
        isLoading={ask.isPending}
        height={520}
        placeholder="Posez votre question sur les démarches, aides ou obligations…"
        emptyStateMessage="Posez une question à l’assistant des commerçants et indépendants de Dour. Les réponses importantes doivent toujours être confirmées auprès de la source officielle."
        suggestedPrompts={SUGGESTIONS}
      />
    </div>
  );
}
