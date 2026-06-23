"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import Lobby from "@/components/lobby/Lobby";
import Game from "@/components/game/Game";
import Results from "@/components/results/Results";
import History from "@/components/history/History";
import BotManager from "@/components/bots/BotManager";
import Leaderboard from "@/components/leaderboard/Leaderboard";

type View = "lobby" | "game" | "results" | "history" | "leaderboard";

export default function Home() {
  const { data: session, isPending } = useSession();
  const [currentView, setCurrentView] = useState<View>("lobby");
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [activeBotIds, setActiveBotIds] = useState<string[]>([]);

  // Если пользователь не авторизован, показываем экран входа
  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-white">Добро пожаловать в Duel Reaction</h1>
          <p className="text-gray-400">Пожалуйста, войдите, чтобы начать игру</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => signIn.social({ provider: "github", callbackURL: "/" })}
              className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Войти через GitHub
            </button>
            <button
              onClick={() => signIn.social({ provider: "google", callbackURL: "/" })}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Войти через Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  const createMatch = trpc.round.createMatch.useMutation();
  const joinMatch = trpc.round.joinMatch.useMutation();
  const matchDetails = trpc.round.getMatchDetails.useQuery(
    { matchId: activeMatchId! },
    { enabled: !!activeMatchId }
  );

  const handleCreateMatch = async () => {
    // Создаём матч с ботами для демо
    const participantIds = [
      session.user.id,
      `bot_1`,
      `bot_2`,
    ];
    
    await createMatch.mutateAsync({
      participantIds,
      totalRounds: 5,
    });
  };

  const handleJoinMatch = (matchId: string) => {
    setActiveMatchId(matchId);
    setCurrentView("game");
  };

  const handleMatchFinished = () => {
    setCurrentView("results");
  };

  const handleBotCreated = (botId: string, name: string) => {
    setActiveBotIds((prev) => [...prev, botId]);
    console.log(`🤖 Бот "${name}" создан с ID: ${botId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">⚡</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Duel Reaction</h1>
              <p className="text-xs text-gray-400">Тренажёр реакции</p>
            </div>
          </div>

          <nav className="flex gap-2">
            <button
              onClick={() => setCurrentView("lobby")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === "lobby"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              Лобби
            </button>
            <button
              onClick={() => setCurrentView("leaderboard")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === "leaderboard"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              🏆 Лидеры
            </button>
            <button
              onClick={() => setCurrentView("history")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === "history"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              История
            </button>
            
            {/* User Profile */}
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-700">
              <span className="text-sm text-gray-300">{session.user.name || session.user.email}</span>
              <button
                onClick={() => signOut()}
                className="px-3 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
              >
                Выйти
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Bot Manager Section */}
        <div className="max-w-4xl mx-auto">
          <BotManager onBotCreated={handleBotCreated} />
        </div>

        {currentView === "lobby" && (
          <Lobby
            onCreateMatch={handleCreateMatch}
            onJoinMatch={handleJoinMatch}
            isLoading={createMatch.isPending || joinMatch.isPending}
          />
        )}

        {currentView === "game" && activeMatchId && (
          <Game
            matchId={activeMatchId}
            userId={session.user.id}
            onMatchFinished={handleMatchFinished}
          />
        )}

        {currentView === "results" && activeMatchId && (
          <Results matchId={activeMatchId} onBack={() => setCurrentView("lobby")} />
        )}

        {currentView === "history" && (
          <History userId={session.user.id} />
        )}

        {currentView === "leaderboard" && (
          <Leaderboard userId={session.user.id} />
        )}
      </main>
    </div>
  );
}
