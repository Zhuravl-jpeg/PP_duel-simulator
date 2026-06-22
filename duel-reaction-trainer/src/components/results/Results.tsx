"use client";

import { trpc } from "@/lib/trpc";

interface ResultsProps {
  matchId: string;
  onBack: () => void;
}

export default function Results({ matchId, onBack }: ResultsProps) {
  const matchDetails = trpc.round.getMatchDetails.useQuery({ matchId });

  const sortedParticipants = matchDetails.data?.participants?.sort(
    (a: any, b: any) => b.score - a.score
  );

  const winner = sortedParticipants?.[0];
  const isDraw = sortedParticipants?.length && 
    sortedParticipants.length > 1 && 
    sortedParticipants[0].score === sortedParticipants[1].score;

  if (!matchDetails.data) {
    return (
      <div className="card text-center py-12">
        <div className="animate-pulse">
          <span className="text-4xl mb-4 block">⏳</span>
          <p className="text-gray-400">Загрузка результатов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Winner Announcement */}
      <div className="card text-center py-12 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-yellow-700">
        {isDraw ? (
          <>
            <span className="text-6xl mb-4 block">🤝</span>
            <h2 className="text-3xl font-bold text-white mb-2">Ничья!</h2>
            <p className="text-gray-400">
              Несколько игроков набрали одинаковое количество баллов
            </p>
          </>
        ) : (
          <>
            <span className="text-6xl mb-4 block">🏆</span>
            <h2 className="text-3xl font-bold text-white mb-2">Победитель!</h2>
            <p className="text-2xl font-semibold text-yellow-400">
              {winner?.userId === "user_0" ? "Вы" : `Игрок ${winner?.userId}`}
            </p>
            <p className="text-gray-400 mt-2">
              С результатом: <span className="text-white font-bold">{winner?.score} баллов</span>
            </p>
          </>
        )}
      </div>

      {/* Final Standings */}
      <div className="card">
        <h3 className="text-xl font-semibold text-white mb-6">
          Итоговые результаты
        </h3>
        
        <div className="space-y-3">
          {sortedParticipants?.map((participant: any, index: number) => {
            const isWinner = index === 0 && !isDraw;
            const isYou = participant.userId === "user_0";
            
            return (
              <div
                key={participant.id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  isWinner ? "bg-yellow-900/30 border border-yellow-700" :
                  isYou ? "bg-blue-900/30 border border-blue-700" :
                  "bg-gray-800"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    isWinner ? "bg-yellow-600 text-white" :
                    index === 1 ? "bg-gray-400 text-white" :
                    index === 2 ? "bg-orange-600 text-white" :
                    "bg-gray-700 text-gray-300"
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {isYou ? "Вы" : `Игрок ${participant.userId}`}
                      {isWinner && " 👑"}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Фальстартов: {participant.falseStarts} • 
                      Делеей: {participant.delaysApplied}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">{participant.score}</p>
                  <p className="text-gray-400 text-sm">баллов</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Round History */}
      <div className="card">
        <h3 className="text-xl font-semibold text-white mb-4">
          История раундов
        </h3>
        
        <div className="space-y-2">
          {matchDetails.data?.rounds?.map((round: any, index: number) => (
            <div
              key={round.id}
              className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-400 font-mono">#{index + 1}</span>
                <span className={`badge ${
                  round.status === "finished" ? "badge-success" :
                  round.status === "active" ? "badge-info" :
                  "badge-warning"
                }`}>
                  {round.status === "finished" ? "Завершён" :
                   round.status === "active" ? "Идёт" : "Ожидание"}
                </span>
              </div>
              {round.signalTime && (
                <p className="text-gray-400 text-sm">
                  {new Date(round.signalTime).toLocaleTimeString()}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        <button onClick={onBack} className="btn-primary">
          Вернуться в лобби
        </button>
        <button className="btn-secondary">
          Новая игра
        </button>
      </div>

      {/* Stats */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">
          Статистика матча
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-blue-400">
              {matchDetails.data?.rounds?.filter((r: any) => r.status === "finished").length || 0}
            </p>
            <p className="text-gray-400 text-sm mt-1">Раундов сыграно</p>
          </div>
          <div className="text-center p-4 bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-yellow-400">
              {matchDetails.data?.participants?.reduce((sum: number, p: any) => sum + p.falseStarts, 0) || 0}
            </p>
            <p className="text-gray-400 text-sm mt-1">Фальстартов</p>
          </div>
          <div className="text-center p-4 bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-green-400">
              {matchDetails.data?.participants?.length || 0}
            </p>
            <p className="text-gray-400 text-sm mt-1">Игроков</p>
          </div>
          <div className="text-center p-4 bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-purple-400">
              {matchDetails.data?.totalRounds}
            </p>
            <p className="text-gray-400 text-sm mt-1">Всего раундов</p>
          </div>
        </div>
      </div>
    </div>
  );
}
