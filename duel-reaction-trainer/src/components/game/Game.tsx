"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";

interface GameProps {
  matchId: string;
  userId: string;
  onMatchFinished: () => void;
}

export default function Game({ matchId, userId, onMatchFinished }: GameProps) {
  const [signalState, setSignalState] = useState<"ready" | "go" | "false-start">("ready");
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [canReact, setCanReact] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const matchDetails = trpc.round.getMatchDetails.useQuery(
    { matchId },
    { refetchInterval: 2000 }
  );

  const startRound = trpc.round.startRound.useMutation();
  const submitReaction = trpc.round.submitReaction.useMutation();

  const currentRound = matchDetails.data?.rounds?.find(
    (r: any) => r.status === "active"
  );

  const waitingRound = matchDetails.data?.rounds?.find(
    (r: any) => r.status === "waiting"
  );

  // Автоматический старт раунда
  useEffect(() => {
    if (waitingRound && !startRound.isPending) {
      startRound.mutate({ roundId: waitingRound.id });
    }
  }, [waitingRound, startRound]);

  // Обработка сигнала
  useEffect(() => {
    if (currentRound?.signalTime) {
      setSignalState("ready");
      setCanReact(false);
      setReactionTime(null);

      // Через случайное время (1-4 сек) даём сигнал
      const delay = 1000 + Math.random() * 3000;
      
      timeoutRef.current = setTimeout(() => {
        setSignalState("go");
        setCanReact(true);
        setStartTime(Date.now());
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentRound?.id]);

  // Обработка нажатия клавиши
  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    if (!canReact || !currentRound) return;
    if (e.code === "Space" || e.key === " ") {
      e.preventDefault();
      
      const reactionTimeMs = Date.now() - startTime;
      setReactionTime(reactionTimeMs);
      setCanReact(false);
      setSignalState("ready");

      try {
        await submitReaction.mutateAsync({
          roundId: currentRound.id,
          participantId: userId,
        });
      } catch (error: any) {
        console.error("Ошибка отправки реакции:", error);
        if (error.message?.includes("фальстарт") || error.message?.includes("False")) {
          setSignalState("false-start");
        }
      }
    }
  }, [canReact, currentRound, startTime, userId]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Проверка завершения матча
  useEffect(() => {
    if (matchDetails.data?.status === "finished") {
      onMatchFinished();
    }
  }, [matchDetails.data?.status, onMatchFinished]);

  const participants = matchDetails.data?.participants || [];
  const myParticipant = participants.find((p: any) => p.userId === userId);

  // Results are fetched separately via getRoundResult
  const [roundResults, setRoundResults] = useState<any[]>([]);
  
  useEffect(() => {
    if (currentRound) {
      // Прямой fetch запрос к API
      fetch(`/api/trpc/round.getRoundResult?input=${encodeURIComponent(JSON.stringify({ roundId: currentRound.id }))}`)
        .then((res) => res.json())
        .then((data) => {
          setRoundResults(data?.result?.data?.results || []);
        })
        .catch(() => setRoundResults([]));
    }
  }, [currentRound?.id]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Match Info */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              Матч #{matchId.slice(0, 8)}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Раунд {matchDetails.data?.currentRound || 1} из {matchDetails.data?.totalRounds || 5}
            </p>
          </div>
          <div className="flex gap-2">
            {participants.map((p: any, i: number) => (
              <div
                key={p.id}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  p.userId === userId
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300"
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {participants.map((p: any, i: number) => (
          <div key={p.id} className="card text-center">
            <p className="text-gray-400 text-sm mb-1">
              Игрок {i + 1} {p.userId === userId && "(Вы)"}
            </p>
            <p className="text-3xl font-bold text-white">{p.score}</p>
            <p className="text-xs text-gray-500 mt-1">
              Фальстартов: {p.falseStarts}
            </p>
          </div>
        ))}
      </div>

      {/* Signal Area */}
      <div className={`card min-h-[300px] flex flex-col items-center justify-center ${
        signalState === "go" ? "signal-go" :
        signalState === "false-start" ? "bg-red-600" :
        signalState === "ready" ? "signal-ready" :
        "signal-wait"
      }`}>
        {signalState === "ready" && !canReact && (
          <>
            <span className="text-6xl mb-4">🔵</span>
            <p className="text-2xl font-bold text-white">Ждите сигнал...</p>
            <p className="text-gray-200 mt-2">Не нажимайте раньше времени!</p>
          </>
        )}

        {signalState === "go" && canReact && (
          <>
            <span className="text-6xl mb-4">🟢</span>
            <p className="text-3xl font-bold text-white">НАЖМИТЕ!</p>
            <p className="text-gray-200 mt-2">Нажмите ПРОБЕЛ как можно быстрее</p>
          </>
        )}

        {signalState === "false-start" && (
          <>
            <span className="text-6xl mb-4">🔴</span>
            <p className="text-3xl font-bold text-white">ФАЛЬСТАРТ!</p>
            <p className="text-gray-200 mt-2">Нажали раньше времени. -1 балл</p>
          </>
        )}

        {reactionTime !== null && (
          <div className="mt-6 text-center">
            <p className="text-gray-200 text-lg">Ваше время реакции:</p>
            <p className="text-5xl font-bold text-white mt-2">{reactionTime} мс</p>
          </div>
        )}
      </div>

      {/* Round Results */}
      {roundResults.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">
            Результаты раунда
          </h3>
          <div className="space-y-2">
            {roundResults.map((result: any, i: number) => (
              <div
                key={result.participantId}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 font-mono">#{i + 1}</span>
                  <span className="text-white">
                    Игрок {result.participantId === userId ? "(Вы)" : result.participantId.slice(0, 8)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {result.isFalseStart ? (
                    <span className="badge badge-danger">Фальстарт</span>
                  ) : (
                    <span className="text-white font-mono">{result.reactionTime} мс</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="card bg-blue-900/20 border-blue-800">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className="text-white font-medium mb-1">Подсказка</h4>
            <p className="text-gray-400 text-sm">
              Когда экран станет зелёным — нажмите ПРОБЕЛ. 
              Лучшее время реакции: 150-250 мс. Среднее: 250-350 мс.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
