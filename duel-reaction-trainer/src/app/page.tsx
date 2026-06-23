"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Lobby from "@/components/lobby/Lobby";
import Game from "@/components/game/Game";
import Results from "@/components/results/Results";
import History from "@/components/history/History";
import BotManager from "@/components/bots/BotManager";
import Leaderboard from "@/components/leaderboard/Leaderboard";

type View = "lobby" | "game" | "results" | "history" | "leaderboard";

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("lobby");
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [currentUserId] = useState(() => `user_${Date.now()}`); // TODO: заменить на реальную авторизацию
  const [activeBotIds, setActiveBotIds] = useState<string[]>([]);

  const createMatch = trpc.round.createMatch.useMutation();
  const joinMatch = trpc.round.joinMatch.useMutation();
  const matchDetails = trpc.round.getMatchDetails.useQuery(
    { matchId: activeMatchId! },
    { enabled: !!activeMatchId }
  );

  const handleCreateMatch = async () => {
    // Создаём матч с ботами для демо
    const participantIds = [
      currentUserId,
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
            userId={currentUserId}
            onMatchFinished={handleMatchFinished}
          />
        )}

        {currentView === "results" && activeMatchId && (
          <Results matchId={activeMatchId} onBack={() => setCurrentView("lobby")} />
        )}

        {currentView === "history" && (
          <History userId={currentUserId} />
        )}

        {currentView === "leaderboard" && (
          <Leaderboard userId={currentUserId} />
        )}
      </main>
    </div>
  );
}
