"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

interface BotManagerProps {
  onBotCreated?: (botId: string, name: string) => void;
}

export default function BotManager({ onBotCreated }: BotManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<"fast" | "average" | "slow" | "risky" | "perfect" | "custom">("average");
  const [botName, setBotName] = useState("");
  const [customReactionTime, setCustomReactionTime] = useState(300);
  const [customVariance, setCustomVariance] = useState(50);
  const [customFalseStartChance, setCustomFalseStartChance] = useState(0.05);

  const listBots = trpc.bot.listBots.useQuery();
  const createBot = trpc.bot.createBot.useMutation();
  const removeBot = trpc.bot.removeBot.useMutation();
  const clearAll = trpc.bot.clearAll.useMutation();
  const updateBot = trpc.bot.updateBot.useMutation();

  const handleCreate = async () => {
    const input: any = {
      type: selectedType,
      name: botName.trim() || undefined,
    };

    if (selectedType === "custom") {
      input.customConfig = {
        reactionTime: customReactionTime,
        variance: customVariance,
        falseStartChance: customFalseStartChance,
      };
    }

    const result = await createBot.mutateAsync(input);
    setBotName("");
    setShowForm(false);
    onBotCreated?.(result.botId, result.config.name);
  };

  const handleRemove = async (botId: string) => {
    await removeBot.mutateAsync({ botId });
  };

  const handleClearAll = async () => {
    await clearAll.mutateAsync();
  };

  const handleQuickUpdate = async (botId: string, field: "reactionTime" | "variance" | "falseStartChance", value: number) => {
    await updateBot.mutateAsync({ botId, updates: { [field]: value } });
  };

  const botTypeLabels: Record<string, { label: string; color: string; desc: string }> = {
    fast: { label: "⚡ Быстрый", color: "text-yellow-400", desc: "150-250мс" },
    average: { label: "🎯 Средний", color: "text-blue-400", desc: "250-350мс" },
    slow: { label: "🐢 Медленный", color: "text-gray-400", desc: "400-600мс" },
    risky: { label: "🎲 Рискованный", color: "text-red-400", desc: "Быстрый, но с фальстарты" },
    perfect: { label: "🏆 Идеальный", color: "text-green-400", desc: "150мс, 0% фальстартов" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="text-xl font-semibold text-white">Боты-эмуляторы</h3>
            <p className="text-gray-400 text-sm">
              {listBots.data?.count || 0} активных ботов
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {listBots.data?.count ? (
            <button
              onClick={handleClearAll}
              disabled={clearAll.isPending}
              className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors text-sm disabled:opacity-50"
            >
              {clearAll.isPending ? "Очистка..." : "Очистить всех"}
            </button>
          ) : null}
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            {showForm ? "Отмена" : "+ Добавить бота"}
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card space-y-4">
          <h4 className="text-lg font-medium text-white">Создать нового бота</h4>
          
          {/* Type Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Тип бота</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(botTypeLabels).map(([key, { label, color }]) => (
                <button
                  key={key}
                  onClick={() => setSelectedType(key as any)}
                  className={`p-2 rounded-lg border transition-colors text-left ${
                    selectedType === key
                      ? "border-blue-500 bg-blue-600/20"
                      : "border-gray-700 hover:border-gray-600"
                  }`}
                >
                  <p className={`text-sm font-medium ${color}`}>{label}</p>
                </button>
              ))}
              <button
                onClick={() => setSelectedType("custom")}
                className={`p-2 rounded-lg border transition-colors text-left ${
                  selectedType === "custom"
                    ? "border-blue-500 bg-blue-600/20"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <p className="text-sm font-medium text-purple-400">⚙️ Кастомный</p>
              </button>
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Имя бота (необязательно)</label>
            <input
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              placeholder="Например: my_bot"
              className="input w-full"
            />
          </div>

          {/* Custom Config */}
          {selectedType === "custom" && (
            <div className="space-y-3 p-4 bg-gray-800/50 rounded-lg">
              <h5 className="text-sm font-medium text-white">Параметры</h5>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Время реакции: {customReactionTime}мс
                </label>
                <input
                  type="range"
                  min={100}
                  max={2000}
                  step={10}
                  value={customReactionTime}
                  onChange={(e) => setCustomReactionTime(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Дисперсия: {customVariance}мс
                </label>
                <input
                  type="range"
                  min={0}
                  max={500}
                  step={10}
                  value={customVariance}
                  onChange={(e) => setCustomVariance(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Вероятность фальстарта: {Math.round(customFalseStartChance * 100)}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(customFalseStartChance * 100)}
                  onChange={(e) => setCustomFalseStartChance(Number(e.target.value) / 100)}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={createBot.isPending}
            className="btn-primary w-full"
          >
            {createBot.isPending ? "Создание..." : "Создать бота"}
          </button>
        </div>
      )}

      {/* Bot List */}
      {listBots.isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      ) : listBots.data?.bots.length === 0 ? (
        <div className="card text-center py-8">
          <span className="text-4xl mb-3 block">🤖</span>
          <p className="text-gray-400">
            Нет активных ботов. Добавьте первого!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {listBots.data?.bots.map((bot) => {
            const typeInfo = botTypeLabels[bot.config.name.split("_")[1]] || botTypeLabels.average;
            
            return (
              <div
                key={bot.id}
                className="card hover:border-blue-500/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🤖</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{bot.config.name}</p>
                      <p className="text-gray-400 text-sm">
                        Реакция: {bot.config.reactionTime}±{bot.config.variance}мс • 
                        Фальстарты: {Math.round(bot.config.falseStartChance * 100)}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Quick Controls */}
                    <div className="hidden md:flex items-center gap-2">
                      <button
                        onClick={() => handleQuickUpdate(bot.id, "reactionTime", Math.max(100, bot.config.reactionTime - 20))}
                        className="w-7 h-7 bg-gray-700 rounded hover:bg-gray-600 text-xs"
                        title="Уменьшить время реакции"
                      >
                        -
                      </button>
                      <button
                        onClick={() => handleQuickUpdate(bot.id, "reactionTime", Math.min(2000, bot.config.reactionTime + 20))}
                        className="w-7 h-7 bg-gray-700 rounded hover:bg-gray-600 text-xs"
                        title="Увеличить время реакции"
                      >
                        +
                      </button>
                    </div>

                    {/* Status Badge */}
                    {bot.state.isPlaying ? (
                      <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">
                        В игре
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-600/20 text-gray-400 rounded text-xs">
                        Ожидание
                      </span>
                    )}

                    {/* Remove Button */}
                    <button
                      onClick={() => handleRemove(bot.id)}
                      disabled={removeBot.isPending}
                      className="w-8 h-8 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors flex items-center justify-center disabled:opacity-50"
                      title="Удалить бота"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Stats */}
                {bot.state.totalRoundsPlayed > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-gray-400">Раундов</p>
                      <p className="text-sm font-medium text-white">{bot.state.totalRoundsPlayed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Фальстартов</p>
                      <p className="text-sm font-medium text-red-400">{bot.state.falseStartCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Событий</p>
                      <p className="text-sm font-medium text-blue-400">{bot.eventCount}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
